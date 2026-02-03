-- Add sort_order column to website_applications
ALTER TABLE website_applications 
ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Update existing rows with initial sort order based on created_at
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 as rn
  FROM website_applications
)
UPDATE website_applications 
SET sort_order = ordered.rn
FROM ordered
WHERE website_applications.id = ordered.id;