-- ── LoopLink Inventory System Rebuild Migration ──────────────────────────────
-- Run this in your Supabase SQL Editor.
-- All statements use IF NOT EXISTS / IF EXISTS guards for idempotency.

-- ── 1. ALTER inventory_items — add new columns ────────────────────────────────

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'product'
    CHECK (item_type IN ('product', 'bulk', 'service')),
  ADD COLUMN IF NOT EXISTS unit_type TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_stock'
    CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock')),
  ADD COLUMN IF NOT EXISTS purchase_type TEXT DEFAULT 'single'
    CHECK (purchase_type IN ('single', 'pack')),
  ADD COLUMN IF NOT EXISTS units_per_pack INTEGER,
  ADD COLUMN IF NOT EXISTS pack_cost NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS unit_name TEXT,
  ADD COLUMN IF NOT EXISTS pack_name TEXT,
  ADD COLUMN IF NOT EXISTS unit_selling_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS pack_selling_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Pack constraint: when purchase_type = 'pack', units_per_pack must be > 0
DO $$ BEGIN
  ALTER TABLE inventory_items
    ADD CONSTRAINT chk_pack_units
      CHECK (purchase_type != 'pack' OR (units_per_pack IS NOT NULL AND units_per_pack > 0));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_items_updated_at ON inventory_items;
CREATE TRIGGER inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_inventory_updated_at();

-- RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "inventory_items_user_policy"
    ON inventory_items FOR ALL
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. CREATE inventory_losses ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_losses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  business_id   UUID NOT NULL,
  user_id       UUID NOT NULL,
  quantity_lost NUMERIC(12, 2) NOT NULL CHECK (quantity_lost > 0),
  reason        TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inventory_losses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "inventory_losses_user_policy"
    ON inventory_losses FOR ALL
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. ALTER inventory_sales — add profit + pack/unit columns ─────────────────

ALTER TABLE inventory_sales
  ADD COLUMN IF NOT EXISTS profit NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS item_type TEXT
    CHECK (item_type IN ('product', 'bulk', 'service')),
  ADD COLUMN IF NOT EXISTS sale_mode TEXT
    CHECK (sale_mode IN ('pack', 'unit')),
  ADD COLUMN IF NOT EXISTS units_sold INTEGER,
  ADD COLUMN IF NOT EXISTS packs_sold INTEGER;

-- Allow null item_id for manual sales
ALTER TABLE inventory_sales ALTER COLUMN item_id DROP NOT NULL;

ALTER TABLE inventory_sales ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "inventory_sales_user_policy"
    ON inventory_sales FOR ALL
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
