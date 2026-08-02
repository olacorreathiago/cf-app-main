# Prompt — Exclusão de conta e encerramento de box

Implementa a **exclusão de conta e o encerramento de box** no Zekko (CF App), seguindo exatamente as decisões já fechadas em `docs/DELETION_FLOW.md`. Esse documento é a especificação; este prompt é o plano de execução. Não inventes âmbito novo; onde houver dúvida real, pergunta antes de codificar.

## Contexto do projeto

- Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, Supabase (Auth + Postgres + RLS multi-tenant por `box_id`), Framer Motion, Sonner, Zod + React Hook Form, Resend para emails.
- Padrões do repo: Server Actions em `src/lib/` agrupadas por domínio (sem API routes); `supabaseServer()` para o utilizador autenticado, `supabaseAdmin` (`src/lib/supabase/admin.ts`, service role) só quando é preciso bypass de RLS.
- Design system Zekko: headings League Gothic uppercase, eyebrows uppercase espaçado cinza, cards `bg-white/5` arredondados, dourado `#F0B417` APENAS para nav ativo / botão primário / 1 destaque / underline de tabs / links "Ver X →". Fidelidade ao design existente é primordial; interações smooth com Framer Motion.
- **Drawers:** usa o `DrawerShell` partilhado (`src/components/shared/drawer-shell.tsx`) — header fixo com "X", corpo com scroll interno, footer fixo. Não construas um drawer de raiz.
- Todo o copy de UI em **PT-PT** (usar "tu"/"utilizador", nunca "você").
- **Migrations:** ficheiros em `supabase/migrations/` com numeração manual `NNNNN_nome.sql`. A última é `00043`; a próxima é `00044`. NÃO existe Supabase CLI — escreve o SQL e avisa no fim que o utilizador o aplica manualmente no dashboard. SQL idempotente (`if not exists`, `drop ... if exists` antes de recriar policies/functions).
- **NUNCA fazer commit** — só quando o utilizador pedir explicitamente.
- Lê `docs/DELETION_FLOW.md` na íntegra e a entrada mais recente de `docs/DAILY.md` antes de começar.

## Princípio que governa tudo

**Nada é apagado fisicamente.** Exclusão = tombstone (`deleted_at`) + anonimização dos dados pessoais. Como nunca corre um `DELETE` em `boxes` nem em `profiles`, os `on delete cascade` de `wod_results.box_id`, `prs.box_id` e `gamification_*` nunca disparam — **não reescrevas esses FKs**. O trabalho é de estado e de filtros, não de schema destrutivo.

A única alteração de FK necessária está no ponto 1.

---

## Entregáveis (por esta ordem)

### 1. Migração `00044_deletion_flow.sql`

- `profiles.deleted_at timestamptz` + índice parcial `where deleted_at is not null`.
- `boxes.deleted_at timestamptz`, `closed_by uuid references profiles(id)`, `closure_reason text`, `closure_message text` + índice parcial.
- `memberships.status_before public.membership_status` e `memberships.status_before_source text check (status_before_source in ('account_deletion','box_closure'))` — para restaurar o estado exato na recuperação.
- **Remover o `on delete cascade` de `profiles.id → auth.users(id)`.** Hoje é `references auth.users(id) on delete cascade`; apagar o auth user na purga cascatearia para `profiles` e rebentaria nos FKs `restrict` de `wods.created_by`, `events.created_by`, `orders.user_id`, `drop_ins.user_id` e `payments.user_id`. Dropar a constraint e recriá-la sem `on delete`, para o perfil anonimizado sobreviver ao delete do auth user. Comenta o porquê no SQL.
- Adicionar `'box_closed'` à constraint de tipos de `notifications` (a lista atual está em `00042_payments_ledger.sql:128`; repete todos os tipos existentes e acrescenta o novo).
- Rever as policies RLS que expõem boxes, para excluírem `deleted_at is not null`.

### 2. Encerramento de box — `src/lib/box/closure-actions.ts`

