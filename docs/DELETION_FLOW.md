# Exclusão de conta e encerramento de box — fluxo fechado

> Decidido com o Thiago em 2026-07-31. Este documento é a especificação a implementar;
> qualquer desvio deve ser discutido antes de codificar.

## Princípio geral

**Nada é apagado fisicamente da base de dados.** Exclusão = *tombstone* (`deleted_at`) +
anonimização dos dados pessoais. Consequência técnica importante: como nunca corre um
`DELETE` em `boxes` nem em `profiles`, os `on delete cascade` de `wod_results.box_id`,
`prs.box_id` e `gamification_*` **nunca disparam** — não é preciso reescrever FKs.
O trabalho é de estado + filtros, não de schema destrutivo.

Duas entidades, dois fluxos distintos:
- **Conta** (`profiles`) — pedida pelo próprio; RGPD; anonimiza dados pessoais.
- **Box** (`boxes`) — pedida pelo owner; nunca é excluída na prática, apenas encerrada.

---

## A. Exclusão de conta

### Pré-condições (bloqueiam o pedido)
- Não pode ser `owner` de nenhuma box não encerrada → tem de transferir a propriedade
  ou encerrar a box primeiro. O ecrã mostra a lista de boxes em causa com link direto.

### Passo 1 — Pedido (self-service, Perfil → Definições → Apagar conta)
- Confirmação por escrita do próprio email (não basta clicar).
- `profiles.deleted_at = now()` (a data de purga é `deleted_at + 30 dias`).
- Memberships passam a `inactive`, guardando o estado anterior em
  `memberships.status_before_deletion`.
- Reservas futuras canceladas — liberta vagas e promove a waitlist (lógica já existente).
- Sessão terminada. O login continua a funcionar mas cai numa página
  "Conta agendada para exclusão — Recuperar", no padrão da `athlete/suspended` já existente.

### Passo 2 — Janela de 30 dias (reversível pelo próprio)
- Botão "Recuperar conta" limpa `deleted_at`.
- As memberships desativadas por este fluxo são restauradas para
  `status_before_deletion`, **exceto** as que a box tenha alterado entretanto
  (nesse caso vence a decisão da box).

### Passo 3 — Purga (job ao fim dos 30 dias)
Anonimiza `profiles`, mantendo a linha:
- `full_name` → "Atleta removido"; `nickname`, `phone`, `birth_date`, `avatar_url`,
  `tax_id`, `nationality`, `height_cm`, `professional_id`, `specialty`,
  `training_institution`, contacto de emergência → `null`.
- `email` → `deleted-<uuid>@zekko.invalid` (a coluna é `unique not null`).
- Avatar removido do storage.
- `notifications` e `notification_preferences` do utilizador apagadas (dados pessoais,
  sem valor histórico).

**Mantém-se** (agora apontando para um perfil anónimo): `wod_results`, `prs`, `bookings`,
`payments`, `orders`, `drop_ins`, `gamification_*`.

**`auth.users`:** apagado via service role (`src/lib/supabase/admin.ts`) para o login
desaparecer. ⚠️ `profiles.id references auth.users(id) on delete cascade` faria isto
cascatear para `profiles` e rebentar nos FKs `restrict` (`wods.created_by`,
`events.created_by`, `orders`, `drop_ins`, `payments`). **É preciso remover esse cascade**
(migração) para o perfil anónimo sobreviver ao delete do auth user.
Esta é a única alteração de FK que o fluxo exige.

---

## B. Encerramento de box

Terminologia na UI: **"Encerrar box"**, nunca "apagar" — reflete o que acontece.

### Pré-condições
- Só o `owner` (nem manager nem partner) — bloqueia.
- Sem memberships `active` ou `trial` além do owner — **guarda no server action**, não
  barreira de UI: o próprio wizard de encerramento satisfá-la (ver "Wind-down" abaixo).
  A verificação mantém-se no servidor como defesa contra chamada direta à API.

### Avisos (não bloqueiam, mas são mostrados na confirmação)
- Pagamentos `pending` em aberto.
- Aulas futuras com reservas confirmadas.

### Ponto de entrada (decidido 2026-07-31)

O owner clica em "Encerrar box" nas definições e cai primeiro num **ecrã de aviso**, não
no wizard. Esse ecrã diz quantos membros ativos existem e dá dois caminhos:
- **"Avançar"** → wizard de encerramento.
- **"Ir para Membros"** → área de membros, para dupla verificação ou desassociação manual.

O aviso é explícito, e esta frase é obrigatória: **no wizard todos os membros são
desassociados, sem possibilidade de escolher atletas**. Quem quiser tratar caso a caso
faz isso na área de Membros, antes de avançar.

### Wind-down em massa + comunicado (decidido 2026-07-31)

