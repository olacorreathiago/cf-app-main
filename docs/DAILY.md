# Daily Meet — Log

> Entrada mais recente sempre no TOPO. Cada daily lê apenas a primeira entrada,
> valida contra `git status`/`git log`, e acrescenta uma nova entrada por cima.

---

## 2026-10-02

### Ponto de situação
- **A janela de 08-02 foi commitada** (`cd06115`: exclusão/encerramento, membership periods, drawer shell, resultados tardios). Não há commits desde 2026-08-02 (~2 meses).
- **Working tree nova (12 ficheiros alterados + novos, ~+245/−75):** feature de **Consistência (Fase 1)** — `consistency-actions.ts`, `consistency-hero/month-card/week-dots`, `weekly-goal-drawer`, `src/lib/time.ts` (helper de fusos, fecha o ponto a rever de 08-02), migrações `00047_consistency.sql` e `00048_dropins_in_counts.sql` (drop-ins confirmados passam a contar na lotação).
- **`purgeAccount()` já tem chamador:** `src/app/api/cron/purge-accounts/route.ts` + `vercel.json` (cron diário 04:30). Falta confirmar `CRON_SECRET` e o deploy.
- Notificações mexidas (`send.ts`, `actions.ts`, `queries.ts`, `notification-bell`) — ligadas à consistência (lembrete/meta semanal) a confirmar.
- Spec em `docs/CONSISTENCY_FLOW.md`, mock em `docs/mocks/consistency.html`, plano em `docs/prompts/consistencia-fase-1.md`.

### Visão estratégica para lançamento
- **Tese:** o Zekko vende-se à box como "o gestor que trata de presenças, pagamentos e retenção sem folhas de cálculo", e ao atleta como "a app onde o treino dele tem história" (Records + Consistência). Atleta é o motor de retenção, box é quem paga.
- **Lançar pequeno, não largo:** piloto fechado com **3–5 boxes** conhecidas (idealmente 1 em PT que já te dê feedback semanal), gratuito/preço simbólico durante 6–8 semanas em troca de uso real e testemunho. Não abrir registo público nem Discovery de boxes antes disto.
- **Âmbito mínimo vendável (MVP de lançamento):** agenda+reservas+waitlist ✅, WOD+resultados+leaderboard ✅, membros/trials/drop-ins ✅, planos+faturação manual ✅, notificações ✅, exclusão/RGPD ✅, consistência (em curso). **Fora do lançamento:** Loja, Eventos, Stripe Fase 2, gamificação de pontos, Discovery.
- **Abordagem de entrada na box:** onboarding assistido (tu importas membros + horário na 1.ª sessão); o atleta entra por convite/link — a box nunca pede aos membros para "descobrirem a app". Medir **ativação** = box com ≥1 semana de aulas criadas + ≥70% dos membros convidados com 1 reserva.
- **Métricas do piloto:** reservas/semana por box, % de membros ativos semanais, resultados registados por aula, tempo que o coach poupa (perguntar), churn de membros. Se atleta registar resultados e consistência >2×/semana, o produto pega.
- **Preço (hipótese a validar):** subscrição Zekko por box por escalão de membros; pagamentos dos atletas ficam manuais na Fase 1, Stripe Connect/PSP PT só depois de haver tração (Fase 2).
- **Riscos antes de abrir:** (1) RGPD/termos/política de privacidade e DPA para boxes; (2) backups e monitorização (Sentry, uptime) — hoje não há; (3) emails transacionais com domínio próprio (SPF/DKIM); (4) testes automáticos mínimos nos fluxos críticos (reserva, waitlist, faturação); (5) responsivo/PWA — o atleta usa no telemóvel.

### Pendências / perguntas em aberto
- [ ] **Confirmar aplicação no Supabase das `00044`–`00048`** (por confirmar desde 08-02; `00047`/`00048` são novas).
- [ ] Testar manualmente exclusão de conta, encerramento/reabertura de box, faturação com lacuna e plano padrão.
- [ ] Testar Consistência de ponta a ponta (semana, mês-recorde, drawer da meta, check-in tardio a corrigir contagem).
- [ ] Configurar `CRON_SECRET` na Vercel e verificar a 1.ª execução do cron de purga.
- [ ] Dashboard por aula (2 sessões do mesmo WOD colapsadas) — continua por fazer.
- [ ] Commits: working tree por commitar, à espera de pedido explícito.

