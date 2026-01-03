-- Migration: Create outlet_operating_hours table for store timings

CREATE TABLE outlet_operating_hours (
    store_id TEXT PRIMARY KEY REFERENCES merchant_store(store_id) ON DELETE CASCADE,
    -- Monday
    monday_open BOOLEAN NOT NULL DEFAULT FALSE,
    monday_slot1_start TIME,
    monday_slot1_end TIME,
    monday_slot2_start TIME,
    monday_slot2_end TIME,
    monday_total_duration INTERVAL NOT NULL DEFAULT '0',
    -- Tuesday
    tuesday_open BOOLEAN NOT NULL DEFAULT FALSE,
    tuesday_slot1_start TIME,
    tuesday_slot1_end TIME,
    tuesday_slot2_start TIME,
    tuesday_slot2_end TIME,
    tuesday_total_duration INTERVAL NOT NULL DEFAULT '0',
    -- Wednesday
    wednesday_open BOOLEAN NOT NULL DEFAULT FALSE,
    wednesday_slot1_start TIME,
    wednesday_slot1_end TIME,
    wednesday_slot2_start TIME,
    wednesday_slot2_end TIME,
    wednesday_total_duration INTERVAL NOT NULL DEFAULT '0',
    -- Thursday
    thursday_open BOOLEAN NOT NULL DEFAULT FALSE,
    thursday_slot1_start TIME,
    thursday_slot1_end TIME,
    thursday_slot2_start TIME,
    thursday_slot2_end TIME,
    thursday_total_duration INTERVAL NOT NULL DEFAULT '0',
    -- Friday
    friday_open BOOLEAN NOT NULL DEFAULT FALSE,
    friday_slot1_start TIME,
    friday_slot1_end TIME,
    friday_slot2_start TIME,
    friday_slot2_end TIME,
    friday_total_duration INTERVAL NOT NULL DEFAULT '0',
    -- Saturday
    saturday_open BOOLEAN NOT NULL DEFAULT FALSE,
    saturday_slot1_start TIME,
    saturday_slot1_end TIME,
    saturday_slot2_start TIME,
    saturday_slot2_end TIME,
    saturday_total_duration INTERVAL NOT NULL DEFAULT '0',
    -- Sunday
    sunday_open BOOLEAN NOT NULL DEFAULT FALSE,
    sunday_slot1_start TIME,
    sunday_slot1_end TIME,
    sunday_slot2_start TIME,
    sunday_slot2_end TIME,
    sunday_total_duration INTERVAL NOT NULL DEFAULT '0',
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No need for unique index, store_id is now primary key

-- Enable Row Level Security
ALTER TABLE outlet_operating_hours ENABLE ROW LEVEL SECURITY;

-- Policy: Only allow access if store_id matches
CREATE POLICY outlet_operating_hours_select ON outlet_operating_hours
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM merchant_store WHERE merchant_store.store_id = outlet_operating_hours.store_id
    ));

CREATE POLICY outlet_operating_hours_update ON outlet_operating_hours
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM merchant_store WHERE merchant_store.store_id = outlet_operating_hours.store_id
    ));

CREATE POLICY outlet_operating_hours_insert ON outlet_operating_hours
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM merchant_store WHERE merchant_store.store_id = outlet_operating_hours.store_id
    ));

-- Optionally, restrict DELETE as well
CREATE POLICY outlet_operating_hours_delete ON outlet_operating_hours
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM merchant_store WHERE merchant_store.store_id = outlet_operating_hours.store_id
    ));
