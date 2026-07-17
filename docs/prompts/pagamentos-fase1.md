# Prompt — Pagamentos Fase 1 (manual)

Implementa a **Fase 1 do sistema de pagamentos (pagamentos manuais)** no Zekko (CF App), seguindo exatamente as decisões já alinhadas. Não inventes âmbito novo; onde houver dúvida real, pergunta antes de codificar.

## Contexto do projeto

- Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, Supabase (Auth + Postgres + RLS multi-tenant por `box_id`), Framer Motion, Sonner, Zod + React Hook Form, Resend para emails.
- Padrões do repo: Server Actions em `src/lib/` agrupadas por domínio (sem API routes); `supabaseServer()` para o utilizador autenticado, `supabaseAdmin` (service role) só quando é preciso bypass de RLS; emails em HTML inline como os existentes em `src/lib/notifications/send.ts`.
- Design system Zekko: headings League Gothic uppercase, eyebrows uppercase espaçado cinza, cards `bg-white/5` arredondados, dourado `#F0B417` APENAS para nav ativo / botão primário / 1 destaque / underline de tabs / links "Ver X →". Copiar padrões visuais das páginas já migradas (ex.: `src/app/box/[slug]/members/`, `src/app/box/[slug]/today/`). Interações smooth com Framer Motion como no resto da app. Fidelidade ao design existente é primordial.
- Todo o copy de UI em **PT-PT** (usar "tu"/"utilizador", nunca "você").
- **Migrations:** ficheiros em `supabase/migrations/` com numeração manual `NNNNN_nome.sql`. A última é `00041`; a próxima é `00042`. NÃO existe Supabase CLI — escreve o SQL e avisa no fim que o utilizador o aplica manualmente no dashboard. Escreve SQL idempotente onde possível (`if not exists`, `drop ... if exists` antes de recriar policies/functions).
- **NUNCA fazer commit** — só quando o utilizador pedir explicitamente.
- Lê `docs/DAILY.md` (só a entrada mais recente) antes de começar — contém as decisões alinhadas a 2026-07-17.

## Conceito

Três fluxos de dinheiro: **A)** visitante→box (drop-in), **B)** atleta→box (mensalidade/plano), **C)** box→Zekko (SaaS). Nesta fase todos os pagamentos são **manuais** (staff regista), mas o schema e a camada de código ficam prontos para MB Way, Multibanco e cartões via provider online (Stripe/Ifthenpay) na Fase 2. O fluxo C fica **só no schema** (sem UI).

## Entregáveis (por esta ordem)

### 1. Migração `00042_payments_ledger.sql`

Tabela `public.payments` — ledger central, fonte de verdade de todos os pagamentos:

- `id uuid pk default gen_random_uuid()`
- `box_id uuid references boxes` — nullable (pagamentos `platform` são da box para a Zekko; decide e comenta a semântica)
- `user_id uuid references profiles` — nullable (drop-in sem conta)
- `kind text check in ('drop_in','membership','order','platform')`
- `reference_id uuid` — id do drop_in / membership / order (sem FK rígida; comenta porquê)
- `amount numeric not null check (amount >= 0)`, `currency text not null default 'EUR'`
- `provider text not null default 'manual' check in ('manual','stripe','ifthenpay')`
- `method text check in ('cash','mbway','transferencia','multibanco','card')` — nullable enquanto `pending`
- `status text not null default 'pending' check in ('pending','paid','failed','refunded','cancelled')`
- `provider_payment_id text` — payment_intent / referência MB (Fase 2)
- `period_start date`, `period_end date` — para mensalidades
- `paid_at timestamptz`, `recorded_by uuid references profiles` (staff que registou), `notes text`
- `created_at timestamptz not null default now()`
- Índices: `(box_id, status)`, `(user_id)`, `(kind, reference_id)`, `(box_id, period_start)`
- RLS seguindo o padrão das outras tabelas: staff (owner/coach) da box gere pagamentos da sua box; atleta lê os seus; inserts públicos de drop-in tratados via `supabaseAdmin` na server action (sem policy pública de insert).

Na mesma migração: `alter table boxes add column if not exists payment_instructions text;` (instruções de pagamento manual da box — MB Way, IBAN, "pagas no local"). Comentar que `drop_ins.amount_paid` e `drop_ins.stripe_payment_intent_id` ficam DEPRECIADOS (deixam de ser escritos; não remover).

### 2. Camada `src/lib/payments/`