### Próximas tarefas (por ordem)
1. **Aplicar `00044`–`00048`** e testar os fluxos acumulados (exclusão, billing, plano padrão, consistência).
2. **Fechar a Consistência Fase 1** (revisão visual vs mock, tsc, notificações) e **commitar** (idealmente: 1 commit consistência, 1 commit cron/purga, 1 commit drop-ins/lotação).
3. **Dashboard por aula** (último ponto técnico a rever).
4. **Checklist de pré-piloto:** RGPD/termos, domínio de email, monitorização/backups, testes dos fluxos críticos, revisão mobile/PWA.
5. **Recrutar 3–5 boxes piloto** e preparar onboarding assistido (import de membros/horário).
6. Depois do piloto: decidir entre Pagamentos Fase 2 (Stripe Connect/PSP PT), Loja ou Gamificação de pontos conforme o feedback.

---

## 2026-08-02

### Ponto de situação
- **Continua sem commits novos** desde `73f0673`. A working tree cresceu bastante: **49 ficheiros alterados + 12 novos**, ~+1054/−623.
- **#5 — Exclusão de conta e encerramento de box está implementado**, seguindo `docs/DELETION_FLOW.md`. Era o último item em aberto da janela anterior.
- Entraram **dois temas não planeados** (bugs estruturais encontrados pelo caminho): remoção soft de membros com histórico por período, e plano padrão da box.
- `npx tsc --noEmit` passa sem erros.

### O que foi feito desde a última daily (delta)

**#5 — Exclusão de conta + encerramento de box** ✅
- Migração `00044_deletion_flow.sql`: `profiles.deleted_at`; `boxes.deleted_at/closed_by/closure_reason/closure_message`; `memberships.status_before` + `status_before_source` (para restaurar no reopen); tipo de notificação `box_closed` no check; e a alteração de FK prevista — `profiles.id → auth.users(id)` deixa de ter `on delete cascade`, para o perfil anonimizado sobreviver ao delete do `auth.users`.
- `src/lib/account/`: `deletion-actions.ts` (`requestAccountDeletion`, `cancelAccountDeletion`) e `purge.ts` (`purgeAccount`, anonimização + delete do `auth.users` via service role).
- `src/lib/box/closure-actions.ts`: `getBoxClosureSummary`, `closeBox`, `reopenBox` (+ `closure-constants.ts`).
- UI: `profile/danger-zone.tsx`, `/athlete/deleted` (ecrã de recuperação + `recover-account-button`), `settings/close/` (ecrã de aviso + wizard drawer, como decidido), `reopen-banner.tsx`, `closed-box-badge.tsx`.
- `proxy.ts` passou a ser a guarda real: conta com `deleted_at` cai sempre em `/athlete/deleted`; box encerrada só é acessível ao **owner** e apenas em `/settings` e `/billing` (as outras sub-rotas eram alcançáveis por URL direto, mesmo com os links escondidos).
- `dashboard-actions.ts`: novo `closedBox` (`AthleteClosedBoxInfo`) para o empty state explicar "a box encerrou" em vez de "não tens box", com `withinReopenWindow` de 30 dias.

**Remoção de membros deixou de ser destrutiva** ✅ *(não planeado)*
- Migração `00045_membership_periods.sql`: `memberships.removed_at/removed_by` + tabela `membership_periods` (um registo por passagem contígua), com triggers, RLS e backfill.
- `removeMember()` passou de `delete` para flip de estado. Motivo: o delete perdia a tenure (notas, role, `created_at`) e, ao re-convidar, os meses pagos antigos ressurgiam como se a passagem fosse contínua.
- `getBillingData()` reescrito sobre `membership_periods` — passa a distinguir **"era membro e não pagou" (em atraso)** de **"não era membro nesse mês" (lacuna, não aparece)**.

