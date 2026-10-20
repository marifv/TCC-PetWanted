CREATE TABLE IF NOT EXISTS password_reset_requests (
    email TEXT PRIMARY KEY,
    code_hash CHAR(64),
    code_expires_at TIMESTAMPTZ,
    code_attempts INTEGER NOT NULL DEFAULT 0,
    last_sent_at TIMESTAMPTZ,
    reset_token_hash CHAR(64),
    reset_token_expires_at TIMESTAMPTZ
);
