-- =====================================================================
-- Smart Cash (سمارت كاش) — PostgreSQL schema (Phase 1 / MVP data model)
-- PostgreSQL 16+
-- Principles:
--   * Multi-tenant: every business row carries tenant_id, isolated by RLS.
--   * Money is NUMERIC(18,2) (exact). Balances are DERIVED from append-only
--     transaction tables, never stored as an editable field.
--   * Financial history is append-only: corrections are reversals.
--   * Audit log is hash-chained (tamper-evident).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS sk;
SET search_path = sk, public;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
CREATE TYPE role_code AS ENUM (
  'technician','supervisor','engineer','project_manager','branch_manager',
  'branch_accountant','procurement','finance','final_approver','employee','sysadmin'
);
CREATE TYPE scope_kind AS ENUM ('company','branch','project','team','self');
CREATE TYPE contact_kind AS ENUM ('customer','supplier','individual','entity');
CREATE TYPE ledger_direction AS ENUM ('gave','got');            -- أعطيت / أخذت
CREATE TYPE custody_type AS ENUM (
  'employee','technician','supervisor','engineer','project_manager',
  'branch','procurement','emergency','operations_maintenance','temporary'
);
CREATE TYPE custody_status AS ENUM (
  'requested','active','settling','settled','closed','rejected'
);
CREATE TYPE custody_txn_kind AS ENUM (
  'issue','top_up','expense','refund','adjustment','reversal'
);
CREATE TYPE approval_status AS ENUM (
  'draft','submitted','in_review','returned','approved','rejected','reversed','withdrawn'
);
CREATE TYPE auth_provider AS ENUM ('password','google');
CREATE TYPE invoice_event AS ENUM (
  'captured','read_qr','read_ai','manual','foldered','approved','returned','resubmitted',
  'rejected','withdrawn','posted','credit','exported'
);
CREATE TYPE payment_method AS ENUM ('cash','card','bank_transfer','wallet','other');
CREATE TYPE extraction_source AS ENUM ('zatca_qr','ocr_ai','manual');
-- Invoices the system accepts. Only tax invoices carry a reclaimable VAT.
CREATE TYPE invoice_kind AS ENUM (
  'tax_simplified',   -- فاتورة ضريبية مبسطة (B2C, QR)
  'tax_standard',     -- فاتورة ضريبية (B2B, buyer VAT shown)
  'regular',          -- فاتورة عادية / نقدية من مورد غير مسجل ضريبياً
  'purchase',         -- فاتورة مشتريات مرتبطة بأمر شراء
  'credit_note',      -- إشعار دائن (يُنقص المبلغ)
  'other'             -- إيصال أو مستند آخر يقبله المحاسب
);
CREATE TYPE ui_language AS ENUM ('ar','en','fr','ur','hi','bn','fil','ml','ne','id','fa','tr');
CREATE TYPE tenant_plan AS ENUM ('personal','business','enterprise');
CREATE TYPE user_status AS ENUM ('pending','active','locked','disabled');
CREATE TYPE erp_system AS ENUM ('sap','oracle','dynamics','odoo','zoho','quickbooks','qoyod','daftra');
CREATE TYPE flag_type AS ENUM (
  'duplicate_invoice_number','duplicate_image','near_duplicate_image',
  'duplicate_claim','total_mismatch','vat_mismatch','invalid_vat_number',
  'price_anomaly','possible_image_edit','over_authority_limit','low_ocr_confidence'
);
CREATE TYPE flag_severity AS ENUM ('info','warning','critical');
CREATE TYPE batch_status AS ENUM (
  'open','closed_full','closed_manual','in_review','returned','approved'
);
CREATE TYPE batch_close_reason AS ENUM (
  'reached_30','month_end','custody_settlement','exceptional_approval'
);
CREATE TYPE approval_action AS ENUM ('approve','reject','return','comment','escalate');
CREATE TYPE workflow_entity AS ENUM (
  'expense','custody_request','custody_top_up','custody_settlement','batch','purchase_order'
);

-- ---------------------------------------------------------------------
-- Tenancy & organisation
-- ---------------------------------------------------------------------
CREATE TABLE tenants (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  vat_number         text,
  base_currency      char(3) NOT NULL DEFAULT 'SAR',
  plan               tenant_plan NOT NULL DEFAULT 'enterprise',
  -- policies
  block_new_custody_if_unsettled boolean NOT NULL DEFAULT true,
  allow_custody_overdraft        boolean NOT NULL DEFAULT false,
  batch_max_invoices             int NOT NULL DEFAULT 30 CHECK (batch_max_invoices BETWEEN 1 AND 30),
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE branches (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id),
  name       text NOT NULL,
  code       text NOT NULL,
  region      text NOT NULL DEFAULT 'riyadh',        -- Saudi administrative region key
  governorate text NOT NULL DEFAULT 'riyadh',        -- governorate key (picked from the registered list)
  UNIQUE (tenant_id, code)
);

CREATE TABLE departments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id),
  name       text NOT NULL,
  parent_id  uuid REFERENCES departments(id)
);

CREATE TABLE projects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id),
  branch_id  uuid REFERENCES branches(id),
  name       text NOT NULL,
  code       text NOT NULL,
  budget     numeric(18,2) CHECK (budget IS NULL OR budget > 0),
  governorate text,
  pm_user_id uuid,                                   -- FK added after users
  is_active  boolean NOT NULL DEFAULT true,
  UNIQUE (tenant_id, code)
);

CREATE TABLE cost_centers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id),
  code       text NOT NULL,
  name       text NOT NULL,
  UNIQUE (tenant_id, code)
);

-- ---------------------------------------------------------------------
-- Users, roles, data scope
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id),
  username       text NOT NULL,
  employee_no    text,
  full_name      text NOT NULL,
  phone          text,
  email          text,
  password_hash  text NOT NULL,                 -- argon2id, produced by the API
  mfa_secret_enc bytea,                         -- encrypted at rest
  department_id  uuid REFERENCES departments(id),
  branch_id      uuid REFERENCES branches(id),
  manager_id     uuid REFERENCES users(id),     -- direct reporting line (supervisor → technician)
  language       ui_language NOT NULL DEFAULT 'ar',
  status         user_status NOT NULL DEFAULT 'active',
  must_change_password boolean NOT NULL DEFAULT true,   -- company-issued temporary password
  failed_logins  int NOT NULL DEFAULT 0 CHECK (failed_logins >= 0),
  password_changed_at timestamptz,
  theme          text NOT NULL DEFAULT 'system' CHECK (theme IN ('system','light','dark')),
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, username),
  UNIQUE (tenant_id, employee_no)
);

-- A user may hold several roles, each limited to a scope.
ALTER TABLE projects ADD CONSTRAINT projects_pm_fk FOREIGN KEY (pm_user_id) REFERENCES users(id);

