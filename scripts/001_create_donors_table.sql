-- Create donors table for storing Livepix donations
CREATE TABLE IF NOT EXISTS public.donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  tier TEXT NOT NULL,
  message TEXT,
  transaction_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_donors_tier ON public.donors(tier);
CREATE INDEX IF NOT EXISTS idx_donors_amount ON public.donors(amount DESC);
CREATE INDEX IF NOT EXISTS idx_donors_created_at ON public.donors(created_at DESC);

-- Enable RLS but allow public read access (donors are public)
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read donors (public ranking)
CREATE POLICY "donors_select_public" ON public.donors 
  FOR SELECT 
  USING (true);

-- Only service role can insert/update/delete (webhook uses service role)
CREATE POLICY "donors_insert_service" ON public.donors 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "donors_update_service" ON public.donors 
  FOR UPDATE 
  USING (true);

CREATE POLICY "donors_delete_service" ON public.donors 
  FOR DELETE 
  USING (true);
