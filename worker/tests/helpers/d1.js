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
      customer_notes TEXT,
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

export function createCommerceDatabase() {
  const db = createAuthDatabase();
  db.exec(`
    CREATE TABLE customer_state (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      state_key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(user_id,state_key)
    );
    CREATE TABLE addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      line1 TEXT NOT NULL,
      line2 TEXT,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      pincode TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE categories (id TEXT PRIMARY KEY,name TEXT NOT NULL);
    CREATE TABLE products (
      id TEXT PRIMARY KEY,
      category_id TEXT REFERENCES categories(id),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      archived INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'published'
    );
    CREATE TABLE product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      name TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      price_paise INTEGER NOT NULL,
      festival_price_paise INTEGER,
      stock INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      archived INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE coupons (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      value INTEGER NOT NULL,
      minimum_order_paise INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      usage_limit INTEGER,
      usage_count INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      user_id TEXT REFERENCES users(id),
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_mobile TEXT NOT NULL,
      shipping_address_json TEXT NOT NULL,
      shipping_method TEXT NOT NULL,
      coupon_code TEXT,
      subtotal_paise INTEGER NOT NULL,
      discount_paise INTEGER NOT NULL DEFAULT 0,
      shipping_paise INTEGER NOT NULL DEFAULT 0,
      tax_paise INTEGER NOT NULL DEFAULT 0,
      total_paise INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      payment_order_id TEXT,
      payment_id TEXT,
      status TEXT NOT NULL,
      tracking_number TEXT,
      invoice_key TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      variant_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      variant_name TEXT NOT NULL,
      sku TEXT NOT NULL,
      unit_price_paise INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      tax_rate_basis_points INTEGER NOT NULL DEFAULT 500
    );
    CREATE TABLE order_status_history (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE inventory_mutations (
      id TEXT PRIMARY KEY,
      variant_id TEXT NOT NULL REFERENCES product_variants(id),
      mutation_type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      reason TEXT NOT NULL,
      reference_id TEXT,
      actor_user_id TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE coupon_redemptions (
      coupon_id TEXT NOT NULL REFERENCES coupons(id),
      order_id TEXT NOT NULL REFERENCES orders(id),
      user_id TEXT REFERENCES users(id),
      PRIMARY KEY(coupon_id,order_id)
    );
    CREATE TABLE processed_payments (
      payment_order_id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL UNIQUE,
      order_id TEXT NOT NULL UNIQUE REFERENCES orders(id)
    );
    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TRIGGER prevent_invalid_order_customer_insert
    BEFORE INSERT ON orders
    WHEN NEW.user_id IS NULL OR NOT EXISTS(
      SELECT 1 FROM users u WHERE u.id=NEW.user_id AND u.email_verified_at IS NOT NULL
        AND u.account_status='ACTIVE' AND u.blacklisted=0
    )
    BEGIN SELECT RAISE(ABORT,'ORDER_REQUIRES_VERIFIED_CUSTOMER'); END;
    CREATE TRIGGER prevent_unsupported_order_payment
    BEFORE INSERT ON orders
    WHEN NEW.payment_method<>'razorpay' OR NEW.payment_status<>'paid'
      OR NEW.payment_order_id IS NULL OR NEW.payment_id IS NULL
    BEGIN SELECT RAISE(ABORT,'ONLINE_PAYMENT_REQUIRED'); END;
  `);
  return db;
}