-- People ask; the company decides. Accounts and passwords are controlled by administrators.
CREATE TABLE account_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  user_id     uuid NOT NULL REFERENCES users(id),      -- the pending user row
  wanted_role role_code,
  note        text,
  decided_by  uuid REFERENCES users(id),
  decided_at  timestamptz,
  decision    text CHECK (decision IN ('approved','rejected')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE password_reset_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  user_id     uuid NOT NULL REFERENCES users(id),
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done')),
  done_by     uuid REFERENCES users(id),
  done_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_open_reset_per_user ON password_reset_requests (user_id) WHERE status = 'open';

CREATE TABLE user_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  user_id     uuid NOT NULL REFERENCES users(id),
  role        role_code NOT NULL,
  scope       scope_kind NOT NULL,
  scope_id    uuid,                            -- branch/project id; NULL for company/self/team
  approval_limit numeric(18,2),                -- max amount this role may approve (NULL = unlimited)
  CHECK ((scope IN ('branch','project')) = (scope_id IS NOT NULL)),
  UNIQUE (user_id, role, scope, scope_id)
);

CREATE TABLE user_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  user_id      uuid NOT NULL REFERENCES users(id),
  device_id    text NOT NULL,
  device_name  text,
  via          auth_provider NOT NULL DEFAULT 'password',
  ip           inet,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at   timestamptz
);

-- External sign-in identities (Google). One Google account → one user.
CREATE TABLE user_identities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  user_id     uuid NOT NULL REFERENCES users(id),
  provider    auth_provider NOT NULL CHECK (provider <> 'password'),
  subject     text NOT NULL,                  -- Google "sub" claim (stable id)
  email       text NOT NULL,
  linked_by   uuid REFERENCES users(id),      -- self or an administrator
  linked_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, subject),
  UNIQUE (provider, email),
  UNIQUE (user_id, provider)
);

-- ---------------------------------------------------------------------
-- Module A — Smart ledger (Konnash-style)
-- ---------------------------------------------------------------------
CREATE TABLE contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  owner_user_id uuid REFERENCES users(id),      -- for personal ledgers
  kind          contact_kind NOT NULL,          -- customer <-> supplier convertible
  name          text NOT NULL,
  phone         text,
  vat_number    text,
  opening_balance numeric(18,2) NOT NULL DEFAULT 0,
  currency      char(3) NOT NULL DEFAULT 'SAR',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Append-only. Edit = reversal + new entry.
CREATE TABLE ledger_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  contact_id    uuid NOT NULL REFERENCES contacts(id),
  direction     ledger_direction NOT NULL,
  amount        numeric(18,2) NOT NULL CHECK (amount > 0),
  occurred_at   timestamptz NOT NULL,
  recorded_at   timestamptz NOT NULL DEFAULT now(),   -- server time, not user-editable
  note          text,
  document_id   uuid,
  reverses_id   uuid REFERENCES ledger_entries(id),
  created_by    uuid NOT NULL REFERENCES users(id),
  client_uuid   uuid NOT NULL,                        -- idempotency key for offline sync
  UNIQUE (tenant_id, client_uuid),
  UNIQUE (reverses_id)                                -- an entry can be reversed once
);

CREATE TABLE payment_reminders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  contact_id  uuid NOT NULL REFERENCES contacts(id),
  due_at      timestamptz NOT NULL,
  channel     text NOT NULL CHECK (channel IN ('whatsapp','sms','push')),
  repeat_rule text,                                   -- RFC5545 RRULE, optional
  sent_at     timestamptz,
  created_by  uuid NOT NULL REFERENCES users(id)
);

-- ---------------------------------------------------------------------
-- Documents (originals are immutable)
-- ---------------------------------------------------------------------
CREATE TABLE documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  storage_key   text NOT NULL,          -- object storage key (WORM bucket)
  mime_type     text NOT NULL,
  size_bytes    bigint NOT NULL,
  sha256        char(64) NOT NULL,      -- exact-duplicate detection
  phash         bit(64),                -- perceptual hash for near-duplicate images
  exif_json     jsonb,                  -- capture metadata (for edit detection)
  uploaded_by   uuid NOT NULL REFERENCES users(id),
  uploaded_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX documents_sha_idx ON documents (tenant_id, sha256);

-- ---------------------------------------------------------------------
-- Module B — Custody (العُهد)
-- ---------------------------------------------------------------------
CREATE SEQUENCE custody_no_seq;
CREATE TABLE custodies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  custody_no      text NOT NULL DEFAULT ('CU-' || lpad(nextval('custody_no_seq')::text, 6, '0')),
  type            custody_type NOT NULL,
  holder_user_id  uuid NOT NULL REFERENCES users(id),
  department_id   uuid REFERENCES departments(id),
  branch_id       uuid REFERENCES branches(id),
  project_id      uuid REFERENCES projects(id),
  requested_amount numeric(18,2) NOT NULL CHECK (requested_amount > 0),
  currency        char(3) NOT NULL DEFAULT 'SAR',
  status          custody_status NOT NULL DEFAULT 'requested',
  issued_at       timestamptz,
  settle_due_at   date,
  settled_at      timestamptz,
  created_by      uuid NOT NULL REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, custody_no)
);

-- Append-only money movements of a custody. Sign convention:
--   issue/top_up  : +amount (money given to holder)
--   expense       : -amount (approved spend)
--   refund        : -amount (unused cash returned to company)
--   adjustment/reversal : signed
CREATE TABLE custody_transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  custody_id   uuid NOT NULL REFERENCES custodies(id),
  kind         custody_txn_kind NOT NULL,
  amount       numeric(18,2) NOT NULL CHECK (amount <> 0),
  expense_id   uuid,
  reverses_id  uuid REFERENCES custody_transactions(id),
  note         text,
  created_by   uuid NOT NULL REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (kind IN ('issue','top_up') AND amount > 0) OR
    (kind IN ('expense','refund') AND amount < 0) OR
    (kind IN ('adjustment','reversal'))
  ),
  UNIQUE (reverses_id)
);

-- ---------------------------------------------------------------------
-- Module C — Expenses
-- ---------------------------------------------------------------------
CREATE TABLE expense_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id),
  code       text NOT NULL,
  name_ar    text NOT NULL,
  name_en    text NOT NULL,
  requires_procurement boolean NOT NULL DEFAULT false,
  UNIQUE (tenant_id, code)
);

CREATE TABLE suppliers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  name        text NOT NULL,
  vat_number  text,
  cr_number   text,
  contact_id  uuid REFERENCES contacts(id),   -- link to ledger account
  rating      numeric(3,2),
  governorate text,
  added_by    uuid,
  UNIQUE (tenant_id, vat_number)
);

CREATE SEQUENCE expense_no_seq;
CREATE TABLE expenses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id),
  expense_no     text NOT NULL DEFAULT ('EX-' || lpad(nextval('expense_no_seq')::text, 7, '0')),
  custody_id     uuid REFERENCES custodies(id),
  category_id    uuid NOT NULL REFERENCES expense_categories(id),
  project_id     uuid REFERENCES projects(id),
  branch_id      uuid REFERENCES branches(id),
  cost_center_id uuid REFERENCES cost_centers(id),
  supplier_id    uuid REFERENCES suppliers(id),
  beneficiary    text,
  amount         numeric(18,2) NOT NULL CHECK (amount > 0),   -- gross, incl. VAT
  vat_amount     numeric(18,2) NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
  currency       char(3) NOT NULL DEFAULT 'SAR',
  paid_at        timestamptz NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  description    text,
  status         approval_status NOT NULL DEFAULT 'draft',
  created_by     uuid NOT NULL REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  submitted_at   timestamptz,
  approved_at    timestamptz,
  client_uuid    uuid NOT NULL,
  UNIQUE (tenant_id, expense_no),
  UNIQUE (tenant_id, client_uuid),
  CHECK (vat_amount <= amount)
);
ALTER TABLE custody_transactions
  ADD CONSTRAINT custody_txn_expense_fk FOREIGN KEY (expense_id) REFERENCES expenses(id);

