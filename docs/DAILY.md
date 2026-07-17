# Daily Meet — Log

> Entrada mais recente sempre no TOPO. Cada daily lê apenas a primeira entrada,
> valida contra `git status`/`git log`, e acrescenta uma nova entrada por cima.

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
