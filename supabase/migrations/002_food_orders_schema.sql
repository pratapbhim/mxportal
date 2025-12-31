-- ============================================
-- GATIMITRA FOOD ORDERS SCHEMA
-- ============================================
-- This is the primary schema for the Merchant Portal (MX)
-- Only handles FOOD ORDERS - other services have separate dashboards
-- ============================================

-- ============================================
-- RESTAURANTS/MERCHANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Restaurant identification
  restaurant_id TEXT UNIQUE NOT NULL,
  -- Format: GMM0001, GMM0002, etc.
  restaurant_name TEXT NOT NULL,
  restaurant_image TEXT,
  
  -- Contact information
  owner_name TEXT NOT NULL,
  owner_phone TEXT NOT NULL,
  owner_email TEXT,
  
  -- Location
  city TEXT NOT NULL,
  area TEXT,
  full_address JSONB DEFAULT '{}',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Business details
  cuisine_type TEXT,
  delivery_time_minutes INTEGER DEFAULT 30,
  minimum_order_amount DECIMAL(10, 2) DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_open BOOLEAN DEFAULT TRUE,
  
  -- Ratings
  average_rating DECIMAL(2, 1) DEFAULT 4.5,
  total_ratings INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for restaurants
CREATE INDEX IF NOT EXISTS idx_restaurants_restaurant_id ON restaurants(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON restaurants(is_active);
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants(city);

-- ============================================
-- FOOD ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS food_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Order identification
  order_number TEXT UNIQUE NOT NULL,
  -- Format: GMF0001, GMF0002, etc.
  
  -- User information
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  user_email TEXT,
  
  -- Restaurant information
  restaurant_id TEXT NOT NULL,
  restaurant_name TEXT NOT NULL,
  restaurant_image TEXT,
  
  -- Order items (stored as JSONB array)
  items JSONB NOT NULL DEFAULT '[]',
  -- Example item structure:
  -- {
  --   "id": "item-1",
  --   "name": "Butter Chicken",
  --   "price": 299,
  --   "quantity": 2,
  --   "image": "/img/butter-chicken.png",
  --   "size": { "name": "Large", "price": 50 },
  --   "addons": [{ "name": "Extra Gravy", "price": 30 }]
  -- }
  
  -- Pricing
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  taxes DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Coupon information
  coupon_code TEXT,
  coupon_discount DECIMAL(10, 2) DEFAULT 0,
  
  -- Delivery information
  delivery_address JSONB NOT NULL DEFAULT '{}',
  -- Example: { "address": "123 Main St", "city": "Chennai", "pincode": "600001", "landmark": "Near park" }
  
  delivery_instructions TEXT,
  
  -- Order status
  status TEXT NOT NULL DEFAULT 'pending',
  -- Possible values: pending, confirmed, preparing, ready, out_for_delivery, delivered, cancelled
  
  -- Payment information
  payment_method TEXT NOT NULL DEFAULT 'cash',
  -- Possible values: cash, upi, card, wallet
  payment_status TEXT NOT NULL DEFAULT 'pending',
  -- Possible values: pending, paid, failed, refunded
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  estimated_delivery_time TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  
  -- Ratings (after delivery)
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for food_orders
CREATE INDEX IF NOT EXISTS idx_food_orders_user_id ON food_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_food_orders_order_number ON food_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_food_orders_restaurant_id ON food_orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_food_orders_status ON food_orders(status);
CREATE INDEX IF NOT EXISTS idx_food_orders_created_at ON food_orders(created_at DESC);

-- ============================================
-- SEQUENCES FOR AUTO-GENERATING IDs
-- ============================================

-- Sequence for restaurants (GMM0001, GMM0002, ...)
CREATE SEQUENCE IF NOT EXISTS restaurant_seq START WITH 1 INCREMENT BY 1;

-- Sequence for food orders (GMF0001, GMF0002, ...)
CREATE SEQUENCE IF NOT EXISTS food_order_seq START WITH 1 INCREMENT BY 1;

-- ============================================
-- TRIGGER FUNCTIONS
-- ============================================

-- Function to generate restaurant IDs (GMM0001 format)
CREATE OR REPLACE FUNCTION generate_restaurant_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.restaurant_id := 'GMM' || LPAD(NEXTVAL('restaurant_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate food order numbers (GMF0001 format)
CREATE OR REPLACE FUNCTION generate_food_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'GMF' || LPAD(NEXTVAL('food_order_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating restaurant IDs
DROP TRIGGER IF EXISTS trigger_restaurant_id ON restaurants;
CREATE TRIGGER trigger_restaurant_id
  BEFORE INSERT ON restaurants
  FOR EACH ROW
  WHEN (NEW.restaurant_id IS NULL OR NEW.restaurant_id = '')
  EXECUTE FUNCTION generate_restaurant_id();

-- Create trigger for auto-generating order numbers
DROP TRIGGER IF EXISTS trigger_food_order_number ON food_orders;
CREATE TRIGGER trigger_food_order_number
  BEFORE INSERT ON food_orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
  EXECUTE FUNCTION generate_food_order_number();

-- Create trigger for auto-updating updated_at in restaurants
DROP TRIGGER IF EXISTS trigger_restaurants_updated_at ON restaurants;
CREATE TRIGGER trigger_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for auto-updating updated_at in food_orders
DROP TRIGGER IF EXISTS trigger_food_orders_updated_at ON food_orders;
CREATE TRIGGER trigger_food_orders_updated_at
  BEFORE UPDATE ON food_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on order tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_orders ENABLE ROW LEVEL SECURITY;

-- Policies for restaurants (view all, but modifications based on ownership)
DROP POLICY IF EXISTS "Anyone can view restaurants" ON restaurants;
CREATE POLICY "Anyone can view restaurants" ON restaurants
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Restaurants can be created" ON restaurants;
CREATE POLICY "Restaurants can be created" ON restaurants
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Restaurants can be updated" ON restaurants;
CREATE POLICY "Restaurants can be updated" ON restaurants
  FOR UPDATE USING (true);

-- Policies for food_orders (users can see all orders for their restaurant)
DROP POLICY IF EXISTS "Orders can be viewed" ON food_orders;
CREATE POLICY "Orders can be viewed" ON food_orders
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Orders can be created" ON food_orders;
CREATE POLICY "Orders can be created" ON food_orders
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Orders can be updated" ON food_orders;
CREATE POLICY "Orders can be updated" ON food_orders
  FOR UPDATE USING (true);

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================
-- Uncomment to insert sample restaurant

/*
INSERT INTO restaurants (
  restaurant_name,
  owner_name,
  owner_phone,
  owner_email,
  city,
  area,
  cuisine_type,
  delivery_time_minutes,
  minimum_order_amount,
  is_active,
  is_open,
  average_rating
) VALUES (
  'Hot Chappathis',
  'Rajesh Kumar',
  '+919876543210',
  'rajesh@hotchappathis.com',
  'Chennai',
  'T. Nagar',
  'Indian, Mughlai',
  30,
  100,
  true,
  true,
  4.5
);

-- Sample food order
INSERT INTO food_orders (
  user_id,
  user_name,
  user_phone,
  restaurant_id,
  restaurant_name,
  items,
  subtotal,
  delivery_fee,
  taxes,
  total_amount,
  delivery_address,
  status,
  payment_method,
  payment_status
) VALUES (
  'USER123',
  'Ramesh',
  '+919876543211',
  'GMM0001',
  'Hot Chappathis',
  '[
    {
      "id": "item-1",
      "name": "Butter Chicken",
      "price": 299,
      "quantity": 2,
      "image": "https://via.placeholder.com/150"
    },
    {
      "id": "item-2",
      "name": "Naan",
      "price": 40,
      "quantity": 2,
      "image": "https://via.placeholder.com/150"
    }
  ]'::jsonb,
  598,
  40,
  55,
  693,
  '{"address": "123 Main Street", "city": "Chennai", "pincode": "600001", "landmark": "Near T. Nagar Market"}'::jsonb,
  'confirmed',
  'upi',
  'paid'
);
*/

-- ============================================
-- ENABLE REALTIME
-- ============================================

-- Enable realtime for food_orders table
ALTER PUBLICATION supabase_realtime ADD TABLE food_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE restaurants;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after creating tables to verify

-- Check tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN ('restaurants', 'food_orders');

-- Check sequences
-- SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public';

-- View restaurants
-- SELECT * FROM restaurants;

-- View food orders
-- SELECT * FROM food_orders;
