# Prompt — Consistência (Fase 1)

Implementa a **funcionalidade de consistência** no Zekko (CF App), seguindo exatamente as decisões fechadas em `docs/CONSISTENCY_FLOW.md`. Esse documento é a especificação; este prompt é o plano de execução. Não inventes âmbito novo; onde houver dúvida real, pergunta antes de codificar.

Referência visual: `docs/mocks/consistency.html` — abre-o no browser. É **documentação de design**, não código: não o importes nem o copies para `src/`, e não o apagues no fim.

## Contexto do projeto

- Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, Supabase (Auth + Postgres + RLS multi-tenant por `box_id`), Framer Motion, Sonner, Zod + React Hook Form.
- Padrões do repo: Server Actions em `src/lib/` agrupadas por domínio (sem API routes, exceto o cron já existente em `src/app/api/cron/`); `supabaseServer()` para o utilizador autenticado, `supabaseAdmin` só quando é preciso bypass de RLS.
- Design system Zekko: headings League Gothic uppercase (`.font-display`), eyebrows `.label-caps` cinzentas, cards `bg-bg-card` com `border-border` e `rounded-2xl`, dourado `#F0B417` (`--accent`) com muita parcimónia. **Fidelidade ao design existente é primordial**; interações smooth.
- **Fusos horários:** usa sempre `src/lib/time.ts` (`localDayIso`, `dayRangeUtc`, `monthRangeUtc`, `localYearMonth`). Regra que já está documentada lá e que **não podes esquecer**: `classes.starts_at` guarda hora local como se fosse UTC (filtra-se com `${dia}T00:00:00.000Z`), enquanto `recorded_at`/`created_at` são instantes reais (precisam de `dayRangeUtc`). Confundir os dois é a origem de toda uma classe de bugs neste projeto.
- **Drawers:** usa o `DrawerShell` partilhado (`src/components/shared/drawer-shell.tsx`). Não construas um drawer de raiz.
- Todo o copy de UI em **PT-PT** (usar "tu", nunca "você").
- **Migrations:** `supabase/migrations/NNNNN_nome.sql`, numeração manual. A última é `00046`; a próxima é `00047`. NÃO existe Supabase CLI — escreve o SQL e avisa no fim que o utilizador o aplica manualmente no dashboard. SQL idempotente (`if not exists`, `drop ... if exists` antes de recriar policies/functions).
- **NUNCA fazer commit** — só quando o utilizador pedir explicitamente.
- Lê `docs/CONSISTENCY_FLOW.md` na íntegra e a entrada mais recente de `docs/DAILY.md` antes de começar.

---

## Os dois princípios que governam tudo

**1. Recorde, não quota.** O mês nunca tem meta e nunca falha: ou se bate o recorde pessoal ou não. Uma meta que só sobe acaba por punir exatamente o atleta constante, que é o cliente ideal da box. A única meta que existe é a **semanal**, e mesmo essa nunca produz um estado de erro — abaixo do ritmo diz-se sempre pelo que **falta**. Não escrevas em lado nenhum "falhaste", e não uses vermelho em nenhum estado desta funcionalidade.

**2. Tudo é derivado à leitura. Sem cache, sem cron.** As contagens calculam-se sempre a partir de `bookings` + `classes` no momento em que são lidas. Isto não é uma preferência de estilo: a presença é marcada por uma pessoa e **vai ser marcada tarde e mal**. Um contador em cache ficaria calado e errado no primeiro check-in tardio. Derivado, corrige-se sozinho sem código nenhum.

A **única** exceção é o recorde mensal, que tem de ser guardado porque é atribuído uma vez e nunca revogado.

---

## Decisões já fechadas — não voltes a abri-las

| Decisão | Valor |
|---|---|
| O que conta | `bookings.attended = true`, atribuído ao dia de `classes.starts_at` |
| Unidade | **Sessão.** Duas aulas no mesmo dia contam **2** |
| Início da semana | **Segunda-feira** |
| Meta semanal proposta | Média das últimas **4 semanas completas**, arredondada, limitada a `[1, 14]` |
| Meta antes de 2 semanas completas | **Não há.** Mostra só a contagem |
| Dia sem aula marcada, com a box aberta | Conta como **falha** na fila de 7 dias |
| Dia em que a box não abriu | **Neutro** — não conta nem falha |
| Marcos (10/25/50/100 sessões) | **Fora** desta fase |
| Escudos, vista de staff, streak coletiva | **Fora** desta fase |

---

## Entregáveis (por esta ordem)

### 1. Migração `00047_consistency.sql`

```sql
create table if not exists public.athlete_weekly_goals (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  box_id        uuid not null references public.boxes(id) on delete cascade,
  weekly_target int  not null check (weekly_target between 1 and 14),
  updated_at    timestamptz not null default now(),
  primary key (user_id, box_id)
);

create table if not exists public.athlete_monthly_records (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  box_id        uuid not null references public.boxes(id) on delete cascade,
  best_sessions int  not null check (best_sessions > 0),
  best_year     int  not null,
  best_month    int  not null check (best_month between 1 and 12),
  achieved_at   timestamptz not null default now(),
  primary key (user_id, box_id)
);
```

