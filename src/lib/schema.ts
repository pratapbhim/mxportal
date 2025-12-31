export const merchant_store = pgTable('merchant_store', {
  id: serial('id').primaryKey(),
  store_id: varchar('store_id', { length: 64 }),
  approval_status: varchar('approval_status', { length: 32 }),
  is_active: boolean('is_active'),
});
export const item_addons = pgTable('item_addons', {
  id: serial('id').primaryKey(),
  customization_id: varchar('customization_id', { length: 64 }),
  addon_name: varchar('addon_name', { length: 255 }),
  addon_price: numeric('addon_price'),
});
export const item_customizations = pgTable('item_customizations', {
  id: serial('id').primaryKey(),
  menu_item_id: varchar('menu_item_id', { length: 64 }),
  title: varchar('title', { length: 255 }),
  required: boolean('required'),
  max_selection: varchar('max_selection', { length: 16 }),
});
import { pgTable, varchar, boolean, numeric, serial } from 'drizzle-orm/pg-core';

export const menu_items = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  item_id: varchar('item_id', { length: 64 }),
  store_id: varchar('store_id', { length: 64 }),
  item_name: varchar('item_name', { length: 255 }),
  description: varchar('description', { length: 1024 }),
  category_type: varchar('category_type', { length: 255 }),
  food_category_item: varchar('food_category_item', { length: 255 }),
  actual_price: numeric('actual_price'),
  offer_price: numeric('offer_price'),
  in_stock: boolean('in_stock'),
  has_customization: boolean('has_customization'),
  has_addons: boolean('has_addons'),
  image_url: varchar('image_url', { length: 1024 }),
  is_active: boolean('is_active'),
});