CREATE TABLE expense_attachments (
  expense_id  uuid NOT NULL REFERENCES expenses(id),
  document_id uuid NOT NULL REFERENCES documents(id),
  PRIMARY KEY (expense_id, document_id)
);

-- ---------------------------------------------------------------------
-- Module D — Invoices & AI extraction
-- ---------------------------------------------------------------------
CREATE TABLE invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  expense_id      uuid NOT NULL REFERENCES expenses(id),
  document_id     uuid NOT NULL REFERENCES documents(id),
  supplier_id     uuid REFERENCES suppliers(id),
  kind            invoice_kind NOT NULL DEFAULT 'regular',
  supplier_name   text,
  supplier_vat    text CHECK (supplier_vat IS NULL OR supplier_vat ~ '^3[0-9]{13}3$'),  -- Saudi VAT: 15 digits, starts & ends with 3
  invoice_number  text,
  issued_at       timestamptz,
  subtotal        numeric(18,2),
  discount        numeric(18,2) DEFAULT 0,
  vat_amount      numeric(18,2),
  total           numeric(18,2),
  payment_method_text text,
  source          extraction_source NOT NULL,
  ai_confidence   numeric(4,3) CHECK (ai_confidence BETWEEN 0 AND 1),
  raw_extraction  jsonb,                       -- full model output, kept for audit
  verified_by     uuid REFERENCES users(id),   -- human confirmation (AI is never final)
  verified_at     timestamptz,
  status          approval_status NOT NULL DEFAULT 'draft',
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- tax invoices must carry the supplier VAT number; non-tax invoices carry no reclaimable VAT
  CHECK (kind NOT IN ('tax_simplified','tax_standard') OR supplier_vat IS NOT NULL),
  CHECK (kind IN ('tax_simplified','tax_standard','purchase','credit_note') OR COALESCE(vat_amount,0) = 0)
);
-- Same supplier VAT + same invoice number must not be claimed twice (unless rejected).
CREATE UNIQUE INDEX invoices_no_dup_idx
  ON invoices (tenant_id, supplier_vat, invoice_number)
  WHERE status NOT IN ('rejected','reversed') AND supplier_vat IS NOT NULL AND invoice_number IS NOT NULL;

CREATE TABLE invoice_lines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid NOT NULL REFERENCES invoices(id),
  line_no     int NOT NULL,
  item_name   text NOT NULL,
  item_key    text,                -- normalised name for price comparison
  quantity    numeric(14,3) NOT NULL,
  unit        text,
  unit_price  numeric(18,4) NOT NULL,
  discount    numeric(18,2) DEFAULT 0,
  vat_rate    numeric(5,4) DEFAULT 0.15,
  line_total  numeric(18,2) NOT NULL,
  UNIQUE (invoice_id, line_no)
);

CREATE TABLE invoice_flags (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES tenants(id),
  invoice_id         uuid NOT NULL REFERENCES invoices(id),
  type               flag_type NOT NULL,
  severity           flag_severity NOT NULL,
  related_invoice_id uuid REFERENCES invoices(id),
  details            jsonb,
  resolved_by        uuid REFERENCES users(id),
  resolved_at        timestamptz,
  resolution_note    text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Module F — Invoice batches (الحافظات), max 30 invoices
-- ---------------------------------------------------------------------
CREATE SEQUENCE batch_no_seq;
CREATE TABLE batches (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id),
  batch_no       text NOT NULL DEFAULT ('BT-' || lpad(nextval('batch_no_seq')::text, 6, '0')),
  custody_id     uuid NOT NULL REFERENCES custodies(id),
  holder_user_id uuid NOT NULL REFERENCES users(id),
  project_id     uuid REFERENCES projects(id),
  status         batch_status NOT NULL DEFAULT 'open',
  close_reason   batch_close_reason,
  close_note     text,
  closed_by      uuid REFERENCES users(id),
  closed_at      timestamptz,
  merged_pdf_document_id uuid REFERENCES documents(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, batch_no),
  CHECK (status = 'open' OR close_reason IS NOT NULL),
  CHECK (close_reason IS NULL OR close_reason = 'reached_30' OR close_note IS NOT NULL)
);
-- one open batch per custody at a time
CREATE UNIQUE INDEX batches_one_open_idx ON batches (custody_id) WHERE status = 'open';

CREATE TABLE batch_items (
  batch_id    uuid NOT NULL REFERENCES batches(id),
  invoice_id  uuid NOT NULL REFERENCES invoices(id),
  position    int NOT NULL CHECK (position BETWEEN 1 AND 30),
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (batch_id, invoice_id),
  UNIQUE (batch_id, position),
  UNIQUE (invoice_id)                     -- an invoice lives in one batch only
);

CREATE TABLE batch_signatures (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id   uuid NOT NULL REFERENCES batches(id),
  user_id    uuid NOT NULL REFERENCES users(id),
  role       role_code NOT NULL,
  signed_at  timestamptz NOT NULL DEFAULT now(),
  signature_hash char(64) NOT NULL       -- sha256 of batch summary at signing time
);

-- ---------------------------------------------------------------------
-- Module E — Procurement (three-way matching), MVP-light
-- ---------------------------------------------------------------------
CREATE TABLE purchase_orders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  po_no       text NOT NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  project_id  uuid REFERENCES projects(id),
  status      approval_status NOT NULL DEFAULT 'draft',
  total       numeric(18,2) NOT NULL,
  created_by  uuid NOT NULL REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, po_no)
);
CREATE TABLE po_lines (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id     uuid NOT NULL REFERENCES purchase_orders(id),
  item_key  text NOT NULL,
  quantity  numeric(14,3) NOT NULL,
  unit_price numeric(18,4) NOT NULL
);
CREATE TABLE goods_receipts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  po_id       uuid NOT NULL REFERENCES purchase_orders(id),
  received_by uuid NOT NULL REFERENCES users(id),
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE gr_lines (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gr_id     uuid NOT NULL REFERENCES goods_receipts(id),
  po_line_id uuid NOT NULL REFERENCES po_lines(id),
  quantity  numeric(14,3) NOT NULL
);
ALTER TABLE invoices ADD COLUMN po_id uuid REFERENCES purchase_orders(id);

-- ---------------------------------------------------------------------
-- Module G — Configurable approval workflow
-- ---------------------------------------------------------------------
CREATE TABLE workflow_definitions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  entity       workflow_entity NOT NULL,
  name         text NOT NULL,
  min_amount   numeric(18,2) DEFAULT 0,
  max_amount   numeric(18,2),                  -- NULL = no upper bound
  category_id  uuid REFERENCES expense_categories(id),
  priority     int NOT NULL DEFAULT 100,       -- lower wins when several match
  is_active    boolean NOT NULL DEFAULT true
);

