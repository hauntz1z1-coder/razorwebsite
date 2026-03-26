-- ============================================================
-- EXECUTE ESTE SQL NO SEU SUPABASE
-- Acesse: https://supabase.com/dashboard/project/euamfkbnnjsfjpjredvre/sql/new
-- Cole este codigo e clique em "Run"
-- ============================================================

-- Criar tabela patrocinadores
create table if not exists patrocinadores (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  valor decimal not null,
  elo text not null,
  created_at timestamp with time zone default now()
);

-- Ativa Row Level Security
alter table patrocinadores enable row level security;

-- Permitir leitura publica (para o site mostrar os nomes)
create policy "Permitir leitura publica" on patrocinadores 
  for select using (true);

-- Permitir insercao (para o webhook do Stripe)
create policy "Permitir insercao" on patrocinadores 
  for insert with check (true);

-- Permitir delecao (para o admin)
create policy "Permitir delecao" on patrocinadores 
  for delete using (true);

-- ============================================================
-- APOS EXECUTAR, CONFIGURE AS VARIAVEIS DE AMBIENTE NA NETLIFY:
-- 
-- NEXT_PUBLIC_SUPABASE_URL=https://euamfkbnnjsfjpjredvre.supabase.co
-- SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key (pegue em Settings > API)
-- STRIPE_SECRET_KEY=sk_test_...
-- STRIPE_WEBHOOK_SECRET=whsec_...
-- DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
-- ============================================================
