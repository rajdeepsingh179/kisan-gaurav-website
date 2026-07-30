import { DatabaseSync } from "node:sqlite";

const normalize = (values) => values.map((value) => value === undefined ? null : value);

class D1Statement {
  constructor(database, sql, values = []) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }

  bind(...values) {
    return new D1Statement(this.database, this.sql, normalize(values));
  }

  async first() {
    return this.database.prepare(this.sql).get(...this.values) || null;
  }

  async all() {
    return { results: this.database.prepare(this.sql).all(...this.values) };
  }

  async run() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { success: true, results: [], meta: { changes: Number(result.changes) } };
  }
}

export class TestD1 {
  constructor() {
    this.database = new DatabaseSync(":memory:");
    this.database.exec("PRAGMA foreign_keys=ON");
  }

  exec(sql) {
    this.database.exec(sql);
  }

  prepare(sql) {
    return new D1Statement(this.database, sql);
  }

  async batch(statements) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const results = [];
      for (const statement of statements) {
        const source = statement.sql.trim();
        if (/^(?:SELECT|PRAGMA|EXPLAIN)\b/i.test(source)) {
          results.push({ success: true, results: this.database.prepare(statement.sql).all(...statement.values), meta: { changes: 0 } });
        } else {
          const result = this.database.prepare(statement.sql).run(...statement.values);
          results.push({ success: true, results: [], meta: { changes: Number(result.changes) } });
        }
      }
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  close() {
    this.database.close();
  }
}

export function createAuthDatabase() {
  const db = new TestD1();
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      mobile TEXT,
      profile_photo_url TEXT,
      password_hash TEXT,
      password_salt TEXT,
      password_iterations INTEGER NOT NULL DEFAULT 100000,
      role TEXT NOT NULL DEFAULT 'customer',
      email_verified_at TEXT,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      session_version INTEGER NOT NULL DEFAULT 0,
      failed_login_count INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      account_status TEXT NOT NULL DEFAULT 'ACTIVE',
      blacklisted INTEGER NOT NULL DEFAULT 0,
      status_reason TEXT,
      suspended_at TEXT,
      deleted_at TEXT,
      blacklisted_at TEXT,
      status_changed_at TEXT,
      status_changed_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE user_permissions (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE auth_accounts (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(provider,provider_account_id)
    );
    CREATE TABLE password_reset_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE email_verification_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pending_password_hash TEXT NOT NULL,
      pending_password_salt TEXT NOT NULL,
      pending_password_iterations INTEGER NOT NULL DEFAULT 600000,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      order_id TEXT,
      channel TEXT NOT NULL,
      event_type TEXT NOT NULL,
      recipient TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sent_at TEXT
    );
    CREATE TABLE activity_logs (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      details_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE admin_login_attempts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      ip_address TEXT,
      succeeded INTEGER NOT NULL DEFAULT 0,
      attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE rate_limit_buckets (
      key TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      identity_hash TEXT NOT NULL,
      request_count INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return db;
}
