-- Fix maintenance_events RLS - use simpler domain membership check
-- The previous policies were dropped, now create correct ones

CREATE POLICY "View maintenance events via domain membership"
ON public.maintenance_events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_windows mw
    JOIN public.domain_memberships dm ON dm.domain_id = mw.domain_id
    WHERE mw.id = maintenance_events.maintenance_id
    AND dm.profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  )
);

CREATE POLICY "Insert maintenance events via domain membership"
ON public.maintenance_events FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.maintenance_windows mw
    JOIN public.domain_memberships dm ON dm.domain_id = mw.domain_id
    WHERE mw.id = maintenance_id
    AND dm.profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  )
);