CREATE TABLE workflow_steps (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id      uuid NOT NULL REFERENCES workflow_definitions(id),
  step_no            int NOT NULL,
  role               role_code NOT NULL,
  -- which approver: holder's manager chain, same project, same branch, or company-wide
  resolve_by         text NOT NULL CHECK (resolve_by IN ('manager','project','branch','company')),
  is_conditional     boolean NOT NULL DEFAULT false,   -- e.g. procurement only if category requires it
  condition_expr     jsonb,
  allow_self_approve boolean NOT NULL DEFAULT false,   -- segregation of duties
  sla_hours          int DEFAULT 48,
  UNIQUE (definition_id, step_no)
);

CREATE TABLE approval_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id),
  entity         workflow_entity NOT NULL,
  entity_id      uuid NOT NULL,
  definition_id  uuid NOT NULL REFERENCES workflow_definitions(id),
  current_step   int NOT NULL DEFAULT 1,
  status         approval_status NOT NULL DEFAULT 'in_review',
  requested_by   uuid NOT NULL REFERENCES users(id),
  amount         numeric(18,2),
  created_at     timestamptz NOT NULL DEFAULT now(),
  closed_at      timestamptz,
  UNIQUE (entity, entity_id, created_at)
);

-- Append-only decision trail.
CREATE TABLE approval_actions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  request_id  uuid NOT NULL REFERENCES approval_requests(id),
  step_no     int NOT NULL,
  actor_id    uuid NOT NULL REFERENCES users(id),
  actor_role  role_code NOT NULL,
  action      approval_action NOT NULL,
  note        text,
  acted_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (action NOT IN ('reject','return') OR note IS NOT NULL)   -- reasons are mandatory
);

-- ---------------------------------------------------------------------
-- Audit log (hash-chained, append-only)
-- ---------------------------------------------------------------------
CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  actor_id    uuid REFERENCES users(id),
  action      text NOT NULL,
  entity      text NOT NULL,
  entity_id   uuid,
  before      jsonb,
  after       jsonb,
  ip          inet,
  at          timestamptz NOT NULL DEFAULT clock_timestamp(),
  prev_hash   char(64),
  hash        char(64) NOT NULL
);

-- ---------------------------------------------------------------------
-- Purchase returns / credit notes against an approved invoice
-- ---------------------------------------------------------------------
CREATE SEQUENCE credit_no_seq;
CREATE TABLE invoice_credits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  credit_no   text NOT NULL DEFAULT ('CN-' || lpad(nextval('credit_no_seq')::text, 6, '0')),
  invoice_id  uuid NOT NULL REFERENCES invoices(id),
  amount      numeric(18,2) NOT NULL CHECK (amount > 0),
  reason      text NOT NULL,
  document_id uuid REFERENCES documents(id),     -- supplier's credit note, if any
  created_by  uuid NOT NULL REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, credit_no)
);