**Plano padrão da box** ✅ *(não planeado)*
- Migração `00046_default_plan.sql`: `boxes.default_plan_id`. Novos membros (link de convite, convite aceite ou adição direta) ficam sempre com plano.
- Bug que fecha: sem `plan_id`, o `bookClass()` não aplicava limite nenhum de `classes_per_week` — membro "fantasma" a marcar aulas ilimitadas sem nada faturado.
- `plans-client.tsx`: marcar/desmarcar plano padrão com atualização otimista.

**Hardening de permissões** ✅
- `assertStaffRole` (member-actions) e `assertStaffWrite` (payments) passaram a exigir `status = 'active'` — um staff suspenso mantinha os privilégios de escrita.

### A rever
- **`purgeAccount()` não tem quem o chame.** A função existe e está correta, mas nada a invoca — a página `/athlete/deleted` apenas *mostra* a data de purga (`deleted_at + 30 dias`). Sem um agendador (cron do Supabase, route handler protegido, ou job externo) a purga nunca acontece e o soft delete fica permanente. É o item que falta para o fluxo estar realmente fechado.
- **Dashboard ainda colapsa 2 sessões do mesmo WOD** — mantém-se do 07-31. `wodClassMap` continua a ficar com a *primeira* aula (`dashboard-actions.ts:384`) e `todayWods` continua deduplicado por `wod_id`. A decisão registada foi "dashboard passa a listar por aula" — ainda por fazer.
- **Helper de fuso `Europe/Lisbon` ainda não é convenção.** Só existe em `coach-today-actions.ts` e `dropin/[slug]/page.tsx`; o leaderboard e o dashboard continuam com `T00:00:00.000Z`. Decidido extrair helper — ainda por fazer.

### Pendências / perguntas em aberto
- [ ] **Aplicar `00044`, `00045` e `00046` no Supabase** — as três estão por confirmar (só a `00043` foi confirmada a 07-31). Bloqueiam todo o teste do fluxo de exclusão, da faturação por período e do plano padrão.
- [ ] Testar manualmente o fluxo de exclusão de conta e de encerramento/reabertura de box.
- [ ] Decidir como agendar o `purgeAccount()`.
- [ ] Commit da janela — continua à espera de pedido explícito (janela já grande; considerar dividir em 3 commits: exclusão/encerramento, membership periods + billing, plano padrão + hardening).

### Próximas tarefas (por ordem)
1. **Aplicar as 3 migrações** no Supabase.
2. **Testar** exclusão de conta, encerramento e reabertura de box, e a faturação com remoção → lacuna → re-convite.
3. **Fechar o `purgeAccount()`** com um agendador.
4. **Commitar** a janela (em 3 commits temáticos).
5. **Os 2 pontos a rever** que sobram: dashboard por aula + helper de fuso `Europe/Lisbon`.
6. **Gamificação / pontos do leaderboard** — `TODO(points)` e `logged_late` já preparados.

---

## 2026-07-31