O owner não remove membros à mão. O wizard de encerramento inclui:
- **"Desassociar todos os membros" (N membros)** — ação em massa, sem seleção individual.
- **Comunicado**, com textarea opcional (~500 caracteres). Vazio → texto padrão.
- **Preview** da notificação que o atleta vai receber, antes de confirmar.

**Nada executa até ao confirmar final.** Desassociar e comunicar são passos do wizard,
aplicados numa transação com o encerramento — nunca ações imediatas isoladas. Um owner
que desassocie 200 pessoas e depois desista ficaria com a box vazia e as notificações
já entregues.

**Notificação in-app apenas — sem email nesta fase.** Isto elimina o problema de envio em
lote (o `sendEmailNotification` faz um `await` por destinatário, em série, e rebentaria
com timeout numa box grande). As notificações in-app entram num único `insert` com array
de linhas, não num loop.

A mensagem é guardada em `boxes.closure_message`, não apenas enviada: alimenta o
**tooltip do badge "Box encerrada"** que o atleta vê no histórico e em "Minhas Boxes".

⚠️ **A mensagem é texto, nunca HTML.** Renderizar sempre como texto no React (que já
escapa), nunca com `dangerouslySetInnerHTML`. Se um dia o comunicado passar a ir por
email, escapar antes de interpolar — o `sendEmailNotification` injeta texto livre direto
no template (o `reason` de `notifyClassCancelled` já vai cru).

### Fluxo
1. Owner passa pelo ecrã de aviso, abre o wizard, revê os avisos, escreve o comunicado
   (ou aceita o padrão) e confirma escrevendo o nome da box.
2. `boxes.deleted_at = now()` (+ `closed_by`, `closure_reason`, `closure_message`).
3. Memberships → `inactive` (guardando `status_before_closure`); aulas futuras
   canceladas, disparando as notificações `class_cancelled` já existentes; convites e
   trials pendentes cancelados.
4. **Notificação `box_closed`** (novo tipo na constraint de `notifications`), **in-app
   apenas**, para todos os que alguma vez tiveram membership nesta box, qualquer que seja
   o status — num único insert em massa, com o comunicado do owner no `body`.
5. A box sai de: listagem pública, discovery, entrada por token, `/dropin/[slug]`, sidebar
   staff. No atleta aparece em "Minhas Boxes" como **encerrada** (cinza, sem ações).
6. Resultados, PRs, pagamentos e histórico financeiro **mantêm-se**, com badge
   "Box encerrada" onde forem mostrados — o tooltip do badge mostra o `closure_message`.

### Trabalho transversal
Todas as queries e políticas RLS que listam boxes passam a filtrar `deleted_at is null`.
É a maior fatia do esforço — vale a pena um helper único em vez de espalhar o filtro.

---

## C. Reabertura de uma box (resposta à pergunta do Thiago)

Como a linha nunca é apagada, **reabrir é sempre tecnicamente possível**. O que muda com o
tempo é quem pode fazê-lo e o que volta atrás sozinho.

### 0–30 dias — self-service
O owner faz login, vê um banner "Box encerrada — reabrir", e um clique limpa `deleted_at`.
O slug fica reservado durante esta janela, portanto as URLs antigas voltam a funcionar.
As memberships desativadas pelo encerramento são restauradas para `status_before_closure`.

### Depois dos 30 dias — por pedido ao suporte
Deixa de ser self-service, mas o `update boxes set deleted_at = null` continua a funcionar.
O que **não** volta automaticamente:
- **Slug** — ao fim dos 30 dias o slug é libertado (renomeado para `<slug>-closed-<6>`),
  para não acumular nomes bons bloqueados por boxes mortas. Se entretanto ninguém o tiver
  ocupado, devolvemos o original; se tiver, a box reabre com slug novo e as URLs antigas quebram.
- **Membros** — não são restaurados em massa; voltam a entrar por convite ou token.
- **Aulas canceladas** — nunca voltam (foram canceladas e os atletas notificados).

### Ponto de não retorno
Não existe para a box. O único dado irrecuperável é o de contas de atletas que,
entretanto, tenham sido anonimizadas pelo seu próprio fluxo de exclusão de conta.

---

## D. Migração necessária (`00044_deletion_flow.sql`)

- `profiles.deleted_at timestamptz` + índice parcial.
- `boxes.deleted_at timestamptz`, `closed_by uuid`, `closure_reason text`,
  `closure_message text` + índice parcial.
- `memberships.status_before_deletion` e `status_before_closure`
  (ou uma única coluna `status_before` + `status_before_source`).
- Remover o `on delete cascade` de `profiles.id → auth.users(id)`.
- Adicionar `box_closed` (e `account_deleted`, se quisermos confirmar ao próprio) à
  constraint de tipos de `notifications`.
- Rever as políticas RLS que expõem boxes para excluir `deleted_at is not null`.