-- Invoice lifecycle (append-only): one row per step the invoice went through
CREATE TABLE invoice_events (
  id          bigserial PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  invoice_id  uuid NOT NULL REFERENCES invoices(id),
  event       invoice_event NOT NULL,
  actor_id    uuid REFERENCES users(id),
  step_role   role_code,
  batch_id    uuid REFERENCES batches(id),
  position    int,
  note        text,
  at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invoice_events_inv_idx ON invoice_events (invoice_id, at);

-- Backups and exports (what was taken, by whom, where it went)
CREATE TABLE backup_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  kind        text NOT NULL CHECK (kind IN ('full','photos','excel','restore')),
  scope       text NOT NULL,                 -- 'company', 'branch:RUH', 'user:<id>' …
  object_key  text,                          -- where the archive is stored
  sha256      char(64),
  size_bytes  bigint,
  created_by  uuid REFERENCES users(id),     -- NULL = scheduled
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Collaboration: comments and notifications
-- ---------------------------------------------------------------------
CREATE TABLE comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  entity      text NOT NULL CHECK (entity IN ('invoice','purchase_request','advance','batch')),
  entity_id   uuid NOT NULL,
  author_id   uuid NOT NULL REFERENCES users(id),
  body        text NOT NULL CHECK (length(trim(body)) > 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE notifications (
  id          bigserial PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  user_id     uuid NOT NULL REFERENCES users(id),
  kind        text NOT NULL,                       -- n_rejected, n_returned, n_comment …
  ref_type    text, ref_id text,
  actor_id    uuid REFERENCES users(id),
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_unread ON notifications (user_id) WHERE read_at IS NULL;

-- ---------------------------------------------------------------------
-- Integrations: WhatsApp Business and ERP / accounting systems
-- ---------------------------------------------------------------------
CREATE TABLE outbound_messages (
  id          bigserial PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  channel     text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp','sms','email')),
  to_user_id  uuid REFERENCES users(id),
  to_phone    text NOT NULL CHECK (to_phone ~ '^\+?[0-9]{9,15}$'),
  template    text NOT NULL,                       -- Meta-approved template name
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  status      text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','read','failed')),
  provider_id text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE integration_connections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  system      erp_system NOT NULL,
  base_url    text NOT NULL CHECK (base_url ~ '^https://'),
  company_code text NOT NULL,
  secret_ref  text,                                -- pointer into the secrets vault, never the secret itself
  status      text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','error','disconnected')),
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz,
  UNIQUE (tenant_id, system)
);
CREATE TABLE gl_account_mappings (
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  mapping_key text NOT NULL,                       -- expense category, 'vat' or 'advance'
  account_code text NOT NULL CHECK (account_code ~ '^[0-9]{3,10}$'),
  PRIMARY KEY (tenant_id, mapping_key)
);
ALTER TABLE batches ADD COLUMN locked_at timestamptz;   -- set when exported to accounting
CREATE TABLE erp_sync_log (
  id          bigserial PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  system      erp_system NOT NULL,
  batch_id    uuid NOT NULL REFERENCES batches(id),
  lines       int NOT NULL CHECK (lines > 0),
  total       numeric(18,2) NOT NULL,
  external_ref text,
  status      text NOT NULL CHECK (status IN ('ok','failed')),
  at          timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Individuals: personal spending, budgets and personal custody
-- ---------------------------------------------------------------------
CREATE TABLE personal_expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  user_id     uuid NOT NULL REFERENCES users(id),
  category    text NOT NULL CHECK (category IN ('food','fuel','bills','transport','health','education','shopping','family','rent','other')),
  amount      numeric(18,2) NOT NULL CHECK (amount > 0),
  spent_at    timestamptz NOT NULL DEFAULT now(),
  note        text,
  client_uuid uuid NOT NULL,
  UNIQUE (tenant_id, client_uuid)
);
CREATE TABLE personal_budgets (
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  user_id     uuid NOT NULL REFERENCES users(id),
  category    text NOT NULL,
  monthly_limit numeric(18,2) NOT NULL CHECK (monthly_limit >= 0),
  PRIMARY KEY (user_id, category)
);
CREATE TABLE personal_custodies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  user_id     uuid NOT NULL REFERENCES users(id),
  direction   text NOT NULL CHECK (direction IN ('received','given')),
  party       text NOT NULL,
  party_phone text,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','settled')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE personal_custody_moves (
  id          bigserial PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  custody_id  uuid NOT NULL REFERENCES personal_custodies(id),
  kind        text NOT NULL CHECK (kind IN ('issue','topup','spend','return')),
  amount      numeric(18,2) NOT NULL CHECK (amount > 0),
  category    text,
  note        text,
  at          timestamptz NOT NULL DEFAULT now()
);
CREATE VIEW personal_custody_balances AS
SELECT c.id AS custody_id, c.tenant_id, c.user_id, c.direction, c.party, c.status,
  COALESCE(SUM(m.amount) FILTER (WHERE m.kind IN ('issue','topup')),0) AS total_in,
  COALESCE(SUM(m.amount) FILTER (WHERE m.kind = 'spend'),0)           AS spent,
  COALESCE(SUM(CASE WHEN m.kind IN ('issue','topup') THEN m.amount ELSE -m.amount END),0) AS balance
FROM personal_custodies c LEFT JOIN personal_custody_moves m ON m.custody_id = c.id GROUP BY c.id;

-- =====================================================================
-- VIEWS (derived balances)
-- =====================================================================
CREATE VIEW contact_balances AS
SELECT c.id AS contact_id, c.tenant_id, c.name, c.kind,
       c.opening_balance
       + COALESCE(SUM(CASE WHEN e.direction = 'gave' THEN e.amount ELSE -e.amount END), 0)
       AS balance   -- > 0 : they owe us ; < 0 : we owe them
FROM contacts c
LEFT JOIN ledger_entries e ON e.contact_id = c.id
GROUP BY c.id;

CREATE VIEW custody_balances AS
SELECT cu.id AS custody_id, cu.tenant_id, cu.custody_no, cu.holder_user_id, cu.status,
  COALESCE(SUM(t.amount) FILTER (WHERE t.kind IN ('issue','top_up')), 0)      AS total_issued,
  COALESCE(-SUM(t.amount) FILTER (WHERE t.kind = 'expense'), 0)               AS total_spent,
  COALESCE(-SUM(t.amount) FILTER (WHERE t.kind = 'refund'), 0)                AS total_refunded,
  COALESCE(SUM(t.amount), 0)                                                  AS balance,
  (SELECT COALESCE(SUM(x.amount),0) FROM expenses x
     WHERE x.custody_id = cu.id AND x.status IN ('submitted','in_review','returned')) AS under_review,
  (SELECT COALESCE(SUM(x.amount),0) FROM expenses x
     WHERE x.custody_id = cu.id AND x.status = 'rejected')                    AS rejected
FROM custodies cu
LEFT JOIN custody_transactions t ON t.custody_id = cu.id
GROUP BY cu.id;

CREATE VIEW batch_summaries AS
SELECT b.id AS batch_id, b.tenant_id, b.batch_no, b.status, b.custody_id,
  COUNT(i.id)                                                        AS invoice_count,
  COALESCE(SUM(i.total),0)                                           AS total_amount,
  COALESCE(SUM(i.vat_amount),0)                                      AS total_vat,
  COALESCE(SUM(i.total) FILTER (WHERE i.status = 'approved'),0)      AS approved_amount,
  COALESCE(SUM(i.total) FILTER (WHERE i.status = 'rejected'),0)      AS rejected_amount,
  COALESCE(SUM(i.total) FILTER (WHERE i.status IN ('submitted','in_review','returned','draft')),0) AS pending_amount,
  MIN(i.issued_at) AS period_from, MAX(i.issued_at) AS period_to
FROM batches b
LEFT JOIN batch_items bi ON bi.batch_id = b.id
LEFT JOIN invoices i ON i.id = bi.invoice_id
GROUP BY b.id;

-- =====================================================================
-- INTEGRITY TRIGGERS
-- =====================================================================

-- 1) Append-only tables: no UPDATE / DELETE, ever.
CREATE FUNCTION forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'SK001: % is append-only; use a reversal instead', TG_TABLE_NAME;
END $$;

CREATE TRIGGER ledger_entries_append_only BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER custody_txn_append_only BEFORE UPDATE OR DELETE ON custody_transactions
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER approval_actions_append_only BEFORE UPDATE OR DELETE ON approval_actions
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER audit_log_append_only BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER documents_append_only BEFORE UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER batch_signatures_append_only BEFORE UPDATE OR DELETE ON batch_signatures
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- 2) Approved/rejected expenses & invoices are frozen; only transition to 'reversed'.
CREATE FUNCTION freeze_decided() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'SK002: cannot delete % in status %', TG_TABLE_NAME, OLD.status;
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status IN ('approved','rejected','reversed','withdrawn') THEN
    IF OLD.status = 'approved' AND NEW.status = 'reversed'
       AND (to_jsonb(NEW) - 'status') = (to_jsonb(OLD) - 'status') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'SK003: % % is % and frozen', TG_TABLE_NAME, OLD.id, OLD.status;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER expenses_freeze BEFORE UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION freeze_decided();
CREATE TRIGGER invoices_freeze BEFORE UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION freeze_decided();

-- 3) Custody: no new custody while holder has an unsettled one (tenant policy).
CREATE FUNCTION check_unsettled_custody() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE blocked boolean;
BEGIN
  SELECT block_new_custody_if_unsettled INTO blocked FROM tenants WHERE id = NEW.tenant_id;
  IF blocked AND EXISTS (
       SELECT 1 FROM custodies c
       WHERE c.holder_user_id = NEW.holder_user_id
         AND c.tenant_id = NEW.tenant_id
         AND c.id <> NEW.id
         AND c.status IN ('requested','active','settling')) THEN
    RAISE EXCEPTION 'SK004: holder % has an unsettled custody', NEW.holder_user_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER custodies_unsettled BEFORE INSERT ON custodies
  FOR EACH ROW EXECUTE FUNCTION check_unsettled_custody();

-- 4) Custody balance may not go negative unless tenant allows overdraft.
CREATE FUNCTION check_custody_balance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE bal numeric; overdraft boolean; st custody_status;
BEGIN
  SELECT status INTO st FROM custodies WHERE id = NEW.custody_id FOR UPDATE;
  IF st IN ('closed','rejected') THEN
    RAISE EXCEPTION 'SK005: custody is %', st;
  END IF;
  SELECT allow_custody_overdraft INTO overdraft FROM tenants WHERE id = NEW.tenant_id;
  SELECT COALESCE(SUM(amount),0) + NEW.amount INTO bal
    FROM custody_transactions WHERE custody_id = NEW.custody_id;
  IF bal < 0 AND NOT overdraft THEN
    RAISE EXCEPTION 'SK006: custody balance would become % (overdraft not allowed)', bal;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER custody_txn_balance BEFORE INSERT ON custody_transactions
  FOR EACH ROW EXECUTE FUNCTION check_custody_balance();

-- 5) Batch: max N (≤30) invoices; auto-close on reaching N; closed batches reject additions.
CREATE FUNCTION batch_add_item() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE b batches%ROWTYPE; cnt int; maxn int;
BEGIN
  SELECT * INTO b FROM batches WHERE id = NEW.batch_id FOR UPDATE;
  IF b.status <> 'open' THEN
    RAISE EXCEPTION 'SK007: batch % is % and accepts no invoices', b.batch_no, b.status;
  END IF;
  SELECT batch_max_invoices INTO maxn FROM tenants WHERE id = b.tenant_id;
  SELECT COUNT(*) INTO cnt FROM batch_items WHERE batch_id = NEW.batch_id;
  IF cnt >= maxn THEN
    RAISE EXCEPTION 'SK008: batch % already holds % invoices', b.batch_no, cnt;
  END IF;
  NEW.position := cnt + 1;
  RETURN NEW;
