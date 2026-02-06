-- Allow admins to read all companies (for admin dashboard)
CREATE POLICY "Admins can read all companies"
ON companies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow admins to update all companies (for approve/reject)
CREATE POLICY "Admins can update all companies"
ON companies FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow admins to read all executives (for admin company detail view)
CREATE POLICY "Admins can read all executives"
ON executives FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
