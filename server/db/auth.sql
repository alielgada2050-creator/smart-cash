CREATE SCHEMA IF NOT EXISTS sk;

CREATE UNIQUE INDEX IF NOT EXISTS users_active_email_unique_idx
  ON sk.users (lower(email))
  WHERE email IS NOT NULL AND is_active = true AND status = 'active';

CREATE TABLE IF NOT EXISTS sk.auth_email_otps (
  user_id uuid PRIMARY KEY REFERENCES sk.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES sk.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  code_hash bytea NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 4),
  sent_at timestamptz NOT NULL,
  send_window_started_at timestamptz NOT NULL,
  send_count smallint NOT NULL CHECK (send_count BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS sk.auth_email_sessions (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES sk.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES sk.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS auth_email_sessions_active_idx
  ON sk.auth_email_sessions (user_id, expires_at)
  WHERE revoked_at IS NULL;