END $$;
CREATE TRIGGER batch_items_add BEFORE INSERT ON batch_items
  FOR EACH ROW EXECUTE FUNCTION batch_add_item();

CREATE FUNCTION batch_autoclose() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cnt int; maxn int;
BEGIN
  SELECT t.batch_max_invoices INTO maxn
    FROM batches b JOIN tenants t ON t.id = b.tenant_id WHERE b.id = NEW.batch_id;
  SELECT COUNT(*) INTO cnt FROM batch_items WHERE batch_id = NEW.batch_id;
  IF cnt = maxn THEN
    UPDATE batches SET status = 'closed_full', close_reason = 'reached_30',
                       closed_at = now()
     WHERE id = NEW.batch_id;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER batch_items_autoclose AFTER INSERT ON batch_items
  FOR EACH ROW EXECUTE FUNCTION batch_autoclose();

CREATE FUNCTION batch_items_frozen() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE st batch_status;
BEGIN
  SELECT status INTO st FROM batches WHERE id = OLD.batch_id;
  IF st <> 'open' THEN
    RAISE EXCEPTION 'SK009: cannot remove invoices from a % batch', st;
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER batch_items_no_remove BEFORE DELETE OR UPDATE ON batch_items
  FOR EACH ROW EXECUTE FUNCTION batch_items_frozen();

-- 6) Segregation of duties: requester cannot approve own request unless step allows it.
CREATE FUNCTION check_sod() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r approval_requests%ROWTYPE; self_ok boolean;
BEGIN
  SELECT * INTO r FROM approval_requests WHERE id = NEW.request_id;
  IF NEW.action IN ('approve','reject') AND NEW.actor_id = r.requested_by THEN
    SELECT allow_self_approve INTO self_ok FROM workflow_steps
      WHERE definition_id = r.definition_id AND step_no = NEW.step_no;
    IF NOT COALESCE(self_ok, false) THEN
      RAISE EXCEPTION 'SK010: segregation of duties — requester cannot decide own request';
    END IF;
  END IF;
  IF NEW.step_no <> r.current_step AND NEW.action <> 'comment' THEN
    RAISE EXCEPTION 'SK011: action on step % but request is at step %', NEW.step_no, r.current_step;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER approval_actions_sod BEFORE INSERT ON approval_actions
  FOR EACH ROW EXECUTE FUNCTION check_sod();

-- 6b) Purchase returns: only on approved invoices, never above the invoice total;
--     each one gives the money back to the advance.
CREATE FUNCTION check_credit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE inv invoices%ROWTYPE; done numeric;
BEGIN
  SELECT * INTO inv FROM invoices WHERE id = NEW.invoice_id FOR UPDATE;
  IF inv.status <> 'approved' THEN
    RAISE EXCEPTION 'SK012: purchase return needs an approved invoice (status %)', inv.status;
  END IF;
  SELECT COALESCE(SUM(amount),0) INTO done FROM invoice_credits WHERE invoice_id = NEW.invoice_id;
  IF done + NEW.amount > inv.total THEN
    RAISE EXCEPTION 'SK013: returns % exceed invoice total %', done + NEW.amount, inv.total;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER invoice_credits_check BEFORE INSERT ON invoice_credits
  FOR EACH ROW EXECUTE FUNCTION check_credit();

CREATE FUNCTION credit_to_custody() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cu uuid; ex uuid;
BEGIN
  SELECT e.custody_id, e.id INTO cu, ex FROM invoices i JOIN expenses e ON e.id = i.expense_id WHERE i.id = NEW.invoice_id;
  IF cu IS NOT NULL THEN
    INSERT INTO custody_transactions (tenant_id, custody_id, kind, amount, expense_id, note, created_by)
    VALUES (NEW.tenant_id, cu, 'adjustment', NEW.amount, ex, NEW.credit_no, NEW.created_by);
  END IF;
  INSERT INTO invoice_events (tenant_id, invoice_id, event, actor_id, note)
  VALUES (NEW.tenant_id, NEW.invoice_id, 'credit', NEW.created_by, NEW.credit_no || ' ' || NEW.amount);
  RETURN NULL;
END $$;
CREATE TRIGGER invoice_credits_post AFTER INSERT ON invoice_credits
  FOR EACH ROW EXECUTE FUNCTION credit_to_custody();

CREATE TRIGGER invoice_credits_append_only BEFORE UPDATE OR DELETE ON invoice_credits
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER invoice_events_append_only BEFORE UPDATE OR DELETE ON invoice_events
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER backup_runs_append_only BEFORE UPDATE OR DELETE ON backup_runs
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- 6c) Sign-in lockout: the 5th consecutive failure locks the account; only an admin reset unlocks it.
CREATE FUNCTION record_login_failure(p_user uuid) RETURNS user_status LANGUAGE plpgsql AS $$
DECLARE st user_status;
BEGIN
  UPDATE users SET failed_logins = failed_logins + 1,
                   status = CASE WHEN failed_logins + 1 >= 5 AND status = 'active' THEN 'locked'::user_status ELSE status END
   WHERE id = p_user RETURNING status INTO st;
  RETURN st;
END $$;
CREATE FUNCTION admin_reset_password(p_user uuid, p_hash text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE users SET password_hash = p_hash, must_change_password = true, failed_logins = 0,
                   status = CASE WHEN status = 'locked' THEN 'active'::user_status ELSE status END
   WHERE id = p_user;
  UPDATE password_reset_requests SET status = 'done', done_at = now(),
         done_by = NULLIF(current_setting('app.user_id', true), '')::uuid
   WHERE user_id = p_user AND status = 'open';
END $$;

-- 6d) A folder exported to accounting is locked: no more purchase returns on its invoices.
CREATE FUNCTION lock_on_sync() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'ok' THEN UPDATE batches SET locked_at = COALESCE(locked_at, NEW.at) WHERE id = NEW.batch_id; END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER erp_sync_locks AFTER INSERT ON erp_sync_log FOR EACH ROW EXECUTE FUNCTION lock_on_sync();
CREATE FUNCTION credit_not_locked() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM batch_items bi JOIN batches b ON b.id = bi.batch_id
             WHERE bi.invoice_id = NEW.invoice_id AND b.locked_at IS NOT NULL) THEN
    RAISE EXCEPTION 'SK014: invoice is in a folder already exported to accounting';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER invoice_credits_locked BEFORE INSERT ON invoice_credits FOR EACH ROW EXECUTE FUNCTION credit_not_locked();

-- 6e) Personal custody: spending and returns cannot exceed what is left.
CREATE FUNCTION personal_custody_check() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE bal numeric; st text;
BEGIN
  SELECT status INTO st FROM personal_custodies WHERE id = NEW.custody_id FOR UPDATE;
  IF st = 'settled' THEN RAISE EXCEPTION 'SK016: custody is settled'; END IF;
  IF NEW.kind IN ('spend','return') THEN
    SELECT COALESCE(SUM(CASE WHEN kind IN ('issue','topup') THEN amount ELSE -amount END),0) INTO bal
      FROM personal_custody_moves WHERE custody_id = NEW.custody_id;
    IF NEW.amount > bal THEN RAISE EXCEPTION 'SK015: % is more than the % left in this custody', NEW.amount, bal; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER personal_custody_moves_check BEFORE INSERT ON personal_custody_moves FOR EACH ROW EXECUTE FUNCTION personal_custody_check();

