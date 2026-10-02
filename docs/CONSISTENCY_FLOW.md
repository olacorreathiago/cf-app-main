# Consistência — especificação

Primeira funcionalidade de gamificação. Substitui a proposta de *daily streak*
(`STREAK_FLOW.md`, descartada): dias de calendário seguidos quebravam ao primeiro
domingo e puniam o atleta constante, que é precisamente o cliente ideal da box.

Estado: **proposta** — decisões abertas no fim.

---

## 1. O princípio: recorde, não quota

Uma meta que só sobe acaba sempre por falhar. Se a meta do mês é o mês anterior,
12 → 14 → 16 → 18 e mais cedo ou mais tarde toda a gente falha para sempre; o mês
excecional passa a ser o castigo do mês seguinte.

Um **recorde** não tem esse problema. Ninguém se sente falhado por não bater o PR de
agachamento este mês — não bater um recorde não é falhar, não bater uma meta é. É a
mesma linguagem que o atleta já fala nos Records, e resolve a roquete sem
configuração nenhuma.

Duas cadências, com papéis diferentes:

| | Papel | Mecânica |
|---|---|---|
| **Semana** | O gancho vivo — é o que faz voltar | Meta proposta pelo sistema, ajustável, com indicador de ritmo |
| **Mês** | A história — é o que dá orgulho | Recorde pessoal. Ou se bate ou não; **não existe falhar** |

O **anual fica de fora**: demasiado abstrato para motivar e o primeiro a ser
abandonado.

---

## 2. A métrica: presença

| | |
|---|---|
| O que conta | `bookings.attended = true` |
| Quem marca | O **coach** ([`checkInAthlete`](../src/lib/box/today-actions.ts)) |
| Dia atribuído | Dia de `classes.starts_at` (hora local, via [`localDayIso`](../src/lib/time.ts)) |
| Unidade | **Sessão.** Duas aulas no mesmo dia contam 2 |

**Porque não `wod_results`.** O `statsWodsThisMonth` de hoje conta resultados
registados, não treinos feitos: quem treina e não regista score — dias de força,
técnica, mobilidade — desaparece da contagem. Como métrica de consistência isso é
simplesmente errado.

**Porque a presença aguenta ser a espinha da gamificação.** É a única métrica do
produto que o atleta não consegue inflacionar sozinho — só o coach a marca. Nenhuma
outra serve para isto.

A consistência é de **presença, não de resultado**: `logged_late` num `wod_result`
não lhe toca. E é sempre **por box** (`user_id` + `box_id`), como os pontos e os badges.

---

## 3. Semana — a meta viva

- **Início à segunda-feira.**
- **Meta proposta pelo sistema:** média das últimas 4 semanas completas, arredondada,
  limitada a [1, 14]. Toda a gente tem meta ao dia zero, sem configurar nada.
- **O atleta pode substituí-la.** Fica guardada até ele a mudar; deixa de ser
  recalculada a partir daí. É aqui que entra a posse da opção 2 — quem quiser é dono
  da sua meta, quem não quiser nunca dá por ela.
- **Antes de 2 semanas completas** não há meta: mostra-se só a contagem.
- **Ritmo:** compara o feito com o esperado a esta altura da semana, medido em **dias
  de operação da box** (dia com pelo menos uma aula não cancelada) e não em dias de
  calendário — senão um domingo fechado faz parecer que se está atrasado.
  Só aparece a partir do 2.º dia da semana; à segunda-feira não há ritmo nenhum a
  mostrar.
  - `≥ +1` → *"acima do ritmo"* (accent)
  - `−1 … +1` → *"no ritmo"*
  - `≤ −1` → *"faltam N para a meta"* — enquadrado como o que falta, nunca como falha
- **Fim de semana sem meta cumprida não tem estado de erro.** "4 de 5" e nada de
  vermelho. A semana reinicia à segunda: uma semana má custa 7 dias, não um mês —
  é isto que evita o *mês morto* que um medidor mensal sozinho criaria.

---

## 4. Mês — o recorde

- Sessões no mês (local da box).
- **Recorde pessoal** = melhor mês de sempre nesta box.
- Barra de progresso até ao recorde. Quando passa: celebração + novo recorde gravado.
- **Não há meta e não há falhar.** Não bater o recorde é o estado normal — acontece
  quase todos os meses, por definição.
- **Primeiro mês:** só a contagem, sem recorde (não há termo de comparação). Foi a
  intuição original e está certa.
- Meses parciais (atleta entrou a 20) contam como qualquer outro: se o recorde for
  4 sessões porque só treinou 10 dias, o recorde é 4 e bate-se facilmente no mês
  seguinte. Isso é uma boa primeira experiência, não um defeito.

---

## 5. Correções e check-in tardio

A presença é marcada por uma pessoa, portanto **vai ser marcada tarde e vai ser
marcada mal**. O `checkInAthlete` não tem hoje qualquer restrição de data — a página
Hoje é que só mostra as aulas do dia. Um coach que marque na sexta a presença de
terça tem de deixar a aplicação num estado correto, não num estado remendado.