### Ponto de situação
- **Sem commits novos** desde `73f0673` (Pagamentos Fase 1). Tudo o que se segue está na **working tree, por commitar** (16 ficheiros alterados, 2 novos, +467/−541).
- **A janela de 2026-07-20 está implementada na íntegra** — os 5 itens dentro de âmbito (#1, #2, #3, #4, #6). O #5 (exclusão de conta/box) continua fora, à espera da estruturação do Thiago.
- `npx tsc --noEmit` passa sem erros.

### O que foi feito desde a última daily (delta)

**#2 — Resultado por horário independente** ✅
- `dashboard-actions.ts`: `myResultMap` (por `wod_id`) substituído por dois mapas — `myResultByClassMap` (por `class_id`) e `myResultByWodMap` (fallback só para linhas legacy sem `class_id`). Novo `wodClassMap` liga cada WOD à aula assistida de onde veio.
- `results-actions.ts`: resultados sem `class_id` só servem de fallback **no próprio dia** e são "consumidos" no primeiro uso — deixam de contaminar todas as sessões do mesmo WOD.

**#4 — Shell de drawer** ✅
- Novo `src/components/shared/drawer-shell.tsx`: header fixo com "X" automático, corpo com scroll interno, footer fixo opcional, backdrop, lock de scroll do body e fecho por Escape.
- Aplicado aos **6 drawers**: `wod-result-drawer`, `class-detail-drawer`, `template-drawer`, `wod-picker-drawer`, `wod-drawer`, `invite-drawer`. Exportado em `shared/index.ts`. Saldo líquido: menos ~250 linhas de código duplicado.

**#3 — Records: filtros atrás de botão** ✅
- `prs-client.tsx`: estado `showFilters`, botão-ícone ao lado da pesquisa com `aria-pressed`, chips de tipo/categoria renderizadas condicionalmente.

**#1 — Resultado tardio (`logged_late`)** ✅
- Nova migração `00043_wod_results_late.sql`: coluna `updated_at` (+ trigger `set_wod_results_updated_at`, backfill a partir de `recorded_at`), coluna `logged_late boolean not null default false`, índice em `class_id`.
- `wod-result-actions.ts`: helper `isLoggedLate()` compara o dia de calendário atual com o dia de `classes.starts_at`; marcado no insert e no update (uma vez tardio, nunca volta atrás).
- `leaderboard-actions.ts`: `getDailyLeaderboard` passou a filtrar por **aulas do dia** (`class_id in (...)`), não por `recorded_at` — corrige o bug de o resultado aparecer no dia errado. `logged_late` propagado em `LeaderboardEntry` (diário e benchmark) e `TODO(points)` deixado no sítio onde os pontos vão ser calculados.
- `leaderboard-client.tsx`: `LateBadge` (relógio dourado `#F0B417`) com tooltip "Resultado registado num dia posterior ao da aula".

**#6 — Faturação antes da entrada do atleta** ✅
- `payments/actions.ts`: `getBillingData` passou a selecionar `start_date` e `created_at` das memberships.
- `billing-client.tsx`: `joinedAfterPeriod()` filtra os membros que ainda não tinham entrado no período visualizado; `visibleMembers` usado na lista, na contagem do cabeçalho, no empty state e no total pendente.

### A rever (encontrado nesta daily, não bloqueante)
- **Dashboard ainda colapsa 2 sessões do mesmo WOD num só card** — `todayWods` é deduplicado por `wod_id` e `wodClassMap` fica com a **primeira** aula assistida. O fix do #2 está correto no lado dos dados, mas a segunda sessão do mesmo WOD não é alcançável a partir do dashboard (só pela vista por dia, `getAthleteResultsForDay`, essa sim por sessão). Decidir se o dashboard deve listar por aula em vez de por WOD.
- **Fronteiras de dia em UTC** — `getDailyLeaderboard` (e restantes queries) usam `T00:00:00.000Z`/`T23:59:59.999Z`. Em Portugal (UTC+1 no verão) uma aula entre a meia-noite e a 1h cai no dia anterior. Convenção pré-existente em todo o projeto; corrigir de uma vez ou assumir.
- **Leaderboard diário devolve vazio quando não há aulas nesse dia** — comportamento intencional (resultados manuais não vão a leaderboard), mas confirma que é o pretendido para dias sem aulas registadas.

### Pendências / perguntas em aberto
- [x] **Migração `00043_wod_results_late.sql`** — aplicada no Supabase (confirmado 2026-07-31).
- [x] Teste manual dos 5 fixes — "tudo parece funcionar" (Thiago, 2026-07-31).
- [ ] Commit da janela — nunca feito automaticamente, à espera de pedido explícito.
- [x] #5 exclusão de conta/box — fluxo fechado, ver `docs/DELETION_FLOW.md`.

### Decisões de exclusão de conta/box (2026-07-31)
Especificação completa em `docs/DELETION_FLOW.md`. Resumo das decisões do Thiago:
- **Conta:** soft delete + anonimização dos dados pessoais; resultados/PRs/financeiro mantêm-se.
- **Box:** nunca é excluída na prática — encerramento com tombstone; histórico de treino e dados financeiros preservados com indicador "box encerrada".
- **Graça:** 30 dias reversível; depois disso, reabertura de box por pedido ao suporte (o slug é libertado ao fim dos 30 dias).
- **Pré-condições da box:** só o `owner`; membros ativos bloqueiam no servidor, mas o wizard resolve isso sozinho.
- **Wind-down em massa:** o owner clica em "Encerrar box" e cai num ecrã de aviso (não no wizard) que diz quantos membros ativos há e avisa explicitamente que **no wizard todos são desassociados, sem escolher atletas**; dois caminhos, "Avançar" ou "Ir para Membros". O wizard desassocia todos e envia um comunicado personalizável, tudo a executar só no confirmar final.
- **Notificação `box_closed` é in-app apenas** — sem email nesta fase. Isto elimina o risco de timeout no envio em série do `send.ts`; as notificações entram num único insert em massa.
- **`closure_message` guardado** em `boxes`, e usado como **tooltip do badge "Box encerrada"** no histórico do atleta. Renderizar sempre como texto, nunca HTML.
- **Prompt de execução escrito:** `docs/prompts/exclusao-conta-e-box.md`, pronto para um dev sénior com Sonnet 5.
- **Descoberta técnica:** como nunca corre um `DELETE`, os cascades de `wod_results`/`prs`/`gamification` deixam de ser um risco. A única alteração de FK necessária é remover o `on delete cascade` de `profiles.id → auth.users(id)`.
- **Os 3 pontos "a rever"** ficam com as recomendações da daily como decisão por omissão: dashboard passa a listar por aula; fronteiras de dia com helper `Europe/Lisbon`; leaderboard vazio em dias sem aulas mantém-se (só melhorar o empty state).
- **Gamificação:** entra a seguir a estes 4 pontos; estratégia ainda por elaborar.

### Próximas tarefas (por ordem)
1. **Aplicar a migração `00043`** no Supabase (bloqueia tudo o resto do #1).
2. **Testar manualmente** os 5 fixes e depois **commitar** a janela.
3. **Decidir os 3 pontos "a rever"** acima (dashboard por aula, fuso horário, dia sem aulas).
4. **#5 — Exclusão de conta e de box**, assim que o Thiago fechar a estrutura.
5. Depois disso, seguindo o roadmap: **Gamificação/pontos do leaderboard** (o `TODO(points)` e a flag `logged_late` já estão preparados — é o próximo passo natural) ou **Loja/Produtos**, ou **Pagamentos Fase 2** (Stripe Connect / PSP por box).

---

## 2026-07-20

### Ponto de situação
- **Último commit:** `73f0673` — "manual payments phase 1, plans, billing, drop-in fixes & bug fixes". Toda a **Fase 1 de Pagamentos** (ledger, planos, faturação, drop-in com pagamento) foi commitada na `main`. Working tree limpa.
- Sprint anterior (resultados manuais + acesso a WOD por check-in + design Zekko) também já na `main`.
- **Nova janela de desenvolvimento:** correção de bugs de mobile/leaderboard + estruturação de exclusão de conta/box. 5 itens reportados pelo Thiago, estudados abaixo.

### Bugs / tarefas reportados (com diagnóstico técnico)

**1. Resultado inserido/editado em dia posterior não deve contar para pontos do leaderboard**
- Comportamento pedido: continua a aparecer no leaderboard **com aviso** ("resultado inserido/editado posteriormente"), continua a contar para os resultados/PRs do atleta, mas **é ignorado quando o leaderboard contar pontos**.
- Estado atual: `wod_results` tem `recorded_at` (default now()), `class_id` (nullable → `classes.starts_at` é o "dia" real), **não tem** `updated_at` nem flag de "tardio".
- Problema estrutural adicional: `getDailyLeaderboard` ([leaderboard-actions.ts:210](src/lib/athlete/leaderboard-actions.ts)) filtra o dia por `recorded_at`, não pela data da aula — logo um resultado do dia 16 inserido no dia 19 já aparece **no dia errado (19)**. A "data do resultado" canónica deve ser `class.starts_at` (ou `recorded_at` para resultados manuais sem aula).
- Plano: (a) migração — adicionar `updated_at` (trigger) e derivar `is_late = (data de registo/edição) > (dia da aula)`; (b) leaderboard diário passa a agrupar por dia-da-aula, não por `recorded_at`; (c) badge/tooltip no `leaderboard-client`; (d) quando existir cálculo de pontos, excluir `is_late`. Pontos ainda não existem → nesta janela entregar flag + tooltip de forma coerente.

**2. Dois treinos no mesmo dia — editar um altera o outro**
- Causa-raiz confirmada: [dashboard-actions.ts:368](src/lib/athlete/dashboard-actions.ts) constrói `myResultMap[r.wod_id]` **indexado por `wod_id`**, ignorando `class_id`. Se o atleta treina o mesmo WOD em 2 horários (2 `classes`), ambos os slots partilham o mesmo `my_result` → o drawer entra em modo "atualizar" o mesmo row para os dois.
- Insert já grava `class_id` ([wod-result-actions.ts:80](src/lib/athlete/wod-result-actions.ts)); o leaderboard diário já escolhe "melhor por atleta no dia" ([leaderboard-actions.ts:260](src/lib/athlete/leaderboard-actions.ts)). Falta é o **lado da leitura**: indexar `my_result` por `class_id` (ou `wod_id`+`class_id`) e passar o resultado correto a cada slot. Confirmado que o ranking já pega no melhor dos N → alinhado com o comportamento esperado.

**3. Records — pills de filtro escondidas, ativadas por botão "Filtrar"**
- Estado atual: [prs-client.tsx:568](src/app/(athlete)/athlete/prs/prs-client.tsx) mostra o input de pesquisa e **logo a seguir** as chips (type + category) sempre visíveis (linha 589+).
- Mockup anexado: barra de pesquisa + botão de ícone de filtro à direita (estilo "sliders"). As chips passam a estar ocultas e abrem só ao carregar no botão.
- Plano: adicionar botão-ícone ao lado do input, estado `showFilters`, mostrar bloco de chips condicionalmente; indicador de filtros ativos no botão.

**4. Drawers passam da altura em mobile (não fecham) — header/footer fixos, corpo com scroll**
- 6 drawers no projeto: `wod-result-drawer`, `class-detail-drawer`, `template-drawer`, `wod-picker-drawer`, `wod-drawer`, `invite-drawer`.
- Ex.: [wod-result-drawer.tsx](src/components/athlete/wod-result-drawer.tsx) usa `maxHeight: 92dvh`, header `shrink-0`, corpo `flex-1 overflow-y-auto`, mas **os botões Guardar/Cancelar estão dentro da área de scroll** (linhas 595-598) e não há botão "X" fixo. Em conteúdo alto os botões desaparecem.
- Plano: shell comum de drawer — header fixo com "X", corpo scrollável interno, footer fixo (botões) com o conteúdo a passar por trás. Extrair para um componente partilhado e aplicar aos 6.

**5. Exclusão de conta e exclusão de box (a estruturar — FORA desta janela)**
- Thiago vai estruturar o fluxo primeiro. **Não incluir no desenvolvimento agora.**

**6. Faturação mostra "Em atraso" antes de o atleta entrar na box**
- Causa-raiz: [billing-client.tsx:102](src/app/box/[slug]/billing/billing-client.tsx) `getMemberStatus` marca "overdue" para qualquer mês passado/atual sem pagamento, **ignorando `memberships.start_date`**. Ao recuar o calendário para meses anteriores à entrada do atleta, aparece sempre "em falta".
- Além disso `getBillingData` ([actions.ts:161](src/lib/payments/actions.ts)) nem seleciona `start_date` na query de `memberships`.
- Plano: selecionar `start_date`; excluir do cálculo (ou marcar "n/a"/não listar) os membros cujo mês de entrada é posterior ao período selecionado.

### Decisões alinhadas (2026-07-20)
- **#1 — data do resultado:** é sempre `classes.starts_at` (data+hora de início da aula). `recorded_at` só para resultados manuais (que **não** vão a leaderboard). "Tardio" conta **a partir do dia posterior** ao dia da aula (comparação por dia de calendário).
- **#5** fica de fora desta janela (Thiago estrutura o fluxo primeiro).

### Pendências / perguntas em aberto
- [ ] Migrações desta janela aplicadas manualmente no dashboard Supabase (workflow habitual).

### Próximas tarefas (por ordem)
1. **#2** — indexar `my_result` por `class_id` (fix isolado, sem migração).
2. **#4** — shell de drawer com header/footer fixos + scroll interno (várias telas mobile).
3. **#3** — esconder pills de filtro atrás do botão "Filtrar" nos records.
4. **#1** — migração `updated_at`/`logged_late` + leaderboard diário por dia-da-aula + tooltip.
5. **#6** — faturação: excluir meses anteriores à entrada do atleta (usar `start_date`).
- (Prompt completo para Sonnet 5 preparado nesta sessão a cobrir #1–#4 e #6; #5 excluído.)

---

## 2026-07-17 (actualização — Pagamentos Fase 1)

### Progresso
Todos os 7 entregáveis da Fase 1 de pagamentos manuais foram implementados:

1. **Migração `00042_payments_ledger.sql`** ✅ — tabela `payments` (ledger central), RLS, índices, `boxes.payment_instructions`, tipos `payment_received`/`payment_overdue` reservados na constraint de notificações. Aplicada no dashboard Supabase.

2. **Camada `src/lib/payments/`** ✅ — `types.ts`, `provider.ts` (interface), `provider-manual.ts` (implementação manual), `actions.ts` (server actions: `recordPayment`, `markPaymentPaid`, `cancelPayment`, `getBillingData`, `upsertMembershipPayment`, `createDropInPayment`, `getDropInPayment`, `getMyPayments`, etc.).

3. **Drop-in com pagamento (Fluxo A)** ✅
   - `createDropInPublic` cria `payments` row (`kind='drop_in'`, `status='pending'`) quando `drop_in_price > 0`.
   - Página pública mostra preço + instruções de pagamento no ecrã de sucesso.
   - Email ao visitante inclui preço + instruções quando existem.
   - Drawer de check-in (Today) mostra badge de pagamento (Pago/Pag. pendente) e formulário inline "Registar pagamento" com escolha de método.
   - `CoachTodayDropIn` estendido com `payment_status` e `payment_id`.

4. **Planos — staff CRUD (Fluxo B)** ✅
   - `src/lib/box/plan-actions.ts`: `getPlans`, `createPlan`, `updatePlan`, `togglePlanActive`, `deletePlan`, `assignPlan`.
   - `src/app/box/[slug]/plans/` — página + client com CRUD completo, desativar em vez de apagar quando há membros, contagem de membros por plano.
   - Atribuição de plano no perfil de membro (tab Perfil → secção Plano com dropdown).
   - Sidebar: "Planos" e "Faturação" desbloqueados (sem `locked`); adicionados ao mobile menu com secção "Financeiro".

5. **Faturação (`/box/[slug]/billing`)** ✅
   - Vista mensal com navegação mês anterior/seguinte.
   - Membros com plano ativo × pagamentos do período → estados Pago / Pendente / Em atraso.
   - Marcar pago inline com escolha de método (gera/atualiza payment via `upsertMembershipPayment`).
   - Totais do mês (recebido, pendente) + secção drop-ins pagos.

6. **Atleta — "O meu plano"** ✅
   - Secção no perfil do atleta com plano atual, preço, e últimos pagamentos (leitura do ledger via RLS).

7. **Preferências de notificação** ✅
   - `NotificationType` inclui `payment_received` e `payment_overdue` (reservados, sem implementação).
   - `getPreferences` é role-aware: `new_drop_in` e `class_starting` só aparecem para staff.
   - In-app é sempre ativo para esses tipos (toggle desativado na UI com "(sempre ativo)"); email é opt-out.
   - `getPrefs` em `send.ts` respeita a regra de always-in-app.

### Estado
- Typecheck (`tsc --noEmit`) passa sem erros.
- Não foi possível testar fluxo completo via browser (auth por magic link).
- Nenhum commit feito — aguarda pedido explícito.

### Próximos passos
1. Testar manualmente no browser (login + navegar Planos, Faturação, drop-in).
2. Commit do bloco "Pagamentos Fase 1" quando o Thiago pedir.
3. Configurar `payment_instructions` nas settings de uma box para testar o fluxo.

---

## 2026-07-17

### Ponto de situação
- **Último commit:** `1e50d1b` — realtime notifications + migração do design Zekko para todas as páginas. A grande fase de design (prioridade vermelha do roadmap) está essencialmente na `main`.
- **Em curso (working tree, ~27 ficheiros, não commitado):**
  - **Resultados manuais de benchmarks** — atleta regista resultado feito fora de aula (ex.: Karen em casa): migração `00039_manual_results.sql` (wod_results aceita `benchmark_slug` global, `is_manual`, RLS nova), `src/lib/athlete/manual-result-actions.ts`, lógica de PR partilhada extraída para `src/lib/athlete/pr-eval.ts`, UI nova em `prs-client.tsx` (+238 linhas).
  - **Acesso a WODs exige check-in confirmado** — migração `00038_checkin_wod_access.sql` (`get_attended_class_wods` agora só devolve WODs de aulas com `attended = true`).
  - **Seeds** — `00040_benchmark_movements_seed.sql` e `00041_weightlifting_seed.sql`.
  - **Refactor de navegação** — `athlete-sidebar.tsx` (grande rework), `box-nav.tsx`, novo `box-card.tsx`, `box-selector.tsx` removido.

### Pendências / perguntas em aberto
- [x] Migrações 00038–00041 aplicadas manualmente no dashboard Supabase ✅ (2026-07-17)
- [x] Fluxo de resultado manual → PR testado ✅ (2026-07-17)
- [x] Trabalho em curso validado ✅ (2026-07-17)

### Próximas tarefas (por ordem)
1. ~~Fechar e testar resultados manuais + PRs~~ ✅
2. ~~Confirmar/aplicar migrações 00038–00041 no Supabase~~ ✅
3. Commit do bloco "manual results + checkin WOD access" (quando o Thiago pedir)
4. **Pagamentos Fase 1 (manual)** — plano alinhado em 2026-07-17, ver decisões abaixo

### Decisões alinhadas — Pagamentos (2026-07-17)
Três fluxos: A) visitante→box (drop-in), B) atleta→box (mensalidade), C) box→Zekko (SaaS).
- **Ledger central `payments`** (nova migração): `kind` ('drop_in'|'membership'|'order'|'platform'), `provider` ('manual' agora; 'stripe'/'ifthenpay' depois), `method` ('cash'|'mbway'|'transferencia'|'multibanco'|'card'), `status` ('pending'→'paid'|'failed'|'refunded'|'cancelled'), `period_start/end` p/ mensalidades, `recorded_by`. Deprecia `drop_ins.amount_paid`/`stripe_payment_intent_id`. Código em `src/lib/payments/` com interface de provider (`provider-manual.ts` primeiro).
- **Fluxo C (Zekko)**: só estrutura DB (`kind='platform'`); telas ficam para depois — ativação de boxes continua manual.
- **Drop-in manual**: página pública `/dropin/[slug]` mostra preço + instruções de pagamento da box (novos campos em box settings, ex.: MB Way/IBAN/"pagas no local"); cria payment `pending`; staff regista pagamento (método) na drawer de check-in / tab Drop-ins.
- **Planos**: `/box/[slug]/plans` (CRUD staff) + `/box/[slug]/billing` (Faturação: vista mensal do ledger, quotas em atraso, marcar pago inline) — ativar entradas cinzentas da sidebar. Atleta vê "O meu plano" no perfil; escolha de plano no join/convite só define `plan_id`.
- **Notificações `new_drop_in` + `class_starting`**: aparecem nas preferências só para staff da box; **email opt-out, in-app (sino) sempre ativo**. Reservar tipos futuros `payment_received`/`payment_overdue`.
- **Fase 2 (online, depois)**: decidir PSP — Stripe Connect vs Ifthenpay/Eupago — para MB Way/Multibanco/cartões; fluxos A/B são dinheiro da box (Connect/PSP por box), fluxo C é Stripe normal da Zekko.