- `types.ts` — tipos partilhados (`PaymentKind`, `PaymentMethod`, `PaymentStatus`, `Payment`, …).
- `provider.ts` — interface `PaymentProvider` (ex.: `createPayment`, `markPaid`, `cancel`, `refund`) desenhada para na Fase 2 acomodar um provider online assíncrono (Multibanco gera referência e paga-se depois; MB Way é push com timeout; cartão é síncrono) sem mudar as assinaturas.
- `provider-manual.ts` — implementação atual: criar `pending`, staff marca `paid` com método + `recorded_by` + `paid_at`.
- `actions.ts` — server actions: `recordPayment` (staff regista pagamento pago na hora), `markPaymentPaid`, `cancelPayment`, e helpers de leitura para a Faturação. Validação Zod em todas.

### 3. Drop-in com pagamento (fluxo A)

- `/dropin/[slug]` (página pública, `src/app/dropin/[slug]/`): quando `drop_in_enabled` e `drop_in_price` definido, após o registo mostrar passo/ecrã de pagamento: preço + `payment_instructions` da box. Criar `payments` row (`kind='drop_in'`, `status='pending'`, via `supabaseAdmin`). Se não houver preço, comportamento atual.
- Staff (`src/app/box/[slug]/members/` tab Drop-ins + drawer de check-in na Today page `src/app/box/[slug]/today/class-card-client.tsx`): badge de estado de pagamento (Pendente/Pago dourado discreto/—) e ação "Registar pagamento" com escolha de método. Confirmar presença e registar pagamento devem coexistir no mesmo fluxo sem fricção.
- O email de confirmação ao visitante passa a incluir preço + instruções de pagamento quando existam.

### 4. Planos — staff CRUD (fluxo B)

- Nova rota `src/app/box/[slug]/plans/` + `src/lib/box/plan-actions.ts`: CRUD da tabela `plans` já existente (`name`, `price`, `billing_interval`, `classes_per_week`, `active`). Desativar em vez de apagar quando houver membros associados.
- Atribuir/alterar plano de um membro na ficha de membro existente (perfil de membro na tab Membros) — define `memberships.plan_id`.
- Ativar a entrada "Planos" no grupo Financeiro da sidebar (`src/app/box/[slug]/box-nav.tsx`) — deixa de estar cinzenta/desativada.

### 5. Faturação (`/box/[slug]/billing`)

A tela mais importante do bloco. Nova rota + actions de leitura sobre o ledger:

- Vista mensal (navegação mês anterior/seguinte): membros com plano ativo × pagamentos `kind='membership'` do período → estados **Pago / Pendente / Em atraso** (em atraso = mês corrente ou passado sem payment `paid` para o período).
- Marcar como pago inline: cria/atualiza payment do período com método, `recorded_by`, `paid_at`. Gerar a linha `pending` on-the-fly se não existir para o mês.
- Totais do mês (recebido, pendente) + secção com drop-ins pagos do mês.
- Ativar a entrada "Faturação" na sidebar.

### 6. Atleta — "O meu plano"

No perfil do atleta (`src/app/(athlete)/athlete/profile/` ou padrão equivalente existente): secção simples com plano atual, preço, e estado das quotas dos últimos meses (leitura do ledger, RLS: atleta lê os seus payments). Sem ações de pagamento nesta fase.

### 7. Preferências de notificação

Em `src/lib/notifications/queries.ts`: `new_drop_in` e `class_starting` passam a aparecer nas preferências **apenas para utilizadores com role owner/coach nessa box** (a query de preferências passa a ser role-aware). Regra para estes dois tipos: **email é opt-out configurável; in-app (sino) é sempre enviado** — refletir isso na UI de preferências (toggle in-app desativado/fixo para estes tipos) e garantir em `send.ts` que o in-app destes tipos ignora a preferência. Reservar (só no union type, sem implementar) `payment_received` e `payment_overdue`.

## Fora de âmbito (NÃO fazer)

- Qualquer integração online (Stripe, Ifthenpay, webhooks, checkout) — Fase 2.
- UI do fluxo C (subscrição Zekko) — só o `kind='platform'` no schema.
- Loja/orders UI, gamificação, eventos.
- Recibos/faturas fiscais.

## Processo

1. Começa por ler a última entrada de `docs/DAILY.md` e os ficheiros-chave citados acima antes de escrever código.
2. Implementa pela ordem dos entregáveis; a migração primeiro e **para** depois de a escrever — pede ao utilizador para a aplicar no dashboard Supabase antes de prosseguir para código que dependa dela.
3. No fim de cada entregável, verifica com o dev server (preview) que o fluxo funciona; `npm run build`/typecheck no fim.
4. Atualiza a entrada do dia em `docs/DAILY.md` com o progresso. Não fazer commit sem pedido explícito.