- **RLS em ambas.** `select`/`insert`/`update` da própria linha (`user_id = auth.uid()`) para `athlete_weekly_goals`. Para `athlete_monthly_records`, `select` da própria linha e **escrita apenas pelo service role** (é atribuição, não input do utilizador) — segue o padrão já usado em `gamification_points` (`00001_base_schema.sql:974`).
- Acrescenta `'consistency_checkin'` à constraint de tipos de `notifications`. A lista atual está em `00044_deletion_flow.sql`; repete todos os tipos e acrescenta o novo.
- **Não** cries índices em `bookings` sem medir primeiro — `bookings_user_id_idx` e `classes_starts_at_idx` já existem e cobrem as queries desta funcionalidade.

### 2. Cálculo — `src/lib/athlete/consistency-actions.ts`

> A spec fala numa função SQL. Para a fase 1 faz-se em **TypeScript**: é uma leitura por atleta, o repo não tem o hábito de lógica em Postgres, e é mais fácil de acertar. A função SQL só se justifica na fase 3, quando o staff precisar disto para todos os membros de uma vez.

`getAthleteConsistency(boxId)` devolve tudo o que a UI precisa, numa passagem:

```ts
export interface AthleteConsistency {
  week: {
    sessions: number;
    target: number | null;          // null enquanto não houver 2 semanas completas
    isCustomTarget: boolean;
    days: ConsistencyDay[];         // sempre 7, segunda → domingo
    pace: "ahead" | "on" | "behind" | null;  // null à segunda-feira
    missingForTarget: number;
  };
  month: {
    sessions: number;
    year: number; month: number;
    record: { sessions: number; year: number; month: number } | null;
    isNewRecord: boolean;
  };
  lastWeek: { sessions: number; target: number | null; days: ConsistencyDay[] } | null;
}

export interface ConsistencyDay {
  dayIso: string;
  state: "trained" | "missed" | "closed" | "today" | "future";
  sessions: number;               // > 1 marca o dia como duplo
}
```

Regras de cálculo:

- **Sessões** = `bookings` com `attended = true`, join a `classes` da box, agrupadas pelo dia de `starts_at`. Não deduplicar por dia.
- **Dia de operação** = dia com pelo menos uma `class` da box com `status = 'scheduled'`. Um dia sem aulas nenhumas é `closed`.
- **Meta proposta** = média das sessões das 4 semanas completas anteriores (não conta a semana em curso), arredondada, clamp `[1, 14]`. Se houver menos de 2 semanas completas desde o início da membership, `target = null`.
- **Meta personalizada** de `athlete_weekly_goals` tem sempre precedência e **congela** a proposta — a partir daí não se recalcula.
- **Ritmo:** esperado = `target × (dias de operação decorridos ÷ dias de operação da semana)`. `pace` é `ahead` se `sessions - esperado >= 1`, `behind` se `<= -1`, senão `on`. **À segunda-feira devolve `null`** — não há ritmo a mostrar no primeiro dia.
- **Atleta suspenso** (`memberships.status` diferente de `active`/`trial`): devolve `target: null` e `pace: null`, mantendo as contagens.
- **Recorde mensal:** compara as sessões do mês corrente com `athlete_monthly_records`. Se for maior, faz `upsert` guardado (`where best_sessions < novo valor`, para ser seguro em concorrência) e devolve `isNewRecord: true`. Se não houver linha e **não for o primeiro mês do atleta na box**, cria-a. Esta é a única escrita feita numa leitura — deixa um comentário a explicar porquê.
- **`lastWeek`** só vem preenchido **à segunda-feira**; nos outros dias é `null`.

### 3. Meta personalizada — `setWeeklyGoal(boxId, target)`

Server action, Zod (`int`, 1–14), `upsert` em `athlete_weekly_goals`, `revalidatePath("/athlete")`. Permitir também repor a proposta automática (apagar a linha).

### 4. UI — home do atleta

Segue `docs/mocks/consistency.html` de perto. **Não é preciso espaço novo no layout.**

**(a) O hero dourado passa a ser a meta da semana.** Em `src/app/(athlete)/athlete/page.tsx`, o card dourado atual (linha ~221, "WODs no mês") é substituído pelo card de consistência, **mantendo exatamente a mesma linguagem visual**: o mesmo gradiente, os mesmos blobs, o mesmo número gigante em `.font-display`, o mesmo link no rodapé. Muda o conteúdo, não o estilo. O glifo do canto passa de raio a alvo.

Conteúdo: `4 / 5` grande, "Treinos esta semana", a fila de 7 dias, e a pílula de ritmo.

