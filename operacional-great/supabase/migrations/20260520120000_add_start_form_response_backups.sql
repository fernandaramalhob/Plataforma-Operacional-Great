-- Backup history for the start meeting form
CREATE TABLE public.client_start_form_response_backups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES public.client_start_form_responses(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.operational_clients(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  backup_reason TEXT NOT NULL DEFAULT 'AUTOMATIC',
  backed_up_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_start_form_response_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view form response backups"
ON public.client_start_form_response_backups FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert form response backups"
ON public.client_start_form_response_backups FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE INDEX idx_client_start_form_response_backups_client_id_created_at
  ON public.client_start_form_response_backups(client_id, created_at DESC);

CREATE INDEX idx_client_start_form_response_backups_response_id
  ON public.client_start_form_response_backups(response_id);

CREATE OR REPLACE FUNCTION public.handle_client_start_form_response_backup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.client_start_form_response_backups (
    response_id,
    client_id,
    snapshot,
    backup_reason,
    backed_up_by_user_id
  ) VALUES (
    NEW.id,
    NEW.client_id,
    to_jsonb(NEW),
    'AUTOMATIC',
    auth.uid()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS client_start_form_response_backup_trigger ON public.client_start_form_responses;

CREATE TRIGGER client_start_form_response_backup_trigger
  AFTER INSERT OR UPDATE ON public.client_start_form_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_client_start_form_response_backup();

-- Backfill current responses so the first backup already exists
INSERT INTO public.client_start_form_response_backups (
  response_id,
  client_id,
  snapshot,
  backup_reason,
  backed_up_by_user_id,
  created_at
)
SELECT
  r.id,
  r.client_id,
  to_jsonb(r),
  'BACKFILL',
  r.submitted_by_user_id,
  now()
FROM public.client_start_form_responses r
WHERE NOT EXISTS (
  SELECT 1
  FROM public.client_start_form_response_backups b
  WHERE b.response_id = r.id
);
