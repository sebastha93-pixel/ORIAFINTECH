-- Audit log for financial compliance
-- Records sensitive operations; only the backend (service role) writes here.
-- Users can read their own log for transparency.

CREATE TABLE IF NOT EXISTS public.audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  resource_type TEXT,
  resource_id   TEXT,
  ip_address    INET,
  user_agent    TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit trail (transparency)
CREATE POLICY "Users read own audit log"
  ON public.audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- No user-level INSERT/UPDATE/DELETE — only service role can write audit records
-- This ensures tamper-proof audit trail

CREATE INDEX idx_audit_log_user_created ON public.audit_log (user_id, created_at DESC);
CREATE INDEX idx_audit_log_action       ON public.audit_log (action, created_at DESC);
