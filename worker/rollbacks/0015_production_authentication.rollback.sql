DROP INDEX IF EXISTS idx_email_verification_user;
DROP TABLE IF EXISTS email_verification_tokens;
DELETE FROM email_templates WHERE template_key='email_verification';
-- SQLite/D1 production rollbacks intentionally retain additive user columns.
