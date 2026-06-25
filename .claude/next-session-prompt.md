# Próxima Sessão — Prompt de Continuação

> Data: 2026-06-20
> Lê CONTEXT.md antes de começar. Migrações 00015–00019 estão aplicadas no Supabase via SQL editor.

---

## O que ficou feito na última sessão

- **Rotas mortas eliminadas**: `athlete-classes`, `athlete-profile`, `athlete-wods`, `manager-classes`, `manager-members`, `manager-settings`, `manager-wods` — eram diretórios vazios.
- **CONTEXT.md atualizado**: schema, migrations, decisões, roadmap.
- **PRs**: lógica completa com `evaluatePR()` partilhado, `updateWodResult`, RLS fix para globais, `achieved_at` usa `class.starts_at`.
- **class_id em wod_results**: deduplicação de sessões múltiplas do mesmo WOD.
- **PRs page**: refactored com search + tabs + categoria chips + lista full-width.

---

## Próximas tarefas por ordem de prioridade

### 1. Leaderboard — dados reais

**Ficheiro principal**: `src/app/(athlete)/athlete/leaderboard/` (ver estrutura atual)
**Objetivo**: substituir dados mock por dados reais do Supabase + adicionar split de género.

- Adicionar `gender` a `profiles` (migração necessária: `ALTER TABLE profiles ADD COLUMN gender text CHECK (gender IN ('male','female','other'))`).
- Query de leaderboard por benchmark: join `wod_results` → `wods` → `prs` (ou direto de `prs`), filtrado por `benchmark_slug` ou `wod_id`.
- Split Men/Women/All tabs.
- Stats cards reais: total atletas, melhor resultado, média.
- `profiles.leaderboard_visible` já existe — filtrar por `= true`.

### 2. Celebração de PR (canvas-confetti)

**Trigger**: quando `recordWodResult` ou `updateWodResult` retorna `isPR: true`.
**Ficheiro a modificar**: `src/components/athlete/wod-result-drawer.tsx`

Implementação:
```tsx
import confetti from "canvas-confetti";

// Após submit, se res.isPR:
confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
// Mostrar overlay/banner "🏆 Novo PR! {prMovement}" por 3 segundos
// Usar framer-motion AnimatePresence para entrada/saída suave
```

`canvas-confetti` ainda não está instalado — `npm install canvas-confetti @types/canvas-confetti`.

### 3. Badge de PR no result card (já existe `is_pr`)

`ResultWod.my_result.is_pr` já é populado em `results-actions.ts`.

**Ficheiro a modificar**: `src/app/(athlete)/athlete/results/results-calendar.tsx` (componente que renderiza WodCards).
Adicionar badge âmbar "PR" visível no card quando `wod.my_result?.is_pr === true`.
Padrão: small badge no canto superior direito do card, semelhante ao que existe na WodResultDrawer.

### 4. Convites por email via Resend

**Ficheiro atual**: `src/lib/invites/actions.ts` (função `createInvite`)
**Objetivo**: após criar o convite e gerar o link, enviar email real para o endereço introduzido na drawer.

Setup:
- `RESEND_API_KEY` já está nas env vars.
- Instalar: `npm install resend` (verificar se já instalado).
- Template simples: nome da box, link de convite, validade 7 dias.
- Só enviar se email foi preenchido (convite sem email continua a funcionar — só link).

---

## Notas de contexto importantes

- **Stack**: Next.js 14 App Router, Supabase, shadcn/ui, Tailwind v4, framer-motion.
- **Drawers**: sempre `motion` do framer-motion (ver padrão na secção 17 do CONTEXT.md). Nunca Sheet do shadcn para conteúdo principal.
- **Server actions**: `"use server"` em `src/lib/*/actions.ts`. Componentes client apenas quando necessário.
- **Sem `any`**: TypeScript strict.
- **Mocks a manter**: recados da box, blog, notícias, eventos — não tocar por enquanto.
- **Supabase query immutability**: `.is()` / `.eq()` retornam novo objeto — sempre capturar em `const`.
