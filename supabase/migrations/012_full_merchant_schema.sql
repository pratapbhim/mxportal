-- ===============================
-- FULL PRODUCTION SCHEMA: MERCHANT PLATFORM
-- ===============================

-- 1. Parent Merchant Table
CREATE TABLE IF NOT EXISTS merchant_parent (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  parent_merchant_id TEXT UNIQUE NOT NULL,
  parent_store_name TEXT NOT NULL,
  owner_name TEXT,
  registered_phone TEXT NOT NULL,
  -- normalized phone used for uniqueness checks (digits-only)
  registered_phone_normalized TEXT,
  owner_email TEXT,
  merchant_type TEXT CHECK (merchant_type IN ('LOCAL', 'BRAND')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ
);

CREATE SEQUENCE IF NOT EXISTS merchant_parent_id_seq START 1;
CREATE OR REPLACE FUNCTION set_parent_merchant_id()
RETURNS TRIGGER AS $$
DECLARE
  next_seq BIGINT;
BEGIN
  IF NEW.parent_merchant_id IS NULL OR NEW.parent_merchant_id = '' THEN
    SELECT nextval('merchant_parent_id_seq') INTO next_seq;
    NEW.parent_merchant_id := 'GMMP' || LPAD(next_seq::text, 10, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_set_parent_merchant_id ON merchant_parent;
CREATE TRIGGER trigger_set_parent_merchant_id
BEFORE INSERT ON merchant_parent
FOR EACH ROW
EXECUTE FUNCTION set_parent_merchant_id();
CREATE INDEX IF NOT EXISTS idx_merchant_parent_id ON merchant_parent(parent_merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_parent_active ON merchant_parent(is_active);

-- Normalization function and trigger to populate registered_phone_normalized
CREATE OR REPLACE FUNCTION normalize_phone_text(p TEXT) RETURNS TEXT AS $$
BEGIN
  IF p IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN regexp_replace(p, '\D', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION trg_normalize_registered_phone()
RETURNS TRIGGER AS $$
BEGIN
  NEW.registered_phone_normalized := normalize_phone_text(NEW.registered_phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_normalize_phone ON merchant_parent;
CREATE TRIGGER trigger_normalize_phone
BEFORE INSERT OR UPDATE ON merchant_parent
FOR EACH ROW
EXECUTE FUNCTION trg_normalize_registered_phone();

-- Unique index on normalized phone enforces one parent per phone (race-condition safe)
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_parent_phone_unique
  ON merchant_parent (registered_phone_normalized);

-- Ensure merchant_type has a sensible default for legacy rows and inserts that don't provide it
ALTER TABLE merchant_parent
  ALTER COLUMN merchant_type SET DEFAULT 'LOCAL';

-- Backfill any existing NULL merchant_type values to 'LOCAL'
UPDATE merchant_parent SET merchant_type = 'LOCAL' WHERE merchant_type IS NULL;

-- 2. Child Store Table
CREATE TABLE IF NOT EXISTS merchant_store (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  store_id TEXT UNIQUE NOT NULL,
  parent_id BIGINT REFERENCES merchant_parent(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  cuisine_type TEXT[] NOT NULL,
  store_email TEXT,
  store_phones TEXT[],
  store_description TEXT,
  store_banner_url TEXT,
  ads_images TEXT[],
  full_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  landmark TEXT,
  postal_code TEXT NOT NULL,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  gst_number TEXT,
  gst_image_url TEXT,
  pan_number TEXT NOT NULL,
  pan_image_url TEXT NOT NULL,
  aadhar_number TEXT NOT NULL,
  aadhar_image_url TEXT NOT NULL,
  fssai_number TEXT,
  fssai_image_url TEXT,
  bank_account_holder TEXT NOT NULL,
  bank_account_number TEXT NOT NULL,
  bank_ifsc TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  opening_time TIME NOT NULL,
  closing_time TIME NOT NULL,
  closed_days TEXT[],
  avg_delivery_time_minutes INT,
  min_order_amount NUMERIC(10,2),
  has_area_manager BOOLEAN DEFAULT false,
  am_name TEXT,
  am_mobile TEXT,
  am_email TEXT,
  approval_status TEXT CHECK (
    approval_status IN ('SUBMITTED','UNDER_VERIFICATION','APPROVED','REJECTED')
  ) DEFAULT 'SUBMITTED',
  approval_reason TEXT,
  approved_by TEXT,
  approved_by_email TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ
);
CREATE SEQUENCE IF NOT EXISTS merchant_store_id_seq START 1;
CREATE OR REPLACE FUNCTION set_store_id()
RETURNS TRIGGER AS $$
DECLARE
  next_seq BIGINT;
BEGIN
  IF NEW.store_id IS NULL OR NEW.store_id = '' THEN
    SELECT nextval('merchant_store_id_seq') INTO next_seq;
    NEW.store_id := 'GMMC' || LPAD(next_seq::text, 10, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_set_store_id ON merchant_store;
CREATE TRIGGER trigger_set_store_id
BEFORE INSERT ON merchant_store
FOR EACH ROW
EXECUTE FUNCTION set_store_id();
CREATE INDEX IF NOT EXISTS idx_merchant_store_id ON merchant_store(store_id);
CREATE INDEX IF NOT EXISTS idx_merchant_store_active ON merchant_store(is_active);

-- 3. Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  item_id TEXT UNIQUE NOT NULL,
  store_id BIGINT REFERENCES merchant_store(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT NOT NULL,
  category_type TEXT NOT NULL,
  food_category_item TEXT NOT NULL,
  image_url TEXT,
  actual_price NUMERIC(10,2) NOT NULL,
  offer_price NUMERIC(10,2),
  in_stock BOOLEAN DEFAULT true,
  has_customization BOOLEAN DEFAULT false,
  has_addons BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);
CREATE SEQUENCE IF NOT EXISTS menu_item_id_seq START 1;
CREATE OR REPLACE FUNCTION set_item_id()
RETURNS TRIGGER AS $$
DECLARE
  next_seq BIGINT;
BEGIN
  IF NEW.item_id IS NULL OR NEW.item_id = '' THEN
    SELECT nextval('menu_item_id_seq') INTO next_seq;
    NEW.item_id := 'ITEM' || LPAD(next_seq::text, 10, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_set_item_id ON menu_items;
CREATE TRIGGER trigger_set_item_id
BEFORE INSERT ON menu_items
FOR EACH ROW
EXECUTE FUNCTION set_item_id();
CREATE INDEX IF NOT EXISTS idx_menu_item_id ON menu_items(item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_active ON menu_items(is_active);

-- 4. Item Customizations Table
CREATE TABLE IF NOT EXISTS item_customizations (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  menu_item_id BIGINT REFERENCES menu_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  required BOOLEAN DEFAULT false,
  max_selection INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Item Addons Table
CREATE TABLE IF NOT EXISTS item_addons (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  customization_id BIGINT REFERENCES item_customizations(id) ON DELETE CASCADE,
  addon_name TEXT NOT NULL,
  addon_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Offers Table
CREATE TABLE IF NOT EXISTS offers (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  offer_id TEXT UNIQUE NOT NULL,
  store_id BIGINT REFERENCES merchant_store(id) ON DELETE CASCADE,
  offer_type TEXT CHECK (offer_type IN ('ALL_ORDERS','SPECIFIC_ITEM')) NOT NULL,
  menu_item_id BIGINT REFERENCES menu_items(id),
  discount_type TEXT CHECK (discount_type IN ('PERCENTAGE','FLAT')) NOT NULL,
  discount_value NUMERIC(10,2) NOT NULL,
  min_order_amount NUMERIC(10,2),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_till TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS offer_id_seq START 1;
CREATE OR REPLACE FUNCTION set_offer_id()
RETURNS TRIGGER AS $$
DECLARE
  next_seq BIGINT;
BEGIN
  IF NEW.offer_id IS NULL OR NEW.offer_id = '' THEN
    SELECT nextval('offer_id_seq') INTO next_seq;
    NEW.offer_id := 'OFF' || LPAD(next_seq::text, 10, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_set_offer_id ON offers;
CREATE TRIGGER trigger_set_offer_id
BEFORE INSERT ON offers
FOR EACH ROW
EXECUTE FUNCTION set_offer_id();
CREATE INDEX IF NOT EXISTS idx_offer_id ON offers(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_active ON offers(is_active);

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  entity_type TEXT,
  entity_id TEXT,
  action TEXT,
  old_data JSONB,
  new_data JSONB,
  performed_by TEXT,
  performed_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
