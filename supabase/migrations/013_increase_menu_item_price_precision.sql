-- Migration: Increase precision for menu_items.actual_price and offer_price
ALTER TABLE menu_items ALTER COLUMN actual_price TYPE NUMERIC(20,2);
ALTER TABLE menu_items ALTER COLUMN offer_price TYPE NUMERIC(20,2);