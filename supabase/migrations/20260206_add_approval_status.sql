-- Add approval workflow columns to companies table
-- approval_status: tracks pending/approved/rejected state (replaces relying on is_visible alone)
-- reviewed_at: when the admin reviewed
-- reviewed_by: which admin reviewed
-- rejection_reason: optional reason when rejected

-- 1. Create approval_status enum type
DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add new columns
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS approval_status approval_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 3. Backfill existing data: if is_visible=true, mark as approved
UPDATE companies
SET approval_status = 'approved',
    reviewed_at = updated_at
WHERE is_visible = true
  AND approval_status = 'pending';

-- 4. Index for fast filtering by approval_status
CREATE INDEX IF NOT EXISTS idx_companies_approval_status ON companies(approval_status);

-- 5. Update RLS policies (if needed) to allow admins to update approval fields
-- This assumes you already have admin RLS policies. If not, add:
-- CREATE POLICY "Admins can update companies" ON companies
--   FOR UPDATE USING (
--     EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
--   );
