-- Up Migration
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,  -- stored in lowercase by the API
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  category      text CHECK (category IN ('Dairy','Meat','Vegetables','Fruit',
                                         'Bakery','Frozen','Drinks','Other')),
  expiry_date   date NOT NULL,
  has_photo     boolean NOT NULL DEFAULT false,
  status        text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','used','wasted')),
  alert_sent_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Dashboard and statistics
CREATE INDEX items_user_status_expiry_idx ON items (user_id, status, expiry_date);

-- Daily alert query
CREATE INDEX items_pending_alert_idx ON items (expiry_date)
  WHERE status = 'active' AND alert_sent_at IS NULL;

-- Down Migration
DROP TABLE items;
DROP TABLE users;