**Regra central: tudo é derivado, nada é congelado — mas as celebrações não se revogam.**

| Situação | Comportamento |
|---|---|
| Coach marca à sexta a presença de terça | Conta no **dia da aula** (terça) e na semana da terça, não no dia em que foi marcada |
| Isso reabre uma semana já fechada | A semana **recalcula**. Pode passar de "4 de 5" para "5 de 5" dias depois. Melhor uma verdade tardia do que uma mentira permanente |
| Isso cria um recorde mensal retroativo | O recorde é atribuído **nesse momento**. Mais vale tarde |
| Coach desmarca uma presença por engano | As contagens **descem**. Também é a verdade |
| ...mas um recorde já celebrado | **Mantém-se.** Retirar uma celebração já entregue sabe a castigo, e o custo de um recorde a mais é nenhum |
| Notificação de presença | Nomeia **o dia da aula** ("presença de terça registada"), nunca "hoje" — senão a mensagem mente no caso tardio |
| Re-notificação | A notificação é atada à `booking` e enviada **uma vez**. Uma correção não volta a notificar |

**Consequência técnica: sem cache e sem cron.** Um contador semanal em cache teria de
ser invalidado a cada escrita de presença e ficaria silenciosamente errado no
primeiro check-in tardio. Calculado à leitura, corrige-se sozinho — o requisito do
check-in tardio resolve-se *sem código nenhum*, porque não há estado derivado para
consertar. É a mesma conclusão a que a proposta anterior tinha chegado, agora por uma
segunda razão independente.

---

## 6. Dados

**Uma função SQL `get_athlete_consistency(p_user_id, p_box_id)`** devolve contagem da
semana, meta, ritmo, contagem do mês e recorde, calculados a partir de `bookings` +
`classes`. À escala de uma box (~150 presenças por atleta por ano) o custo é
irrelevante.

Guarda-se apenas o que **não se deriva**:

```sql
-- 00047_consistency.sql

-- Só a meta que o atleta escolheu à mão. Sem linha = meta proposta pelo sistema.
create table public.athlete_weekly_goals (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  box_id        uuid not null references public.boxes(id) on delete cascade,
  weekly_target int  not null check (weekly_target between 1 and 14),
  updated_at    timestamptz not null default now(),
  primary key (user_id, box_id)
);

-- O recorde é atribuído uma vez e nunca revogado (ver secção 5), por isso
-- não pode ser derivado — ao contrário de tudo o resto.
create table public.athlete_monthly_records (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  box_id        uuid not null references public.boxes(id) on delete cascade,
  best_sessions int  not null check (best_sessions > 0),
  best_year     int  not null,
  best_month    int  not null check (best_month between 1 and 12),
  achieved_at   timestamptz not null default now(),
  primary key (user_id, box_id)
);
```

Marcos (10 / 25 / 50 / 100 sessões na box) vão para `gamification_badges` — tabela que
**já existe, com RLS, e nunca foi usada**. `gamification_points` fica para o sistema de
pontos do leaderboard, que vem a seguir.

---

## 7. Casos-limite

| Caso | Comportamento |
|---|---|
| Box sem aulas nesse dia (domingo, feriado) | Não é dia de operação — não entra no cálculo do ritmo |
| Aulas do dia canceladas pela box | Idem: a falha não é do atleta |
| Duas aulas no mesmo dia | Contam **2 sessões**; na fila de 7 dias o dia aparece marcado uma vez, com indicador de duplo |
| Atleta suspenso / em pausa | Sem meta e sem ritmo enquanto estiver suspenso; contagens preservadas |
| Removido e re-convidado | `membership_periods` já dá a lacuna; o recorde histórico mantém-se |
| Drop-ins e trials | **Não contam** — não há membership, e a métrica é por box |
| Reserva sem check-in | Não conta. Falta é falta |
| Box encerrada | Congela no valor final; histórico com o badge "box encerrada" |
| Fuso horário | [`src/lib/time.ts`](../src/lib/time.ts), já em uso |

---

## 8. Faseamento

**Fase 1 — o núcleo.** Função SQL + `athlete_weekly_goals` + card semanal no hero do
dashboard + card do recorde mensal + número na sidebar. Entregável e completo por si.

**Fase 2 — o vício.** Notificação de presença no check-in (o momento de payoff: hoje o
atleta não recebe absolutamente nada quando o coach o marca), marcos em
`gamification_badges`, heatmap de 12 semanas no perfil.

**Fase 3 — o negócio.** "Atletas abaixo do ritmo" para o staff com empurrão a um
clique — uma quebra de consistência é o melhor sinal precoce de abandono que uma box
tem, e hoje só se descobre quando a mensalidade falha. Mais a temperatura coletiva da
box.

---

## 9. Decisões em aberto

1. **Duas aulas no mesmo dia contam 2** — recomendo sim (quem faz duplo treina mais).
2. **Semana começa à segunda-feira** — assumido.
3. **Meta proposta = média das últimas 4 semanas**, limitada a [1, 14] — confirmar o teto.
4. **Marcos** (10/25/50/100 sessões) entram já na fase 1 ou ficam para a 2?