- `getBoxClosureSummary(boxId)` — devolve o que o ecrã de aviso e o wizard precisam: nº de memberships `active`/`trial` (excluindo o owner), nº de pagamentos `pending`, nº de aulas futuras com reservas confirmadas, nome e slug da box.
- `closeBox({ boxId, message, confirmName })` — Zod na entrada. Por esta ordem, com **guards no servidor** (nunca confiar na UI):
  1. Verificar que o utilizador tem membership `role = 'owner'` nesta box. Manager e partner não podem.
  2. Verificar que `confirmName` bate certo com `boxes.name`.
  3. `boxes.deleted_at = now()`, `closed_by`, `closure_message` (trim, máx. 500 chars, guardado como **texto**).
  4. Memberships da box → `status = 'inactive'`, guardando o valor anterior em `status_before` + `status_before_source = 'box_closure'`.
  5. Cancelar aulas futuras (dispara as notificações `class_cancelled` já existentes), convites pendentes e trials pendentes.
  6. Inserir as notificações `box_closed` (ver ponto 3).
  - Idealmente numa função Postgres/transação para não deixar a box meio-encerrada se algo falhar a meio. Se ficar em server action, ordena as escritas para o `deleted_at` ser a última coisa reversível e trata os erros explicitamente.
- `reopenBox(boxId)` — só o owner, só dentro dos 30 dias após `deleted_at`. Limpa `deleted_at` e restaura as memberships com `status_before_source = 'box_closure'` para o `status_before`, exceto as que tenham sido alteradas entretanto.

### 3. Notificação `box_closed` — in-app apenas

**Não envies email nesta fase.** Decisão explícita do utilizador.

- Destinatários: **todos os que alguma vez tiveram membership nesta box**, qualquer que seja o status (não só os ativos).
- **Um único `insert` com array de linhas**, não um loop com `await` por destinatário. O `insertNotification` de `src/lib/notifications/send.ts` insere uma linha de cada vez — para este caso escreve um insert em massa.
- `title`: "Box encerrada — {nome da box}". `body`: o `closure_message` do owner, ou o texto padrão se estiver vazio. `data`: `{ box_name, closure_message }`.
- Respeitar as preferências in-app do utilizador? **Não** — este tipo é sempre entregue, como os outros tipos críticos já tratados em `getPrefs`. Acrescenta `box_closed` à lista de tipos sempre-in-app.

### 4. UI de encerramento — definições da box

Em `src/app/box/[slug]/settings/`, numa **zona de perigo** no fim da página, visível só para o `owner`.

**(a) Ecrã de aviso** — o owner clica em "Encerrar box" e cai aqui primeiro, **não** no wizard:
- Diz quantos membros ativos existem.
- Aviso explícito e literal: **no wizard todos os membros são desassociados, sem possibilidade de escolher atletas**. Quem quiser tratar caso a caso faz isso na área de Membros antes de avançar.
- Dois caminhos: **"Avançar"** → wizard; **"Ir para Membros"** → `/box/[slug]/members`.

**(b) Wizard de encerramento** (`DrawerShell`):
- Resumo: N membros serão desassociados, X pagamentos pendentes, Y aulas futuras canceladas (avisos, não bloqueios).
- Textarea opcional do comunicado (máx. 500 chars, com contador). Vazio → texto padrão.
- **Preview** da notificação tal como o atleta a vai ver.
- Confirmação por escrita do nome da box.
- Botão final: "Encerrar box e desassociar N membros". **Nada executa antes deste clique** — desassociar e comunicar não são ações isoladas com efeito imediato.

**(c) Banner de reabertura** — dentro dos 30 dias, quando o owner acede à box encerrada: "Box encerrada a {data} — reabrir", com o botão a chamar `reopenBox`.

### 5. Exclusão de conta — `src/lib/account/deletion-actions.ts`

