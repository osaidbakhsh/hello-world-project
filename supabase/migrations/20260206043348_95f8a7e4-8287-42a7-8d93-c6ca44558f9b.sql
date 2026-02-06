-- ============================================================
-- MAINTENANCE WINDOWS ENHANCEMENTS
-- Add: assigned_to, completion_notes, site_id
-- Create: maintenance_events table for timeline
-- ============================================================

-- 1. Add new columns to maintenance_windows
ALTER TABLE public.maintenance_windows
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS completion_notes text,
ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE;

-- 2. Create index for assignments
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_assigned_to 
ON public.maintenance_windows(assigned_to);

CREATE INDEX IF NOT EXISTS idx_maintenance_windows_site_id 
ON public.maintenance_windows(site_id);

-- 3. Create maintenance_events table for timeline
CREATE TABLE IF NOT EXISTS public.maintenance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_id uuid NOT NULL REFERENCES public.maintenance_windows(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created', 'started', 'completed', 'cancelled', 'postponed', 'updated', 'note_added', 'assigned')),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- 4. Indexes for maintenance_events
CREATE INDEX IF NOT EXISTS idx_maintenance_events_maintenance_id 
ON public.maintenance_events(maintenance_id, created_at DESC);

-- 5. Enable RLS on maintenance_events
ALTER TABLE public.maintenance_events ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for maintenance_events
CREATE POLICY "Authenticated users can view maintenance events"
ON public.maintenance_events FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert maintenance events"
ON public.maintenance_events FOR INSERT
TO authenticated
WITH CHECK (true);

-- 7. Update maintenance_windows to include completion fields
COMMENT ON COLUMN public.maintenance_windows.assigned_to IS 'User assigned to perform this maintenance';
COMMENT ON COLUMN public.maintenance_windows.completion_notes IS 'Notes recorded upon completion';
COMMENT ON COLUMN public.maintenance_windows.site_id IS 'Site this maintenance belongs to';