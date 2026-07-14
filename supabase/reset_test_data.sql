-- =============================================================================
-- RESET TEST DATA
-- Apaga TODOS os dados de utilizacao: contas, boxes, aulas, bookings, records,
-- notificacoes, trials, drop-ins, daily_wods, ficheiros de storage, etc.
-- PRESERVA APENAS os seeds globais: benchmark_wods (Fran, Cindy, ...) e os
-- buckets de storage (avatars, box-assets, waivers) — so o conteudo e limpo.
--
-- Abordagem dinamica: trunca TODAS as tabelas do schema `public` exceto os
-- seeds, por isso apanha automaticamente tabelas que nao estao nas migrations
-- (ex.: daily_wods). O TRUNCATE ... CASCADE resolve as foreign keys sem
-- disparar acoes ON DELETE SET NULL (que rebentavam com colunas NOT NULL).
-- =============================================================================
-- ATENCAO: operacao destrutiva e irreversivel. Correr SO em ambiente de teste.
-- Correr no SQL Editor do Supabase (ou via `supabase db execute`).
-- =============================================================================

BEGIN;

-- 1) Dados aplicacionais (todas as tabelas public exceto seeds) ---------------
DO $$
DECLARE
  r RECORD;
  -- Tabelas de seed/referencia a preservar. Adicionar aqui se surgirem mais.
  keep text[] := ARRAY['benchmark_wods'];
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND NOT (tablename = ANY (keep))
  LOOP
    EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', r.tablename);
  END LOOP;
END $$;

-- 2) Contas de autenticacao --------------------------------------------------
-- Apaga todos os utilizadores para poder registar tudo do zero.
-- (Nesta altura todas as tabelas public ja estao vazias, por isso os FKs
--  ON DELETE SET NULL/CASCADE nao tem linhas para tocar.)
DELETE FROM auth.users;

COMMIT;

-- =============================================================================
-- NOTA sobre STORAGE:
-- O Supabase bloqueia DELETE direto em storage.objects (trigger de protecao).
-- Os ficheiros (avatars, box-assets, waivers) tem de ser limpos a parte, via:
--   - Dashboard -> Storage -> escolher bucket -> apagar ficheiros, ou
--   - Storage API (supabase-js): supabase.storage.emptyBucket('<bucket>')
-- Os ficheiros orfaos nao afetam o teste do zero (as referencias na BD ja
-- foram apagadas); e apenas limpeza de espaco.
-- =============================================================================