- `requestAccountDeletion({ confirmEmail })` — Zod. Guards:
  - **Bloqueia se o utilizador for `owner` de alguma box não encerrada.** Devolve a lista dessas boxes para a UI mostrar com link direto ("transfere a propriedade ou encerra a box primeiro").
  - `confirmEmail` tem de bater certo com o email do próprio.
  - `profiles.deleted_at = now()`; memberships → `inactive` com `status_before` + `status_before_source = 'account_deletion'`; reservas futuras canceladas (usa a lógica existente, que já liberta vagas e promove a waitlist); sessão terminada.
- `cancelAccountDeletion()` — limpa `deleted_at` e restaura as memberships com `status_before_source = 'account_deletion'`, exceto as que a box tenha alterado entretanto.
- `purgeAccount(userId)` — **não expor como server action pública**; é para o job dos 30 dias. Usa `supabaseAdmin`:
  - Anonimiza `profiles` mantendo a linha: `full_name` → "Atleta removido"; `nickname`, `phone`, `birth_date`, `avatar_url`, `tax_id`, `nationality`, `height_cm`, `professional_id`, `specialty`, `training_institution` e contacto de emergência → `null`; `email` → `deleted-<uuid>@zekko.invalid` (a coluna é `unique not null`).
  - Apaga o avatar do storage.
  - Apaga `notifications` e `notification_preferences` do utilizador.
  - **Mantém** `wod_results`, `prs`, `bookings`, `payments`, `orders`, `drop_ins`, `gamification_*` — passam a apontar para um perfil anónimo.
  - Apaga o `auth.users` via service role (só funciona depois do ponto 1).
- O agendamento do job fica fora deste âmbito: escreve a função e deixa documentado como será invocada. **Não executes purgas contra dados reais.**

### 6. UI de exclusão de conta

- Em `src/app/(athlete)/athlete/profile/`, zona de perigo com "Apagar conta" → `DrawerShell` de confirmação por escrita do email, explicando o que acontece (30 dias reversível; resultados e PRs mantêm-se anonimizados).
- Página "Conta agendada para exclusão — Recuperar", no padrão da `src/app/(athlete)/athlete/suspended/page.tsx` já existente. O login continua a funcionar mas cai aqui enquanto `deleted_at` estiver preenchido.

### 7. Badge "Box encerrada" + filtros transversais

- **Badge com tooltip:** onde a box encerrada aparecer ao atleta (secção "Minhas Boxes" da sidebar, histórico de resultados, PRs), mostra um badge "Box encerrada" cujo **tooltip é o `closure_message`** do owner. Renderiza sempre como **texto** — nunca `dangerouslySetInnerHTML`.
- **Filtrar `deleted_at is null`** em todas as leituras de boxes. Ficheiros que consultam `boxes` hoje (verifica um a um, nem todos precisam de mudar):
  - `src/app/(auth)/join/[token]/page.tsx`, `src/app/dropin/[slug]/page.tsx` — entrada por token e drop-in público **têm** de rejeitar boxes encerradas.
  - `src/app/box/[slug]/layout.tsx` — deve deixar entrar o owner (para ver o banner de reabertura) e barrar os restantes.
  - `src/lib/box/actions.ts`, `settings-actions.ts`, `classes-actions.ts`, `drop-in-actions.ts`, `trial-actions.ts`, `src/lib/invite/actions.ts`, `src/lib/athlete/dashboard-actions.ts`, `src/lib/athlete/prs-actions.ts`.
  - Restantes páginas em `src/app/box/[slug]/*` que fazem `from("boxes")`.
  - Considera um helper único em vez de espalhar o filtro à mão.

---

## Regras de execução

- Corre `npx tsc --noEmit` no fim; tem de passar limpo.
- Não faças commit.
- Não executes nada destrutivo contra dados reais — nem purgas, nem encerramentos de teste em produção. O SQL da migração é escrito, não aplicado: o utilizador aplica-o manualmente no dashboard Supabase.
- No fim, resume: o que ficou implementado, o que precisa de ser aplicado à mão, e o que ficou de fora (o agendamento do job dos 30 dias e a libertação do slug ficam para uma segunda passagem).
