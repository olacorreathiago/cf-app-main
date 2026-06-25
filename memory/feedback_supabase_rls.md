---
name: feedback-supabase-rls
description: Padrão para operações que afetam registos de outros utilizadores ou tabelas com RLS restritivo
metadata:
  type: feedback
---

Usar `supabaseAdmin` (service role) para escritas que o client JWT do utilizador não consegue fazer por RLS:
- Promoção de waitlist: atualizar booking de outro utilizador
- Atualização de `logo_url` na tabela `boxes` (RLS bloqueia update com client normal)
- Qualquer operação cross-user iniciada server-side

**Why:** Várias vezes durante a sessão o erro "new row violates row-level security policy" apareceu quando tentámos usar o supabase client normal para operações que afetam outros utilizadores ou tabelas com RLS restritivo. A solução padrão é: verificar permissões com `requireManagerRole` / checagem manual, depois executar a escrita com `supabaseAdmin`.

**How to apply:** Antes de usar `supabaseAdmin`, sempre fazer a verificação de papel/permissão manualmente no server action. Nunca usar `supabaseAdmin` sem verificação prévia.
