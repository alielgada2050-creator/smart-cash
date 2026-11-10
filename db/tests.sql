-- =====================================================================
-- Smart Cash — data-model integrity tests
-- Run: psql -v ON_ERROR_STOP=1 -f schema.sql -f tests.sql
-- Each test prints PASS or raises.
-- =====================================================================
SET search_path = sk, public;

CREATE OR REPLACE FUNCTION pg_temp.expect_error(p_sql text, p_code text, p_name text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    IF position(p_code IN SQLERRM) > 0 THEN
      RAISE NOTICE 'PASS  %', p_name; RETURN;
    END IF;
    RAISE EXCEPTION 'FAIL  % — wrong error: %', p_name, SQLERRM;
  END;
  RAISE EXCEPTION 'FAIL  % — statement succeeded but should have failed', p_name;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.ok(p_cond boolean, p_name text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_cond THEN RAISE NOTICE 'PASS  %', p_name;
  ELSE RAISE EXCEPTION 'FAIL  %', p_name; END IF;
END $$;

-- ---------------------------------------------------------------------
-- Fixtures (as owner): two tenants
-- ---------------------------------------------------------------------
INSERT INTO tenants (id, name) VALUES
 ('11111111-1111-1111-1111-111111111111','شركة ألف'),
 ('22222222-2222-2222-2222-222222222222','شركة باء');

INSERT INTO projects (id, tenant_id, name, code) VALUES
 ('a0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','مشروع الرياض','P1');

INSERT INTO users (id, tenant_id, username, full_name, password_hash) VALUES
 ('b0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','tech1','فني 1','x'),
 ('b0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','sup1','مراقب 1','x'),
 ('b0000000-0000-0000-0000-000000000009','22222222-2222-2222-2222-222222222222','other','مستخدم ب','x');

INSERT INTO expense_categories (id, tenant_id, code, name_ar, name_en) VALUES
 ('c0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','FUEL','وقود وزيوت','Fuel');

-- ---------------------------------------------------------------------
-- From here on, act as the application role inside tenant A
-- ---------------------------------------------------------------------
SET ROLE sk_app;
SET app.tenant_id = '11111111-1111-1111-1111-111111111111';
SET app.user_id   = 'b0000000-0000-0000-0000-000000000002';

-- T1 tenant isolation
SELECT pg_temp.ok((SELECT count(*) FROM users) = 2, 'T01 RLS: tenant A sees only its own 2 users');
SELECT pg_temp.expect_error(
  $$INSERT INTO contacts (tenant_id, kind, name) VALUES ('22222222-2222-2222-2222-222222222222','customer','x')$$,
  'row-level security', 'T02 RLS: cannot write into another tenant');

-- T3 ledger is append-only, balance derived
INSERT INTO contacts (id, tenant_id, kind, name) VALUES
 ('d0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','customer','أبو محمد');
INSERT INTO ledger_entries (id, tenant_id, contact_id, direction, amount, occurred_at, created_by, client_uuid) VALUES
 ('e0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','d0000000-0000-0000-0000-000000000001','gave',500,now(),'b0000000-0000-0000-0000-000000000002',gen_random_uuid()),
 (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','d0000000-0000-0000-0000-000000000001','got',200,now(),'b0000000-0000-0000-0000-000000000002',gen_random_uuid());
SELECT pg_temp.ok((SELECT balance FROM contact_balances WHERE contact_id='d0000000-0000-0000-0000-000000000001') = 300,
  'T03 ledger: balance derived = 500 − 200 = 300');
SELECT pg_temp.expect_error(
  $$UPDATE ledger_entries SET amount = 1 WHERE id='e0000000-0000-0000-0000-000000000001'$$,
  'SK001', 'T04 ledger: entries cannot be edited');
SELECT pg_temp.expect_error(
  $$DELETE FROM ledger_entries WHERE id='e0000000-0000-0000-0000-000000000001'$$,
  'SK001', 'T05 ledger: entries cannot be deleted');

-- T6 offline sync idempotency
DO $$ DECLARE k uuid := gen_random_uuid(); BEGIN
  INSERT INTO ledger_entries (tenant_id, contact_id, direction, amount, occurred_at, created_by, client_uuid)
  VALUES ('11111111-1111-1111-1111-111111111111','d0000000-0000-0000-0000-000000000001','got',10,now(),'b0000000-0000-0000-0000-000000000002',k);
  BEGIN
    INSERT INTO ledger_entries (tenant_id, contact_id, direction, amount, occurred_at, created_by, client_uuid)
    VALUES ('11111111-1111-1111-1111-111111111111','d0000000-0000-0000-0000-000000000001','got',10,now(),'b0000000-0000-0000-0000-000000000002',k);
    RAISE EXCEPTION 'FAIL  T06';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'PASS  T06 sync: same client_uuid cannot be recorded twice';
  END;
END $$;

-- T7 custody lifecycle
INSERT INTO custodies (id, tenant_id, type, holder_user_id, project_id, requested_amount, status, created_by) VALUES
 ('f0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','technician',
  'b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001',1000,'active','b0000000-0000-0000-0000-000000000002');
INSERT INTO custody_transactions (tenant_id, custody_id, kind, amount, created_by) VALUES
 ('11111111-1111-1111-1111-111111111111','f0000000-0000-0000-0000-000000000001','issue',1000,'b0000000-0000-0000-0000-000000000002');
SELECT pg_temp.expect_error(
  $$INSERT INTO custodies (tenant_id, type, holder_user_id, requested_amount, created_by)
    VALUES ('11111111-1111-1111-1111-111111111111','temporary','b0000000-0000-0000-0000-000000000001',50,'b0000000-0000-0000-0000-000000000002')$$,
  'SK004', 'T07 custody: no second custody while one is unsettled');
SELECT pg_temp.expect_error(
  $$INSERT INTO custody_transactions (tenant_id, custody_id, kind, amount, created_by)
    VALUES ('11111111-1111-1111-1111-111111111111','f0000000-0000-0000-0000-000000000001','expense',-1500,'b0000000-0000-0000-0000-000000000002')$$,
  'SK006', 'T08 custody: spend cannot exceed balance (no overdraft)');
SELECT pg_temp.expect_error(
  $$INSERT INTO custody_transactions (tenant_id, custody_id, kind, amount, created_by)
    VALUES ('11111111-1111-1111-1111-111111111111','f0000000-0000-0000-0000-000000000001','expense',100,'b0000000-0000-0000-0000-000000000002')$$,
  'custody_transactions_check', 'T09 custody: expense must carry a negative sign');

-- T10 expense + invoice + freezing
INSERT INTO expenses (id, tenant_id, custody_id, category_id, project_id, amount, vat_amount, paid_at, status, created_by, client_uuid) VALUES
 ('90000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','f0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001',115,15,now(),'submitted',
  'b0000000-0000-0000-0000-000000000001',gen_random_uuid());
INSERT INTO documents (id, tenant_id, storage_key, mime_type, size_bytes, sha256, uploaded_by) VALUES
 ('80000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','k/1.jpg','image/jpeg',1000,repeat('a',64),'b0000000-0000-0000-0000-000000000001');
INSERT INTO invoices (id, tenant_id, expense_id, document_id, kind, supplier_vat, invoice_number, total, vat_amount, source, status) VALUES
 ('70000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','90000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000001','tax_simplified','300000000000003','INV-1',115,15,'zatca_qr','submitted');
SELECT pg_temp.expect_error(
  $$INSERT INTO invoices (tenant_id, expense_id, document_id, supplier_vat, invoice_number, total, source)
    VALUES ('11111111-1111-1111-1111-111111111111','90000000-0000-0000-0000-000000000001',
            '80000000-0000-0000-0000-000000000001','300000000000003','INV-1',115,'manual')$$,
  'invoices_no_dup_idx', 'T10 invoice: same supplier VAT + invoice number rejected as duplicate');

UPDATE expenses SET status='approved', approved_at=now() WHERE id='90000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect_error(
  $$UPDATE expenses SET amount = 1 WHERE id='90000000-0000-0000-0000-000000000001'$$,
  'SK003', 'T11 expense: approved expense amount cannot change');
SELECT pg_temp.expect_error(
  $$DELETE FROM expenses WHERE id='90000000-0000-0000-0000-000000000001'$$,
  'SK002', 'T12 expense: approved expense cannot be deleted');
UPDATE expenses SET status='reversed' WHERE id='90000000-0000-0000-0000-000000000001';
SELECT pg_temp.ok((SELECT status FROM expenses WHERE id='90000000-0000-0000-0000-000000000001')='reversed',
  'T13 expense: approved → reversed is the only allowed change');

-- T14 batches: max 30, auto-close, closed batch is frozen
INSERT INTO batches (id, tenant_id, custody_id, holder_user_id) VALUES
 ('60000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','f0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001');
DO $$
DECLARE i int; inv uuid; exp uuid;
BEGIN
  FOR i IN 1..31 LOOP
    exp := gen_random_uuid(); inv := gen_random_uuid();
    INSERT INTO expenses (id, tenant_id, custody_id, category_id, amount, paid_at, created_by, client_uuid)
      VALUES (exp,'11111111-1111-1111-1111-111111111111','f0000000-0000-0000-0000-000000000001',
              'c0000000-0000-0000-0000-000000000001',10,now(),'b0000000-0000-0000-0000-000000000001',gen_random_uuid());
    INSERT INTO invoices (id, tenant_id, expense_id, document_id, kind, supplier_vat, invoice_number, total, vat_amount, source)
      VALUES (inv,'11111111-1111-1111-1111-111111111111',exp,'80000000-0000-0000-0000-000000000001','tax_simplified','300000000000003','B-'||i,10,1.30,'manual');
    IF i <= 30 THEN
      INSERT INTO batch_items (batch_id, invoice_id, position) VALUES ('60000000-0000-0000-0000-000000000001', inv, 1);
    ELSE
      BEGIN
        INSERT INTO batch_items (batch_id, invoice_id, position) VALUES ('60000000-0000-0000-0000-000000000001', inv, 1);
        RAISE EXCEPTION 'FAIL  T15';
      EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'SK007%' THEN RAISE NOTICE 'PASS  T15 batch: 31st invoice refused (batch closed)';
        ELSE RAISE; END IF;
      END;
    END IF;
  END LOOP;
END $$;
SELECT pg_temp.ok(
  (SELECT status='closed_full' AND close_reason='reached_30' FROM batches WHERE id='60000000-0000-0000-0000-000000000001'),
  'T14 batch: auto-closed at exactly 30 invoices');
SELECT pg_temp.ok(
  (SELECT invoice_count=30 AND total_amount=300 AND total_vat=39 FROM batch_summaries WHERE batch_id='60000000-0000-0000-0000-000000000001'),
  'T16 batch: summary = 30 invoices, 300.00 total, 39.00 VAT');
SELECT pg_temp.expect_error(
  $$DELETE FROM batch_items WHERE batch_id='60000000-0000-0000-0000-000000000001'$$,
  'SK009', 'T17 batch: invoices cannot be removed from a closed batch');
SELECT pg_temp.expect_error(
  $$INSERT INTO batches (tenant_id, custody_id, holder_user_id, status, close_reason)
    VALUES ('11111111-1111-1111-1111-111111111111','f0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','closed_manual','month_end')$$,
  'batches_check', 'T18 batch: manual early close requires a documented reason');

-- T19 segregation of duties
INSERT INTO workflow_definitions (id, tenant_id, entity, name) VALUES
 ('50000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','expense','Default expense');
INSERT INTO workflow_steps (definition_id, step_no, role, resolve_by) VALUES
 ('50000000-0000-0000-0000-000000000001',1,'supervisor','manager'),
 ('50000000-0000-0000-0000-000000000001',2,'engineer','project');
INSERT INTO approval_requests (id, tenant_id, entity, entity_id, definition_id, requested_by, amount) VALUES
 ('40000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','expense',
  gen_random_uuid(),'50000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002',115);
SELECT pg_temp.expect_error(
  $$INSERT INTO approval_actions (tenant_id, request_id, step_no, actor_id, actor_role, action)
    VALUES ('11111111-1111-1111-1111-111111111111','40000000-0000-0000-0000-000000000001',1,
            'b0000000-0000-0000-0000-000000000002','supervisor','approve')$$,
  'SK010', 'T19 workflow: requester cannot approve own request');
SELECT pg_temp.expect_error(
  $$INSERT INTO approval_actions (tenant_id, request_id, step_no, actor_id, actor_role, action)
    VALUES ('11111111-1111-1111-1111-111111111111','40000000-0000-0000-0000-000000000001',1,
            'b0000000-0000-0000-0000-000000000001','supervisor','reject')$$,
  'approval_actions_check', 'T20 workflow: rejection without a reason is refused');
SELECT pg_temp.expect_error(
  $$INSERT INTO approval_actions (tenant_id, request_id, step_no, actor_id, actor_role, action)
    VALUES ('11111111-1111-1111-1111-111111111111','40000000-0000-0000-0000-000000000001',2,
            'b0000000-0000-0000-0000-000000000001','engineer','approve')$$,
  'SK011', 'T21 workflow: cannot skip ahead to step 2');


-- T27–T30 invoice kinds and folder-at-payment
SELECT pg_temp.expect_error(
  $$INSERT INTO invoices (tenant_id, expense_id, document_id, kind, supplier_vat, invoice_number, total, vat_amount, source)
    VALUES ('11111111-1111-1111-1111-111111111111','90000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000001',
            'tax_simplified','123456789','X-1',115,15,'manual')$$,
  'invoices_supplier_vat_check', 'T27 invoice: malformed Saudi VAT number refused');
SELECT pg_temp.expect_error(
  $$INSERT INTO invoices (tenant_id, expense_id, document_id, kind, invoice_number, total, vat_amount, source)
    VALUES ('11111111-1111-1111-1111-111111111111','90000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000001',
            'tax_standard','X-2',115,15,'manual')$$,
  'invoices_check', 'T28 invoice: tax invoice without supplier VAT number refused');
SELECT pg_temp.expect_error(
  $$INSERT INTO invoices (tenant_id, expense_id, document_id, kind, invoice_number, total, vat_amount, source)
    VALUES ('11111111-1111-1111-1111-111111111111','90000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000001',
            'regular','X-3',205,26.74,'ocr_ai')$$,
  'invoices_check', 'T29 invoice: regular (non-tax) invoice cannot claim VAT');

-- Folder at payment: invoice joins the open folder on submission; a later rejection stays visible in the summary.
INSERT INTO batches (id, tenant_id, custody_id, holder_user_id) VALUES
 ('60000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','f0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001');
INSERT INTO expenses (id, tenant_id, custody_id, category_id, amount, paid_at, status, created_by, client_uuid) VALUES
 ('90000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','f0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',205,now(),'submitted','b0000000-0000-0000-0000-000000000001',gen_random_uuid());
INSERT INTO invoices (id, tenant_id, expense_id, document_id, kind, invoice_number, total, vat_amount, source, status) VALUES
 ('70000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','90000000-0000-0000-0000-000000000002',
  '80000000-0000-0000-0000-000000000001','regular','4471',205,0,'ocr_ai','submitted');
INSERT INTO batch_items (batch_id, invoice_id, position) VALUES ('60000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000002',1);
UPDATE invoices SET status='rejected' WHERE id='70000000-0000-0000-0000-000000000002';
SELECT pg_temp.ok(
  (SELECT invoice_count=1 AND rejected_amount=205 AND approved_amount=0 FROM batch_summaries WHERE batch_id='60000000-0000-0000-0000-000000000002'),
  'T30 folder: invoice added at payment; its later rejection shows as 205.00 rejected');

-- T31–T36 Google identities, purchase returns, withdrawal
INSERT INTO user_identities (tenant_id, user_id, provider, subject, email, linked_by) VALUES
 ('11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000001','google','g-1001','tech1.demo@gmail.com','b0000000-0000-0000-0000-000000000001');
SELECT pg_temp.expect_error(
  $$INSERT INTO user_identities (tenant_id, user_id, provider, subject, email) VALUES
    ('11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000002','google','g-2002','tech1.demo@gmail.com')$$,
  'user_identities_provider_email_key', 'T31 identity: one Gmail cannot be linked to two users');

-- an approved invoice with its spend posted to the advance
INSERT INTO expenses (id, tenant_id, custody_id, category_id, amount, vat_amount, paid_at, status, created_by, client_uuid) VALUES
 ('90000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','f0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',230,30,now(),'approved','b0000000-0000-0000-0000-000000000001',gen_random_uuid());
INSERT INTO invoices (id, tenant_id, expense_id, document_id, kind, supplier_vat, invoice_number, total, vat_amount, source, status) VALUES
 ('70000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','90000000-0000-0000-0000-000000000003',
  '80000000-0000-0000-0000-000000000001','tax_simplified','300000000000003','RET-1',230,30,'zatca_qr','approved');
INSERT INTO custody_transactions (tenant_id, custody_id, kind, amount, expense_id, created_by) VALUES
 ('11111111-1111-1111-1111-111111111111','f0000000-0000-0000-0000-000000000001','expense',-230,'90000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000002');
DO $$ DECLARE before numeric; after numeric; BEGIN
  SELECT balance INTO before FROM custody_balances WHERE custody_id='f0000000-0000-0000-0000-000000000001';
  INSERT INTO invoice_credits (tenant_id, invoice_id, amount, reason, created_by) VALUES
   ('11111111-1111-1111-1111-111111111111','70000000-0000-0000-0000-000000000003',85,'Defective item returned','b0000000-0000-0000-0000-000000000002');
  SELECT balance INTO after FROM custody_balances WHERE custody_id='f0000000-0000-0000-0000-000000000001';
  IF after - before = 85 THEN RAISE NOTICE 'PASS  T32 return: 85.00 credit goes back to the advance balance';
  ELSE RAISE EXCEPTION 'FAIL  T32 (% → %)', before, after; END IF;
END $$;
SELECT pg_temp.ok((SELECT count(*)=1 FROM invoice_events WHERE invoice_id='70000000-0000-0000-0000-000000000003' AND event='credit'),
  'T33 lifecycle: the return is recorded as an invoice event');
SELECT pg_temp.expect_error(
  $$INSERT INTO invoice_credits (tenant_id, invoice_id, amount, reason, created_by) VALUES
    ('11111111-1111-1111-1111-111111111111','70000000-0000-0000-0000-000000000003',150,'too much','b0000000-0000-0000-0000-000000000002')$$,
  'SK013', 'T34 return: total returns cannot exceed the invoice (85 + 150 > 230)');
SELECT pg_temp.expect_error(
  $$INSERT INTO invoice_credits (tenant_id, invoice_id, amount, reason, created_by) VALUES
    ('11111111-1111-1111-1111-111111111111','70000000-0000-0000-0000-000000000002',10,'x','b0000000-0000-0000-0000-000000000002')$$,
  'SK012', 'T35 return: not allowed on a rejected invoice');
-- withdrawal: submitted invoice → withdrawn, then frozen
INSERT INTO expenses (id, tenant_id, custody_id, category_id, amount, paid_at, status, created_by, client_uuid) VALUES
 ('90000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','f0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',40,now(),'submitted','b0000000-0000-0000-0000-000000000001',gen_random_uuid());
INSERT INTO invoices (id, tenant_id, expense_id, document_id, kind, invoice_number, total, vat_amount, source, status) VALUES
 ('70000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','90000000-0000-0000-0000-000000000004',
  '80000000-0000-0000-0000-000000000001','regular','W-1',40,0,'manual','submitted');
UPDATE invoices SET status='withdrawn' WHERE id='70000000-0000-0000-0000-000000000004';
SELECT pg_temp.expect_error(
  $$UPDATE invoices SET status='submitted' WHERE id='70000000-0000-0000-0000-000000000004'$$,
  'SK003', 'T36 withdraw: a withdrawn invoice cannot be revived');

-- T37–T44 accounts, integrations, personal custody
INSERT INTO users (id, tenant_id, username, full_name, password_hash, status, must_change_password) VALUES
 ('b0000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','eng5','مهندس','x','active',false);
DO $$ DECLARE st user_status; BEGIN
  FOR i IN 1..4 LOOP st := record_login_failure('b0000000-0000-0000-0000-000000000005'); END LOOP;
  IF st <> 'active' THEN RAISE EXCEPTION 'FAIL  T37 locked too early'; END IF;
  st := record_login_failure('b0000000-0000-0000-0000-000000000005');
  IF st = 'locked' THEN RAISE NOTICE 'PASS  T37 accounts: 5th failed sign-in locks the account'; ELSE RAISE EXCEPTION 'FAIL  T37 (%)', st; END IF;
END $$;
INSERT INTO password_reset_requests (tenant_id, user_id) VALUES ('11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000005');
SELECT pg_temp.expect_error(
  $$INSERT INTO password_reset_requests (tenant_id, user_id) VALUES ('11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000005')$$,
  'one_open_reset_per_user', 'T38 accounts: only one open reset request per user');
SELECT admin_reset_password('b0000000-0000-0000-0000-000000000005','newhash');
SELECT pg_temp.ok((SELECT status='active' AND must_change_password AND failed_logins=0 FROM users WHERE id='b0000000-0000-0000-0000-000000000005')
  AND (SELECT status='done' FROM password_reset_requests WHERE user_id='b0000000-0000-0000-0000-000000000005'),
  'T39 accounts: admin reset unlocks, forces a password change and closes the request');

INSERT INTO integration_connections (tenant_id, system, base_url, company_code) VALUES ('11111111-1111-1111-1111-111111111111','sap','https://erp.example.com','1000');
SELECT pg_temp.expect_error(
  $$INSERT INTO integration_connections (tenant_id, system, base_url, company_code) VALUES ('11111111-1111-1111-1111-111111111111','sap','https://other.example.com','2000')$$,
  'integration_connections_tenant_id_system_key', 'T40 ERP: one connection per system per company');
SELECT pg_temp.expect_error(
  $$INSERT INTO gl_account_mappings VALUES ('11111111-1111-1111-1111-111111111111','fuel','51A1')$$,
  'gl_account_mappings_account_code_check', 'T41 ERP: account codes must be 3–10 digits');

-- invoice 70..03 (approved, 85 returned) sits in a folder; exporting it locks returns
UPDATE batches SET status='closed_manual', close_reason='month_end', close_note='t' WHERE id='60000000-0000-0000-0000-000000000002';
INSERT INTO batches (id, tenant_id, custody_id, holder_user_id) VALUES
 ('60000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','f0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001');
INSERT INTO batch_items (batch_id, invoice_id, position) VALUES ('60000000-0000-0000-0000-000000000003','70000000-0000-0000-0000-000000000003',1);
INSERT INTO erp_sync_log (tenant_id, system, batch_id, lines, total, external_ref, status) VALUES
 ('11111111-1111-1111-1111-111111111111','sap','60000000-0000-0000-0000-000000000003',3,145,'SAP-DOC-1','ok');
SELECT pg_temp.ok((SELECT locked_at IS NOT NULL FROM batches WHERE id='60000000-0000-0000-0000-000000000003'), 'T42 ERP: a successful send locks the folder');
SELECT pg_temp.expect_error(
  $$INSERT INTO invoice_credits (tenant_id, invoice_id, amount, reason, created_by) VALUES
    ('11111111-1111-1111-1111-111111111111','70000000-0000-0000-0000-000000000003',10,'late','b0000000-0000-0000-0000-000000000002')$$,
  'SK014', 'T43 ERP: no purchase returns after the folder was exported');

INSERT INTO personal_custodies (id, tenant_id, user_id, direction, party) VALUES
 ('d1000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000001','given','Driver');
INSERT INTO personal_custody_moves (tenant_id, custody_id, kind, amount) VALUES
 ('11111111-1111-1111-1111-111111111111','d1000000-0000-0000-0000-000000000001','issue',500),
 ('11111111-1111-1111-1111-111111111111','d1000000-0000-0000-0000-000000000001','spend',320);
SELECT pg_temp.expect_error(
  $$INSERT INTO personal_custody_moves (tenant_id, custody_id, kind, amount) VALUES ('11111111-1111-1111-1111-111111111111','d1000000-0000-0000-0000-000000000001','spend',200)$$,
  'SK015', 'T44 personal: spending cannot exceed what is left in a custody (200 > 180)');
SELECT pg_temp.ok((SELECT balance=180 AND spent=320 FROM personal_custody_balances WHERE custody_id='d1000000-0000-0000-0000-000000000001'),
  'T45 personal: custody balance = 500 − 320 = 180');

-- ===== v0.6: payment links, savings, policy =====
SELECT pg_temp.ok(iban_valid('SA96 8000 0000 6080 1012 3456') AND NOT iban_valid('SA9680000000608010123457') AND NOT iban_valid('GB82WEST12345698765432'),
  'T46 payments: IBAN check accepts a valid Saudi IBAN and rejects a wrong check digit or another country');
SELECT pg_temp.expect_error(
  $$INSERT INTO payment_settings (tenant_id, beneficiary, iban) VALUES ('11111111-1111-1111-1111-111111111111','Co','SA9680000000608010123457')$$,
  'payment_settings_iban_check', 'T47 payments: an invalid IBAN cannot be saved');
INSERT INTO payment_settings (tenant_id, beneficiary, bank_code, iban) VALUES ('11111111-1111-1111-1111-111111111111','Co','rajhi','SA9680000000608010123456');
INSERT INTO contacts (id, tenant_id, kind, name, phone) VALUES
 ('d0000000-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','customer','Client','+966500000009');
INSERT INTO ledger_entries (tenant_id, contact_id, direction, amount, occurred_at, created_by, client_uuid) VALUES
 ('11111111-1111-1111-1111-111111111111','d0000000-0000-0000-0000-000000000009','gave',1200,now(),'b0000000-0000-0000-0000-000000000002',gen_random_uuid());
SELECT pg_temp.expect_error(
  $$INSERT INTO payment_links (tenant_id, link_no, contact_id, payer_name, amount, method, created_by, expires_at) VALUES
    ('11111111-1111-1111-1111-111111111111','PL-000001','d0000000-0000-0000-0000-000000000009','Client',1200,'link','b0000000-0000-0000-0000-000000000002',now()+interval '7 days')$$,
  'SK017', 'T48 payments: a card link needs a connected gateway');
INSERT INTO payment_links (id, tenant_id, link_no, contact_id, payer_name, amount, method, created_by, expires_at) VALUES
 ('a6000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','PL-000001','d0000000-0000-0000-0000-000000000009','Client',1200,'bank','b0000000-0000-0000-0000-000000000002',now()+interval '7 days');
INSERT INTO payment_links (id, tenant_id, link_no, contact_id, payer_name, amount, method, created_by, created_at, expires_at) VALUES
 ('a6000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','PL-000002','d0000000-0000-0000-0000-000000000009','Client',50,'bank','b0000000-0000-0000-0000-000000000002',now()-interval '10 days',now()-interval '3 days');
SELECT pg_temp.expect_error(
  $$UPDATE payment_links SET status='paid', paid_at=now(), paid_via='bank' WHERE id='a6000000-0000-0000-0000-000000000002'$$,
  'SK019', 'T49 payments: an expired link cannot be marked paid');
UPDATE payment_links SET status='paid', paid_at=now(), paid_via='bank' WHERE id='a6000000-0000-0000-0000-000000000001';
SELECT pg_temp.ok((SELECT balance FROM contact_balances WHERE contact_id='d0000000-0000-0000-0000-000000000009') = 0
  AND (SELECT ledger_entry_id IS NOT NULL FROM payment_links WHERE id='a6000000-0000-0000-0000-000000000001'),
  'T50 payments: paying a link records the money received in the ledger (balance 1,200 → 0)');
SELECT pg_temp.expect_error(
  $$UPDATE payment_links SET status='cancelled' WHERE id='a6000000-0000-0000-0000-000000000001'$$,
  'SK019', 'T51 payments: a paid link can no longer change');
INSERT INTO payment_links (tenant_id, link_no, kind, invoice_id, contact_id, payer_name, amount, method, created_by, expires_at) VALUES
 ('11111111-1111-1111-1111-111111111111','PL-000003','invoice','70000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000009','Client',145,'bank','b0000000-0000-0000-0000-000000000002',now()+interval '7 days');
SELECT pg_temp.expect_error(
  $$INSERT INTO payment_links (tenant_id, link_no, kind, invoice_id, contact_id, payer_name, amount, method, created_by, expires_at) VALUES
    ('11111111-1111-1111-1111-111111111111','PL-000004','invoice','70000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000009','Client',145,'bank','b0000000-0000-0000-0000-000000000002',now()+interval '7 days')$$,
  'one_open_rebill_per_invoice', 'T52 payments: an invoice is billed to a client only once');
INSERT INTO savings_goals (id, tenant_id, user_id, name, target) VALUES
 ('a7000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000001','Emergency',10000);
INSERT INTO savings_moves (tenant_id, goal_id, kind, amount) VALUES
 ('11111111-1111-1111-1111-111111111111','a7000000-0000-0000-0000-000000000001','in',3000),
 ('11111111-1111-1111-1111-111111111111','a7000000-0000-0000-0000-000000000001','out',500);
SELECT pg_temp.expect_error(
  $$INSERT INTO savings_moves (tenant_id, goal_id, kind, amount) VALUES ('11111111-1111-1111-1111-111111111111','a7000000-0000-0000-0000-000000000001','out',3000)$$,
  'SK020', 'T53 savings: you cannot take out more than is saved (3,000 > 2,500)');
SELECT pg_temp.ok((SELECT saved=2500 AND remaining=7500 FROM savings_balances WHERE goal_id='a7000000-0000-0000-0000-000000000001'),
  'T54 savings: saved 2,500 of 10,000, 7,500 to go');
SELECT pg_temp.expect_error(
  $$INSERT INTO org_policies (tenant_id, fast_limit, standard_limit) VALUES ('11111111-1111-1111-1111-111111111111',5000,1000)$$,
  'org_policies_check', 'T55 policy: the standard limit must be above the quick limit');
INSERT INTO org_policies (tenant_id, fast_limit, standard_limit) VALUES ('11111111-1111-1111-1111-111111111111',1000,8000);
SELECT pg_temp.ok(approval_band('11111111-1111-1111-1111-111111111111',800)='fast' AND approval_band('11111111-1111-1111-1111-111111111111',6000)='standard'
  AND approval_band('22222222-2222-2222-2222-222222222222',800)='standard',
  'T56 policy: each company''s own limits decide the approval path (800 is quick at 1,000; default elsewhere)');

-- T22 audit log: append-only and verifiable
SELECT pg_temp.ok((SELECT count(*) FROM audit_log) > 30, 'T22 audit: changes were logged automatically');
SELECT pg_temp.expect_error($$DELETE FROM audit_log$$, 'permission denied', 'T23 audit: app role cannot delete audit rows');
SELECT pg_temp.ok(verify_audit_chain('11111111-1111-1111-1111-111111111111') IS NULL, 'T24 audit: hash chain verifies intact');

-- T25 tamper detection (simulate a DBA editing a row directly)
RESET ROLE;
ALTER TABLE audit_log DISABLE TRIGGER audit_log_append_only;
UPDATE audit_log SET after = '{"amount":1}'::jsonb
 WHERE id = (SELECT min(id)+5 FROM audit_log WHERE tenant_id='11111111-1111-1111-1111-111111111111');
ALTER TABLE audit_log ENABLE TRIGGER audit_log_append_only;
SELECT pg_temp.ok(verify_audit_chain('11111111-1111-1111-1111-111111111111') IS NOT NULL,
  'T25 audit: direct tampering is detected by the hash chain');

-- T26 tenant B sees nothing of tenant A
SET ROLE sk_app;
SET app.tenant_id = '22222222-2222-2222-2222-222222222222';
SELECT pg_temp.ok((SELECT count(*) FROM expenses) = 0 AND (SELECT count(*) FROM custodies) = 0,
  'T26 RLS: tenant B sees none of tenant A''s expenses or custodies');
RESET ROLE;

\echo 'ALL TESTS PASSED'