CREATE TRIGGER comments_append_only BEFORE UPDATE OR DELETE ON comments FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER erp_sync_append_only BEFORE UPDATE OR DELETE ON erp_sync_log FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER personal_moves_append_only BEFORE UPDATE OR DELETE ON personal_custody_moves FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- 7) Hash-chained audit log.
CREATE FUNCTION audit_chain() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prev char(64);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('audit:' || NEW.tenant_id::text));
  SELECT hash INTO prev FROM audit_log WHERE tenant_id = NEW.tenant_id ORDER BY id DESC LIMIT 1;
  NEW.prev_hash := prev;
  NEW.hash := encode(digest(
      COALESCE(prev,'') || NEW.tenant_id::text || COALESCE(NEW.actor_id::text,'') ||
      NEW.action || NEW.entity || COALESCE(NEW.entity_id::text,'') ||
      COALESCE(NEW.before::text,'') || COALESCE(NEW.after::text,'') || NEW.at::text,
      'sha256'), 'hex');
  RETURN NEW;
END $$;
CREATE TRIGGER audit_log_chain BEFORE INSERT ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_chain();

-- Generic row auditing for key tables.
CREATE FUNCTION audit_row() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO audit_log (tenant_id, actor_id, action, entity, entity_id, before, after)
  VALUES (COALESCE(NEW.tenant_id, OLD.tenant_id),
          NULLIF(current_setting('app.user_id', true), '')::uuid,
          TG_OP, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id),
          CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
          CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END);
  RETURN NULL;
END $$;
CREATE TRIGGER audit_expenses  AFTER INSERT OR UPDATE OR DELETE ON expenses  FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER audit_invoices  AFTER INSERT OR UPDATE OR DELETE ON invoices  FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER audit_custodies AFTER INSERT OR UPDATE OR DELETE ON custodies FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER audit_batches   AFTER INSERT OR UPDATE OR DELETE ON batches   FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON user_roles FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER audit_identities AFTER INSERT OR UPDATE OR DELETE ON user_identities FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER audit_credits    AFTER INSERT ON invoice_credits FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER audit_users      AFTER UPDATE OF status, password_hash, failed_logins ON users FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER audit_integrations AFTER INSERT OR UPDATE OR DELETE ON integration_connections FOR EACH ROW EXECUTE FUNCTION audit_row();

-- Verifies the audit chain; returns first broken id or NULL.
CREATE FUNCTION verify_audit_chain(p_tenant uuid) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE r audit_log%ROWTYPE; prev char(64) := NULL; h char(64);
BEGIN
  FOR r IN SELECT * FROM audit_log WHERE tenant_id = p_tenant ORDER BY id LOOP
    h := encode(digest(
      COALESCE(prev,'') || r.tenant_id::text || COALESCE(r.actor_id::text,'') ||
      r.action || r.entity || COALESCE(r.entity_id::text,'') ||
      COALESCE(r.before::text,'') || COALESCE(r.after::text,'') || r.at::text, 'sha256'), 'hex');
    IF h <> r.hash OR r.prev_hash IS DISTINCT FROM prev THEN RETURN r.id; END IF;
    prev := r.hash;
  END LOOP;
  RETURN NULL;
END $$;

-- =====================================================================
-- v0.6 — PAYMENT LINKS, SAVINGS, ORGANISATION POLICY
-- Smart Cash never holds money: card payments go customer → gateway → the
-- tenant's bank; transfers go straight to the tenant's IBAN. We record them.
-- =====================================================================
CREATE TYPE payment_link_status AS ENUM ('pending','paid','cancelled');   -- "expired" is derived from expires_at
CREATE TYPE pay_link_method AS ENUM ('both','link','bank');

-- Saudi IBAN: SA + 22 digits, ISO 13616 mod-97 check.
CREATE FUNCTION iban_valid(p text) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE s text; r text := ''; m int := 0; ch text;
BEGIN
  s := upper(regexp_replace(COALESCE(p,''), '\s', '', 'g'));
  IF s !~ '^SA[0-9]{22}$' THEN RETURN false; END IF;
  s := substr(s,5) || substr(s,1,4);
  FOR i IN 1..length(s) LOOP
    ch := substr(s,i,1);
    r := r || CASE WHEN ch ~ '[A-Z]' THEN (ascii(ch)-55)::text ELSE ch END;
  END LOOP;
  FOR i IN 1..length(r) LOOP m := (m*10 + substr(r,i,1)::int) % 97; END LOOP;
  RETURN m = 1;
END $$;

CREATE TABLE payment_settings (
  tenant_id     uuid PRIMARY KEY REFERENCES tenants(id),
  beneficiary   text NOT NULL,
  bank_code     text,
  iban          text CHECK (iban IS NULL OR iban_valid(iban)),
  stc_pay_phone text,
  gateway       text CHECK (gateway IN ('moyasar','hyperpay','tap','paytabs','geidea')),
  merchant_id   text,
  secret_ref    text,                       -- pointer into the secrets vault, never the key
  updated_by    uuid REFERENCES users(id),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (gateway IS NULL OR merchant_id IS NOT NULL)
);

CREATE TABLE payment_links (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id),
  link_no        text NOT NULL,             -- PL-000001, shown to the payer as the transfer reference
  kind           text NOT NULL DEFAULT 'contact' CHECK (kind IN ('contact','invoice','custody')),
  contact_id     uuid REFERENCES contacts(id),
  invoice_id     uuid REFERENCES invoices(id),            -- re-billing a purchase to a client
  personal_custody_id uuid REFERENCES personal_custodies(id),
  payer_name     text NOT NULL,
  payer_phone    text,
  amount         numeric(18,2) NOT NULL CHECK (amount > 0 AND amount <= 1000000),
  description    text,
  method         pay_link_method NOT NULL,
  gateway        text,
  gateway_ref    text,                      -- the gateway's payment id, set by its webhook
  status         payment_link_status NOT NULL DEFAULT 'pending',
  created_by     uuid NOT NULL REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  paid_at        timestamptz,
  paid_via       text CHECK (paid_via IN ('mada','visa','applepay','stcpay','bank','cash','manual')),
  ledger_entry_id uuid REFERENCES ledger_entries(id),
  UNIQUE (tenant_id, link_no),
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '30 days'),
  CHECK ((status = 'paid') = (paid_at IS NOT NULL)),
  CHECK (kind <> 'invoice' OR invoice_id IS NOT NULL),
  CHECK (kind <> 'custody' OR personal_custody_id IS NOT NULL)
);
CREATE UNIQUE INDEX one_open_rebill_per_invoice ON payment_links (invoice_id) WHERE invoice_id IS NOT NULL AND status <> 'cancelled';
CREATE INDEX payment_links_open ON payment_links (tenant_id, expires_at) WHERE status = 'pending';