**(b) Fila de 7 dias** — componente próprio, reutilizável. Segunda→domingo, com a inicial do dia por baixo (S T Q Q S S D). Estados: treinou (preenchido), duplo (preenchido com anel), falhou (contorno), hoje (contorno tracejado), box fechada (traço). Sobre o dourado, as marcas são **pretas translúcidas**, não brancas — vê o mock.

**(c) "WODs no mês" desce** para card normal por baixo, sem perder o link para o histórico.

**(d) Card do recorde mensal** — card normal `bg-bg-card`: contagem do mês, recorde anterior à direita, barra de progresso até ao recorde, e a legenda "Faltam N para bateres o teu recorde". No estado de recorde batido, borda dourada suave e pílula "Novo recorde".

**(e) Segunda-feira** — o hero mostraria `0 / 5`, que é o pior cartão possível para receber alguém. Por isso, à segunda e **antes do primeiro treino da semana**, mostra em vez disso o card escuro de fecho da semana anterior (`lastWeek`), com "Nova semana começa hoje. Meta: N". Depois do primeiro treino, volta o hero dourado normal.

**(f) Ajustar a meta** — `DrawerShell` a partir do hero: stepper simples 1–14, com a proposta do sistema indicada, e opção de voltar ao automático.

**(g) Sidebar** — em `src/app/(athlete)/athlete-sidebar.tsx`, pílula discreta `4/5` junto ao avatar. Só quando há box ativa e meta definida.

### 5. Notificação de check-in

> Puxada da fase 2 para aqui de propósito: hoje o atleta **não recebe absolutamente nada** quando o coach o marca. Sem este momento, a funcionalidade é só um número numa página que ninguém volta a abrir.

Em `checkInAthlete` (`src/lib/box/today-actions.ts`), quando `attended` passa a `true`:

- Inserir notificação `consistency_checkin`, **uma única vez por `booking`** — se já existe uma para aquela booking, não voltar a inserir. Uma correção do coach não pode re-notificar.
- O título nomeia **o dia da aula**, nunca "hoje": *"Presença de terça registada"*. Se o coach marcar à sexta a presença de terça, a mensagem tem de dizer terça. Deriva o dia de `classes.starts_at`, não de `now()`.
- Corpo: *"4.º treino da semana — 1 acima do ritmo"*, ou só a contagem quando não há meta.
- Não bloqueies nem falhes o check-in se a notificação falhar — o check-in é a operação principal.

---

## Casos-limite a respeitar

| Caso | Comportamento |
|---|---|
| Check-in tardio | Conta no dia da aula. Semanas já fechadas **recalculam** |
| Coach desmarca por engano | Contagens descem. Um recorde já atribuído **mantém-se** |
| Aulas do dia todas canceladas | Dia `closed`, não conta como falha |
| Duas aulas no mesmo dia | 2 sessões; um único ponto, marcado como duplo |
| Atleta suspenso | Sem meta e sem ritmo; contagens preservadas |
| Removido e re-convidado | `membership_periods` dá a lacuna; o recorde histórico mantém-se |
| Drop-ins e trials | Não contam |
| Primeiro mês do atleta | Só a contagem, sem recorde |
| Box encerrada | Congela no valor final, sem erros na UI |
| Sem box ativa | `getAthleteConsistency` não é chamada; nada quebra |

---

## Limpeza final — obrigatória

Antes de dares o trabalho por terminado, **varre o que criaste durante o desenvolvimento**:

- Nenhum dado de exemplo, seed ou constante `MOCK_*` / `FAKE_*` / `SAMPLE_*` em `src/`.
- Nenhuma rota, página ou componente de demonstração (`/athlete/mock-*`, `*-demo.tsx`, `*-playground.tsx`).
- Nenhum `console.log`, `console.debug` ou `debugger` que tenhas acrescentado.
- Nenhuma flag temporária, `if (true)`, valor hardcoded para forçar um estado, nem código comentado "para testar".
- Nenhum ficheiro solto em `/tmp`, na raiz do repo ou em `src/` que não seja entregável.
- Confirma com `git status` que **só** aparecem os ficheiros que fazem parte da entrega, e percorre o `git diff` inteiro à procura de restos.

O que **não** se apaga: `docs/mocks/consistency.html` e `docs/CONSISTENCY_FLOW.md` são documentação.

---

## Regras de execução

- Corre `npx tsc --noEmit` **e** `npx next build` no fim; ambos têm de passar limpos.
- Verifica a funcionalidade no browser, não só a compilação.
- Não faças commit.
- O SQL da migração é escrito, não aplicado — o utilizador aplica-o à mão no dashboard Supabase. **Não corras nada destrutivo contra dados reais.**
- No fim, resume: o que ficou implementado, o que precisa de ser aplicado à mão (a migração `00047`), e o que ficou de fora (marcos, escudos, vista de staff, streak coletiva e a função SQL da fase 3).