-- SK017 link needs a gateway · SK018 bank transfer needs a valid IBAN · SK019 only open, unexpired links change
CREATE FUNCTION payment_link_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ps payment_settings; eid uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO ps FROM payment_settings WHERE tenant_id = NEW.tenant_id;
    IF NEW.method IN ('link','both') AND (ps.gateway IS NULL) THEN
      RAISE EXCEPTION 'SK017: connect a payment gateway before sending card payment links'; END IF;
    IF NEW.method IN ('bank','both') AND (ps.iban IS NULL) THEN
      RAISE EXCEPTION 'SK018: add a valid IBAN before asking for bank transfers'; END IF;
    NEW.gateway := CASE WHEN NEW.method = 'bank' THEN NULL ELSE ps.gateway END;
    RETURN NEW;
  END IF;
  IF OLD.status <> 'pending' THEN RAISE EXCEPTION 'SK019: link % is already %', OLD.link_no, OLD.status; END IF;
  IF NEW.amount <> OLD.amount OR NEW.method <> OLD.method OR NEW.contact_id IS DISTINCT FROM OLD.contact_id THEN
    RAISE EXCEPTION 'SK019: a sent link cannot be changed; cancel it and send a new one'; END IF;
  IF NEW.status = 'paid' THEN
    IF now() > OLD.expires_at THEN RAISE EXCEPTION 'SK019: link % expired on %', OLD.link_no, OLD.expires_at; END IF;
    IF NEW.contact_id IS NOT NULL THEN
      INSERT INTO ledger_entries (tenant_id, contact_id, direction, amount, occurred_at, note, created_by, client_uuid)
      VALUES (NEW.tenant_id, NEW.contact_id, 'got', NEW.amount, NEW.paid_at, NEW.link_no, NEW.created_by, gen_random_uuid())
      RETURNING id INTO eid;
      NEW.ledger_entry_id := eid;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER payment_links_guard BEFORE INSERT OR UPDATE ON payment_links FOR EACH ROW EXECUTE FUNCTION payment_link_guard();
CREATE TRIGGER audit_payment_links AFTER INSERT OR UPDATE ON payment_links FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER payment_links_no_delete BEFORE DELETE ON payment_links FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TABLE savings_goals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  user_id     uuid NOT NULL REFERENCES users(id),
  name        text NOT NULL,
  target      numeric(18,2) NOT NULL CHECK (target > 0),
  deadline    date,
  icon        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE TABLE savings_moves (
  id        bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  goal_id   uuid NOT NULL REFERENCES savings_goals(id),
  kind      text NOT NULL CHECK (kind IN ('in','out')),
  amount    numeric(18,2) NOT NULL CHECK (amount > 0),
  at        timestamptz NOT NULL DEFAULT now()
);
-- SK020 you can't take out more than is saved
CREATE FUNCTION savings_check() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE bal numeric;
BEGIN
  IF NEW.kind = 'out' THEN
    SELECT COALESCE(SUM(CASE WHEN kind = 'in' THEN amount ELSE -amount END),0) INTO bal FROM savings_moves WHERE goal_id = NEW.goal_id;
    IF NEW.amount > bal THEN RAISE EXCEPTION 'SK020: % is more than the % saved in this goal', NEW.amount, bal; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER savings_moves_check BEFORE INSERT ON savings_moves FOR EACH ROW EXECUTE FUNCTION savings_check();
CREATE TRIGGER savings_moves_append_only BEFORE UPDATE OR DELETE ON savings_moves FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE VIEW savings_balances AS
SELECT g.id AS goal_id, g.tenant_id, g.user_id, g.name, g.target, g.deadline,
  COALESCE(SUM(CASE WHEN m.kind = 'in' THEN m.amount ELSE -m.amount END),0) AS saved,
  GREATEST(g.target - COALESCE(SUM(CASE WHEN m.kind = 'in' THEN m.amount ELSE -m.amount END),0), 0) AS remaining
FROM savings_goals g LEFT JOIN savings_moves m ON m.goal_id = g.id GROUP BY g.id;

-- Each organisation sets its own approval limits (finance/admin in companies, the owner in establishments).
CREATE TABLE org_policies (
  tenant_id          uuid PRIMARY KEY REFERENCES tenants(id),
  id                 uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,   -- for the audit trail
  fast_limit         numeric(18,2) NOT NULL DEFAULT 500,
  standard_limit     numeric(18,2) NOT NULL DEFAULT 5000,
  auto_approve_limit numeric(18,2) NOT NULL DEFAULT 0 CHECK (auto_approve_limit BETWEEN 0 AND 5000),
  updated_by         uuid REFERENCES users(id),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (fast_limit > 0 AND standard_limit > fast_limit)
);
CREATE TRIGGER audit_org_policies AFTER INSERT OR UPDATE ON org_policies FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE FUNCTION approval_band(p_tenant uuid, p_amount numeric) RETURNS text LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN p_amount <= COALESCE(p.fast_limit, 500) THEN 'fast'
              WHEN p_amount <= COALESCE(p.standard_limit, 5000) THEN 'standard' ELSE 'full' END
  FROM (SELECT 1) one LEFT JOIN org_policies p ON p.tenant_id = p_tenant
$$;

-- =====================================================================
-- ROW-LEVEL SECURITY — tenant isolation
-- The API connects as role sk_app and runs `SET app.tenant_id = '<uuid>'`
-- per request/transaction. Project/branch data-scope is enforced in the API
-- layer (see USER_ROLES_PERMISSIONS.md) and covered by permission tests.
-- =====================================================================
DO $$
DECLARE t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sk_app') THEN
    CREATE ROLE sk_app NOLOGIN;
  END IF;
  FOREACH t IN ARRAY ARRAY[
    'branches','departments','projects','cost_centers','users','user_roles','user_sessions',
    'contacts','ledger_entries','payment_reminders','documents','custodies','custody_transactions',
    'expense_categories','suppliers','expenses','invoices','invoice_flags','batches',
    'purchase_orders','goods_receipts','workflow_definitions','approval_requests',
    'approval_actions','audit_log','user_identities','invoice_credits','invoice_events','backup_runs',
    'account_requests','password_reset_requests','comments','notifications','outbound_messages','integration_connections',
    'gl_account_mappings','erp_sync_log','personal_expenses','personal_budgets','personal_custodies','personal_custody_moves',
    'payment_settings','payment_links','savings_goals','savings_moves','org_policies']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY tenant_isolation ON %I
                      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
                      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid)$p$, t);
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA sk TO sk_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA sk TO sk_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA sk TO sk_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA sk TO sk_app;
-- Views run with invoker rights so RLS applies through them.
ALTER VIEW contact_balances SET (security_invoker = on);
ALTER VIEW custody_balances SET (security_invoker = on);
ALTER VIEW batch_summaries  SET (security_invoker = on);
ALTER VIEW personal_custody_balances SET (security_invoker = on);
ALTER VIEW savings_balances SET (security_invoker = on);
-- Audit log: app can insert & read, never modify (triggers enforce too).
REVOKE UPDATE, DELETE ON audit_log FROM sk_app;
REVOKE UPDATE, DELETE ON invoice_credits, invoice_events, backup_runs, comments, erp_sync_log, personal_custody_moves, savings_moves FROM sk_app;
REVOKE DELETE ON payment_links FROM sk_app;
