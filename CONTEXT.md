# CONTEXT.md — CrossFit Box Management App
> Ficheiro de referência para o Claude Code. Lê este ficheiro no início de cada sessão.
> Última actualização: 2026-06-20 (celebração PR + leaderboard gender split + convites Resend)

---

## 1. Visão do Produto

Plataforma web-first (PWA) para gestão de boxes de CrossFit no mercado português e lusófono. Serve dois públicos com experiências separadas mas interligadas:

- **Atletas** — acompanhar evolução, marcar aulas, participar na comunidade
- **Gestores / Coaches** — operar o negócio com clareza e eficiência

**Mercado primário**: Portugal (faturação AT obrigatória, SEPA, PT-PT)
**Expansão planeada**: Brasil (PT-BR), depois EN/ES

**Competição principal em PT**: RegiBox (líder com ~100 boxes, fundado 2017, interface desatualizada)
**Diferenciadores chave**: UX moderna, experiência de atleta rica, radar de retenção, coach view, faturação AT integrada

---

## 2. Estado Atual do Projeto

### Fase 0 — Fundações ✅
- [x] CONTEXT.md actualizado com decisões de produto
- [x] Migrations SQL completas com RLS
- [x] Refactor da estrutura de pastas (route groups)
- [x] shadcn/ui instalado e configurado

### Fase 1 — Auth e Onboarding ✅
- [x] Magic link + Google OAuth
- [x] Callback route `/api/auth/callback`
- [x] Middleware de protecção de rotas
- [x] Onboarding por role (atleta / profissional)
- [x] Aprovação manual de profissionais (`/waiting-approval`)
- [x] Dashboard inicial (atleta e profissional)
- [x] Criação de box por profissional aprovado (`/dashboard/create-box`)
- [x] Box dashboard em `/box/[slug]` com visão geral, membros, definições
- [x] Gestão de membros: suspender, reativar, remover
- [x] Sistema de convites: link partilhável + drawer inline em membros
- [x] Aceitar convite via link (`/invite?token=`)

### Fase 2 — Core MVP (em curso)
- [ ] Gestão de membros e planos (planos de mensalidade)
- [x] Definições da box (`/box/[slug]/settings`) — info + modalidades + configurações operacionais
- [x] Agenda semanal (`/box/[slug]/schedule`) — CRUD de class_templates, vista semanal (grid Mon–Dom)
- [x] Gestão diária de aulas (`/box/[slug]/classes`) — slots automáticos por template, publicar, cancelar, aulas especiais, publicar em bulk
- [x] WODs: builder + publicação + associação a aulas
  - [x] Migration 00004: enums (wod_type, wod_category, score_type), benchmark_wods (seed 30+ WODs), RLS em wods/wod_results/prs
  - [x] Migration 00005: classes.wod_ids uuid[] (suporta múltiplos blocos por aula)
  - [x] Migration 00010: wod_results.class_id + wod_id nullable (abordagem genérica, entretanto substituída)
  - [x] Migration 00011: função SECURITY DEFINER `get_attended_class_wods(uuid[])` — bypassa RLS para atletas verem WODs de aulas passadas
  - [x] Migration 00012: wods.score_type, result_sets, result_reps_per_set; wod_results.sets_data, dnf
  - [x] Migration 00013: score_type enum com round-best, round-total, round-worst
  - [x] Migration 00014: wods.is_benchmark boolean — só WODs marcados como benchmark rastreiam PRs; benchmark_slug preenchido auto-liga is_benchmark
  - [x] `/box/[slug]/wods` — lista com filtros (título, tipo, categoria, data), drawer de criação/edição com picker de benchmarks, publicar/despublicar, duplicar
  - [x] Botão "WOD do dia" activado — picker multi-select por modalidade × dia, propaga a todos os slots
  - [x] WOD drawer: score_type selector (tempo, reps, peso, rondas+reps, distância, melhor/pior/total de rondas); campo result_sets para For Load e score types baseados em rondas; result_reps_per_set; scheduled_for opcional
- [x] Registo de resultados de WOD (atleta)
  - [x] Atleta vê WOD apenas após participar na aula (por reserva ou adicionado pelo coach)
  - [x] Função SECURITY DEFINER bypassa RLS de wods publicados para aulas participadas
  - [x] Page `/athlete/classes` com navegador semanal — "Já participei" + aulas futuras
  - [x] ClassCard com showDate, opacidade correcta (aula em curso não fica opaca), shortScore na tag
  - [x] WodResultDrawer com tabs (Registar resultado / Detalhes)
    - AMRAP → rondas + reps parciais
    - For Time → mm:ss + DNF toggle (+ reps se DNF)
    - For Load → N sets fixos (definidos pelo manager) × reps × peso; unidade kg/lb
    - EMOM → N linhas (time_cap_minutes) com reps por minuto
    - round-best/worst/total → N linhas (result_sets) com tempo por ronda; resultado = melhor/pior/soma
    - Custom → switch no score_type do WOD
  - [x] Resultado persistido: banner com score ao reabrir drawer; botão "Atualizar" expande formulário
  - [x] score_display guardado como valor curto (sem detalhe de rondas); detalhe em sets_data
  - [x] PR automático ao guardar resultado (apenas WODs com is_benchmark=true, score types time/reps/weight, sem DNF)
- [x] Badge de PR no resultado — badge âmbar "PR" no WodCard e banner âmbar "🏆 Personal Record" na WodResultDrawer
- [x] Dashboard do atleta — completo:
  - Layout 2 colunas desktop (left: aulas + WODs, right: stat cards + comunidade)
  - Aulas de hoje: só aulas com reserva confirmada; wods populados via fetchWodsForClasses; noFade=true
  - WOD do dia: só WODs de aulas em que o atleta está inscrito
  - Próximas aulas: só aulas onde está inscrito (confirmed/waitlist); ClassCard completo com showDate + noFade
  - Coluna direita: hero card "WODs este mês", 2 cards médios (total PRs / PRs 2 semanas), lista PRs recentes, recados da box (mock)
  - PRs recentes: últimas 2 semanas
  - ClassCard: prop noFade para suprimir opacity-40 (só dashboard)
- [x] WOD builder — toggle "É um benchmark?" (âmbar, auto-liga com benchmark_slug)
- [x] Perfil do atleta — foto, dados pessoais, informação pessoal (histórico e PRs ficam em páginas próprias)
- [x] Página Resultados `/athlete/results` — calendário mensal com dias destacados, detalhe de WODs por dia, registo inline via WodResultDrawer
- [x] Página PRs `/athlete/prs` — tabs por categoria, grelha de PR cards (nome + valor grande + RX/Scaled + data), secção "Por tentar" colapsável, drawer de histórico por benchmark
- [x] PRs globais (benchmark_slug) viajam com o atleta (box_id NULL); PRs box-custom ficam na box (box_id set)
- [x] Migration 00015: prs.rx boolean + profiles.leaderboard_visible boolean + unique index prs(user,box,movement,unit,rx)
- [x] Migration 00016: prs.box_id nullable, prs.benchmark_slug, dois índices parciais únicos
- [x] Migration 00017: benchmark_wods seed expandido
- [x] Migration 00018: RLS fix — prs_insert_own agora permite box_id IS NULL (PRs globais)
- [x] Migration 00019: wod_results.class_id uuid FK classes (sessions scoped results)
- [x] PRs globais (benchmark_slug) — box_id NULL, viajam com o atleta entre boxes
- [x] updateWodResult — action server dedicada; verifica ownership, atualiza resultado, avalia PR
- [x] evaluatePR — helper partilhado entre recordWodResult e updateWodResult; achieved_at usa class.starts_at
- [x] Scoped results — class_id em wod_results evita que o mesmo WOD em dois dias diferentes colida
- [x] Benchmarks globais sempre visíveis em /athlete/prs (não dependem de a box ter publicado o WOD)
- [x] Toggle "É benchmark" bloqueado no WOD drawer quando benchmark_slug preenchido (badge âmbar em vez de toggle)
- [x] PRs page refactored: tabs (Todos/Com PR/Por tentar), search bar, chips de categoria, lista full-width
- [x] Histórico de PR: mostra class date (starts_at) em vez de recorded_at
- [x] Rotas mortas eliminadas: athlete-classes, athlete-profile, athlete-wods, manager-classes, manager-members, manager-settings, manager-wods
- [x] Página Leaderboard `/athlete/leaderboard` — tabs Benchmarks (ranking por WOD) e Diário (resultados do dia)
- [x] Navegação mobile — Home / Aulas / Leaderboard / ☰ (hamburger drawer com Resultados, PRs, Perfil, Eventos)
- [x] Leaderboard — split por género (profiles.gender via migration 00020); stats card "Atletas com resultado"; tabs Todos/Homens/Mulheres no daily tab
- [x] Celebração de PR — canvas-confetti + banner âmbar "🏆 Novo Personal Record!" dentro do drawer (2.5s antes de fechar)
- [x] Badge de PR no result card — badge âmbar "PR" já estava implementado no results-calendar.tsx
- [x] Convites por email via Resend — `createEmailInvite` envia email real se RESEND_API_KEY presente; fallback silencioso; mensagem no drawer indica se email foi entregue
- [ ] Gestão de membros e planos — planos de mensalidade, associar plano a membro
- [ ] Recados da box — tabela real (substituir mock do dashboard)

### O que está por fazer
Ver Roadmap na secção 11.

---

## 3. Stack Tecnológica

### Frontend
```
Framework:     Next.js 14+ (App Router)
Styling:       Tailwind CSS v4
Components:    shadcn/ui
Forms:         React Hook Form + Zod
Data fetching: TanStack Query (React Query)
State:         Zustand (estado local/UI leve — ex: wizard de onboarding)
i18n:          next-intl (PT default, EN suportado; detecta browser, alterável nas definições)
PWA:           next-pwa
```

### Backend
```
Platform:      Supabase (região EU — Frankfurt)
Database:      PostgreSQL
Auth:          Supabase Auth — Magic Link (OTP por email) + Google OAuth
               SEM autenticação por password
Storage:       Supabase Storage (avatares, waivers, imagens)
Realtime:      Supabase Realtime (leaderboard, check-ins)
Functions:     Supabase Edge Functions (Deno)
Security:      Row Level Security (RLS) — isolamento por box_id
```

### Hosting & Serviços
```
Hosting:       Vercel (deploy automático, edge network)
Pagamentos:    Stripe (+ SEPA Direto) / Easypay (MB WAY, Multibanco)
Faturação AT:  InvoiceXpress API (OBRIGATÓRIO em PT para transações com valor fiscal)
Email:         Resend
Push/SMS:      OneSignal
Mapas:         Mapbox (ou Leaflet + OpenStreetMap)
Analytics:     Posthog
Monitoring:    Sentry
```

### Convenções de código
```
Linguagem:         TypeScript (strict mode — sem 'any')
Componentes:       Functional components + hooks
Estilo de nomes:   camelCase para variáveis/funções, PascalCase para componentes
Ficheiros:         kebab-case (ex: wod-result-card.tsx)
Validação:         Zod schemas partilhados entre frontend e backend (em /schemas)
Testes:            Vitest + Testing Library (quando aplicável)
Idioma do código:  Inglês (variáveis, funções, comentários)
Idioma da UI:      PT e EN via next-intl
```

---

## 4. Estrutura de Pastas (Target)

```
/
├── src/
│   ├── app/
│   │   ├── (auth)/                       # Rotas públicas — sem layout de app
│   │   │   ├── login/
│   │   │   └── onboarding/
│   │   │       ├── role/                 # Escolha: Atleta ou Profissional
│   │   │       ├── athlete/              # Steps do onboarding de atleta
│   │   │       └── professional/         # Steps do onboarding de profissional
│   │   ├── (athlete)/                    # Rotas do atleta — layout próprio
│   │   │   ├── dashboard/
│   │   │   ├── classes/
│   │   │   ├── wods/
│   │   │   ├── profile/
│   │   │   ├── events/
│   │   │   ├── store/
│   │   │   └── drop-in/
│   │   ├── (manager)/                    # Rotas do gestor — layout próprio
│   │   │   ├── dashboard/
│   │   │   ├── members/
│   │   │   ├── classes/
│   │   │   ├── wods/
│   │   │   ├── events/
│   │   │   ├── finances/
│   │   │   ├── coach-view/
│   │   │   ├── trials/
│   │   │   ├── store/
│   │   │   └── settings/
│   │   ├── (public)/                     # Páginas públicas — SEO
│   │   │   ├── boxes/
│   │   │   └── [box-slug]/
│   │   └── api/
│   │       ├── auth/
│   │       │   └── callback/             # Supabase OAuth callback
│   │       ├── invites/                  # Criar / validar / aceitar convites
│   │       └── webhooks/
│   │           ├── stripe/
│   │           └── invoicexpress/
│   ├── components/
│   │   ├── ui/                           # shadcn/ui base components
│   │   ├── auth/                         # Login, magic link form
│   │   ├── athlete/                      # Componentes específicos do atleta
│   │   ├── manager/                      # Componentes específicos do gestor
│   │   ├── shared/                       # Componentes partilhados
│   │   └── layouts/                      # Layouts reutilizáveis
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                 # Browser client
│   │   │   ├── server.ts                 # Server client (RSC / Route Handlers)
│   │   │   └── admin.ts                  # Service role — só em server-side
│   │   ├── auth/
│   │   │   └── actions.ts                # signInWithOtp, signInWithGoogle, signOut
│   │   ├── invites/
│   │   │   └── actions.ts                # createInvite, validateInvite, acceptInvite
│   │   ├── stripe/
│   │   ├── invoicexpress/
│   │   └── utils/
│   ├── hooks/                            # Custom React hooks
│   ├── schemas/                          # Zod schemas partilhados
│   ├── stores/                           # Zustand stores
│   │   └── onboarding-store.ts           # Estado do wizard de onboarding
│   └── types/                            # TypeScript types globais
├── supabase/
│   ├── migrations/                       # SQL migrations (numeradas)
│   ├── functions/                        # Edge functions
│   └── seed.sql
└── CONTEXT.md
```

---

## 5. Modelo de Utilizador e Roles

### Princípio fundamental
**Um único utilizador (login único) pode ter múltiplos contextos simultâneos:**
- Ser atleta em N boxes
- Ser owner/manager/coach da sua própria box
- A app troca de contexto — não há contas separadas

### Roles (por membership, não globais)

| Role | Descrição |
|------|-----------|
| `super_admin` | Equipa da plataforma — acesso total a tudo |
| `owner` | Criou a box, controlo total incluindo billing |
| `partner` | Sócio da box — acesso total exceto billing da plataforma; **obrigatoriamente tem perfil profissional** |
| `manager` | Gestor convidado — acesso operacional |
| `coach` | Acesso à coach view, programação de WODs, gestão de aulas |
| `athlete` | Membro da box — reservas, resultados, perfil |

### Tipo de perfil (global, não por box)

| Tipo | Descrição |
|------|-----------|
| `athlete` | Perfil de atleta — pode ser membro de várias boxes |
| `professional` | Perfil profissional — pode ser atleta E gerir a sua box |

Um utilizador com perfil `professional` tem automaticamente todas as capacidades de atleta.

---

## 6. Schema de Base de Dados

### Multi-tenancy
Cada box tem um `box_id`. O RLS do Supabase garante que cada box só vê os seus dados. Um atleta pode pertencer a múltiplas boxes (via `memberships`).

### Enums

```sql
profile_type:       'athlete' | 'professional'
approval_status:    'approved' | 'pending_approval' | 'rejected'
membership_role:    'owner' | 'partner' | 'manager' | 'coach' | 'athlete'
membership_status:  'active' | 'inactive' | 'suspended' | 'trial' | 'pending'
invite_status:      'pending' | 'accepted' | 'declined' | 'expired'
billing_interval:   'monthly' | 'annual'
class_status:       'draft' | 'scheduled' | 'cancelled'
booking_status:     'confirmed' | 'waitlist' | 'cancelled'
wod_type:           'AMRAP' | 'For Time' | 'For Load' | 'EMOM' | 'Tabata' | 'Custom'
wod_category:       'girls' | 'heroes' | 'notables' | 'games' | 'weightlifting' | 'original'
score_type:         'time' | 'reps' | 'weight' | 'rounds+reps' | 'distance' | 'round-best' | 'round-total' | 'round-worst'
event_status:       'pending' | 'confirmed' | 'cancelled'
order_status:       'pending' | 'paid' | 'fulfilled' | 'cancelled'
product_category:   'merch' | 'supplement' | 'equipment' | 'service'
equipment_status:   'ok' | 'damaged' | 'replace'
trial_status:       'scheduled' | 'completed' | 'converted' | 'lost'
drop_in_status:     'pending' | 'confirmed' | 'cancelled'
fulfillment_type:   'pickup' | 'delivery'
```

### Tabelas principais

```sql
-- Perfis de utilizador (1:1 com auth.users)
profiles (
  id uuid PK,                 -- mesmo id do Supabase Auth
  email text UNIQUE NOT NULL,
  full_name text,
  nickname text,
  avatar_url text,
  phone text,
  birth_date date,
  height_cm integer,          -- check: 80-260
  nationality text,
  tax_id text,                -- NIF
  language text DEFAULT 'pt', -- 'pt' | 'en'
  profile_type profile_type NOT NULL DEFAULT 'athlete',
  approval_status text NOT NULL DEFAULT 'approved', -- atletas: 'approved'; profissionais: 'pending_approval'
  professional_id text,               -- cédula profissional (obrigatório para profissionais)
  -- só relevante para profissionais:
  specialty text,
  training_institution text,
  -- legal:
  terms_accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
)

-- Boxes (tenants)
boxes (
  id uuid PK,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,      -- URL pública: /crossfit-porto
  address text,
  city text,
  country text DEFAULT 'PT',
  phone text,
  email text,
  website text,
  logo_url text,
  cover_url text,
  description text,
  approval_status text NOT NULL DEFAULT 'pending_approval', -- aprovação pela plataforma
  payments_enabled boolean DEFAULT false,  -- addon de pagamentos pela app
  drop_in_enabled boolean DEFAULT false,
  drop_in_price numeric,
  settings jsonb DEFAULT '{}',             -- configurações específicas da box
  created_at timestamptz DEFAULT now()
)

-- Membros de uma box (relação N:N profiles <-> boxes)
memberships (
  id uuid PK,
  user_id uuid FK profiles NOT NULL,
  box_id uuid FK boxes NOT NULL,
  role membership_role NOT NULL DEFAULT 'athlete',
  status membership_status NOT NULL DEFAULT 'pending',
  plan_id uuid FK plans,
  start_date date,
  end_date date,
  notes text,                     -- notas privadas (só gestores vêem)
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, box_id)
)

-- Convites de box para utilizadores
invites (
  id uuid PK,
  box_id uuid FK boxes NOT NULL,
  email text NOT NULL,
  role membership_role NOT NULL DEFAULT 'athlete',
  token text UNIQUE NOT NULL,     -- token único para o link de convite
  status invite_status NOT NULL DEFAULT 'pending',
  invited_by uuid FK profiles,    -- quem enviou o convite
  expires_at timestamptz NOT NULL,-- TTL: 7 dias
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
)

-- Planos de mensalidade por box
plans (
  id uuid PK,
  box_id uuid FK boxes NOT NULL,
  name text NOT NULL,             -- ex: "Unlimited", "3x semana"
  price numeric NOT NULL,
  billing_interval billing_interval NOT NULL DEFAULT 'monthly',
  classes_per_week int,           -- null = ilimitado
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
)

-- Templates de aulas recorrentes (horário semanal)
class_templates (
  id uuid PK,
  box_id uuid FK boxes NOT NULL,
  name text NOT NULL,             -- ex: "CrossFit", "Open Gym"
  weekday int NOT NULL,           -- 0=Dom … 6=Sáb
  start_time time NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  capacity int NOT NULL DEFAULT 20,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
)

-- Aulas
classes (
  id uuid PK,
  box_id uuid FK boxes NOT NULL,
  template_id uuid FK class_templates (nullable — null = aula especial),
  coach_id uuid FK profiles,
  name text NOT NULL,             -- ex: "CrossFit", "Open Gym", "Weightlifting"
  starts_at timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  capacity int NOT NULL DEFAULT 20,
  location text,
  notes text,
  wod_ids uuid[] DEFAULT '{}',    -- múltiplos blocos (ex: Strength + Conditioning)
  status class_status NOT NULL DEFAULT 'draft',
  cancellation_reason text,
  is_special boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
)

-- Reservas de aulas
bookings (
  id uuid PK,
  class_id uuid FK classes NOT NULL,
  user_id uuid FK profiles NOT NULL,
  status booking_status NOT NULL DEFAULT 'confirmed',
  checked_in_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (class_id, user_id)
)

-- Benchmark WOD library (platform-level, no box_id)
benchmark_wods (
  slug text PK,                   -- 'fran', 'murph', 'grace'
  name text NOT NULL,
  category wod_category NOT NULL,
  type wod_type NOT NULL,
  description text,
  movements jsonb DEFAULT '[]',
  time_cap_minutes int,
  created_at timestamptz DEFAULT now()
)

-- WODs
wods (
  id uuid PK,
  box_id uuid FK boxes NOT NULL,
  created_by uuid FK profiles NOT NULL,
  title text NOT NULL,
  type wod_type NOT NULL DEFAULT 'Custom',
  category wod_category NOT NULL DEFAULT 'original',
  score_type score_type NOT NULL DEFAULT 'reps',  -- como se regista o resultado
  benchmark_slug text FK benchmark_wods,  -- null se original
  description text,
  time_cap_minutes int,
  movements jsonb DEFAULT '[]',   -- [{ name, video_url, rx_weight, scaled_weight }]
  scaling_notes text,
  result_sets int,                -- nº de sets/rondas definido pelo manager (For Load, round-*)
  result_reps_per_set int,        -- reps por set sugeridas (For Load)
  published_at timestamptz,
  scheduled_for date,             -- opcional
  created_at timestamptz DEFAULT now()
)

-- Resultados de WODs
wod_results (
  id uuid PK,
  wod_id uuid FK wods NOT NULL,
  user_id uuid FK profiles NOT NULL,
  box_id uuid FK boxes NOT NULL,
  class_id uuid FK classes ON DELETE SET NULL, -- sessão à qual o resultado pertence
  score_type score_type NOT NULL,
  score_value numeric,
  score_display text,             -- valor curto: "12:34", "170 reps", "100 kg"
  rx boolean DEFAULT false,
  dnf boolean DEFAULT false,      -- Did Not Finish (For Time)
  sets_data jsonb,                -- detalhe por set/ronda: [{set,reps,weight}] ou [{round,reps}] etc.
  notes text,
  recorded_at timestamptz DEFAULT now()
)

-- PRs (Personal Records)
prs (
  id uuid PK,
  user_id uuid FK profiles NOT NULL,
  box_id uuid FK boxes,           -- NULL para benchmarks globais (viajam com o atleta)
  benchmark_slug text FK benchmark_wods, -- NULL para PRs box-custom
  movement text NOT NULL,         -- ex: "Fran" ou "Back Squat"
  value numeric NOT NULL,
  unit text NOT NULL,             -- 'kg' | 'lb' | 'seconds' | 'reps'
  rx boolean NOT NULL DEFAULT true,
  achieved_at timestamptz DEFAULT now(),
  wod_result_id uuid FK wod_results
  -- índice único parcial: (user_id, box_id, movement, unit, rx) WHERE benchmark_slug IS NULL
  -- índice único parcial: (user_id, benchmark_slug, unit, rx) WHERE box_id IS NULL
)

-- Eventos e competições
events (
  id uuid PK,
  box_id uuid FK boxes NOT NULL,
  created_by uuid FK profiles NOT NULL,
  name text NOT NULL,
  description text,
  date timestamptz NOT NULL,
  location text,
  capacity int,
  is_public boolean DEFAULT false,
  categories jsonb DEFAULT '[]',  -- [{ name, price, capacity, min_team, max_team }]
  cover_url text,
  registration_deadline timestamptz,
  published_at timestamptz,
  created_at timestamptz DEFAULT now()
)

-- Inscrições em eventos
event_registrations (
  id uuid PK,
  event_id uuid FK events NOT NULL,
  user_id uuid FK profiles NOT NULL,
  category text,
  team_name text,
  team_members jsonb DEFAULT '[]',
  status event_status NOT NULL DEFAULT 'pending',
  amount_paid numeric,
  waiver_signed_at timestamptz,
  created_at timestamptz DEFAULT now()
)

-- Produtos da loja
products (
  id uuid PK,
  box_id uuid FK boxes NOT NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  stock int,                      -- null = sem controlo de stock
  image_url text,
  category product_category NOT NULL DEFAULT 'merch',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
)

-- Encomendas
orders (
  id uuid PK,
  user_id uuid FK profiles NOT NULL,
  box_id uuid FK boxes NOT NULL,
  items jsonb NOT NULL DEFAULT '[]', -- [{ product_id, name, qty, unit_price }]
  total numeric NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  fulfillment fulfillment_type NOT NULL DEFAULT 'pickup',
  stripe_payment_intent_id text,
  invoice_id text,                -- id na InvoiceXpress
  created_at timestamptz DEFAULT now()
)

-- Drop-ins
drop_ins (
  id uuid PK,
  user_id uuid FK profiles NOT NULL,
  box_id uuid FK boxes NOT NULL,
  class_id uuid FK classes,
  date date NOT NULL,
  status drop_in_status NOT NULL DEFAULT 'pending',
  amount_paid numeric,
  waiver_signed_at timestamptz,
  stripe_payment_intent_id text,
  created_at timestamptz DEFAULT now()
)

-- Trials (prospetos)
trials (
  id uuid PK,
  box_id uuid FK boxes NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  scheduled_for timestamptz,
  class_id uuid FK classes,
  status trial_status NOT NULL DEFAULT 'scheduled',
  converted_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
)

-- Inventário de equipamento
equipment (
  id uuid PK,
  box_id uuid FK boxes NOT NULL,
  name text NOT NULL,
  category text,                  -- 'barbell' | 'kettlebell' | 'rig' | 'cardio' | ...
  quantity int DEFAULT 1,
  status equipment_status NOT NULL DEFAULT 'ok',
  replacement_cost numeric,
  notes text,
  last_checked_at timestamptz,
  created_at timestamptz DEFAULT now()
)

-- Gamificação — pontos
gamification_points (
  id uuid PK,
  user_id uuid FK profiles NOT NULL,
  box_id uuid FK boxes NOT NULL,
  action text NOT NULL,           -- 'class_attended' | 'pr_set' | 'streak_7' | ...
  points int NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
)

-- Gamificação — badges
gamification_badges (
  id uuid PK,
  user_id uuid FK profiles NOT NULL,
  box_id uuid FK boxes NOT NULL,
  badge_key text NOT NULL,        -- 'first_pullup' | 'classes_100' | 'member_1year' | ...
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE (user_id, box_id, badge_key)
)
```

---

## 7. Fluxo de Autenticação

### Métodos suportados
- **Magic Link** — `supabase.auth.signInWithOtp({ email })` — sem password
- **Google OAuth** — `supabase.auth.signInWithOAuth({ provider: 'google' })`

### Fluxo completo

```
1. /login
   ├── Utilizador introduz email → recebe magic link
   ├── Clica "Continuar com Google"
   └── Clica "Continuar como visitante" (ver secção visitante abaixo)
           ↓
2. /api/auth/callback
   └── Supabase troca code por sessão
   └── Lê cookie/param ?invite=<token> se existir
   └── Dados do Google (nome, email, avatar) pré-preenchem o perfil
           ↓
3. Middleware verifica perfil
   ├── Sem perfil → /onboarding/role
   └── Com perfil →
       ├── Status 'pending_approval'? → /waiting-approval
       ├── Convite pendente? → /invites/[token]
       └── Sem convite → dashboard do contexto activo
```

### Visitante / Prospecto
Um utilizador que recebe um link (ex: convite para trial, evento público) pode navegar sem conta:
- Vê a página de destino (trial, evento, perfil de box) em modo leitura
- Botão "Continuar como visitante" na página de login permite browsing temporário
- Ao tentar fazer qualquer acção (inscrever, reservar, check-in) → redirect para login/onboarding
- Após autenticar e completar onboarding → retoma a acção original (via `?next=` param)
- O visitante **nunca** acede ao dashboard sem sessão autenticada

### Sistema de convites (implementado)

**Decisão**: convites são links abertos (não nominativos). Qualquer pessoa com o link pode entrar na box. O email inserido na drawer é apenas para registo interno — não é validado contra o utilizador autenticado.

**Fluxo do gestor:**
```
Membros → "Convidar" (botão +)
  → Drawer abre com duas opções:
    1. Inserir email → "Gerar link de convite" → link aparece para copiar
    2. [Fase 3] Link permanente da box (sem email) para partilhar via WhatsApp/SMS
```

**Fluxo do atleta:**
```
Recebe link (/invite?token=<token>)
  → Não autenticado → /login?invite=<token>
  → Onboarding incompleto → /onboarding/role?invite=<token>
  → Autenticado + onboarding completo → página de aceitação
  → Clica "Aceitar convite" → membership criada → /dashboard
```

**Regras:**
- Token expira em 7 dias (resend reinicia o TTL)
- Convite pendente: pode ser revogado (status → `declined`)
- Convite expirado: pode ser reenviado (status → `pending`, novo expires_at)
- Box deve estar `approved` para enviar convites
- Só owner/partner/manager podem convidar
- Todos os convidados entram como `athlete` — role pode ser alterado depois pelo owner

---

## 8. Onboarding — Campos Obrigatórios vs Opcionais

### Atleta
| Campo | Obrigatório | Fonte |
|-------|-------------|-------|
| Email | Sim | Auth (não editável no onboarding) |
| Nome completo | Sim | Google pré-preenche se disponível |
| Nickname | Não (botão Skip) | Manual |
| Telemóvel | Não (botão Skip) | Manual |
| Outros (altura, data nasc., etc.) | Não | Perfil (após onboarding) |

**Princípio**: onboarding mínimo para reduzir abandono. Tudo o resto preenchido depois no perfil.

### Profissional
| Campo | Obrigatório | Fonte |
|-------|-------------|-------|
| Email | Sim | Auth (não editável no onboarding) |
| Nome completo | Sim | Google pré-preenche se disponível |
| Cédula profissional | **Sim** | Manual — necessário para aprovação |
| Contacto telefónico | **Sim** | Manual — necessário para aprovação |
| Nickname | Não (botão Skip) | Manual |

**Nota**: sem cédula e telefone, o profissional não pode submeter para aprovação.

### Aprovação de Profissionais e Boxes

**Profissional:**
- Após submeter onboarding → status `pending_approval`
- Fica em página de espera (`/waiting-approval`) até aprovação manual pela equipa da plataforma
- Aprovação desbloqueia acesso ao dashboard e criação de box
- Fase 2: super dashboard interno para gerir aprovações

**Box:**
- Após criação pelo owner → status `pending_approval`
- Box em modo restrito (não aparece no diretório, não pode receber membros externos)
- Aprovação pela equipa da plataforma activa a box completamente
- Fase 2: processo semi-automático com validação de documentos

**Tabela `profiles`** — campo `approval_status`:
```
'approved' | 'pending_approval' | 'rejected'
```
Default para atletas: `approved` (aprovação automática)
Default para profissionais: `pending_approval`

**Tabela `boxes`** — campo `approval_status`:
```
'approved' | 'pending_approval' | 'rejected'
```
Default: `pending_approval`

---

## 9. Criação de Box (Profissional)

```
Profissional no dashboard (ou durante onboarding)
  → "Criar a minha box"
  → Formulário: nome, slug, localização, contacto
  → Box criada → utilizador adicionado como owner (membership role: 'owner')
  → Pode convidar sócios (role: 'partner') — apenas utilizadores com profile_type: 'professional'
  → Pode activar payments_enabled a qualquer momento (requer configuração Stripe)
```

---

## 9. Módulos do Atleta

| Módulo | Descrição | Prioridade |
|--------|-----------|------------|
| Perfil & Identidade | Foto, box activa, nível, histórico | MVP |
| Reservas de aulas | Calendário, lista de espera, check-in QR | MVP |
| WODs & Performance | Resultados, PRs, gráficos de evolução | MVP |
| Leaderboard | Por WOD, opt-in, comparação com box | Fase 2 |
| Conteúdo & Notícias | Dicas, WODs fora da box, biblioteca movimentos | Fase 2 |
| Eventos & Ticketing | Inscrições, pagamento, waiver digital | Fase 2 |
| Drop-in | Mapa de boxes, reserva + pagamento + waiver | Fase 3 |
| Loja | Merchandising, suplementos, pré-encomendas | Fase 2 |
| Gamificação | Pontos, missões, badges, liga mensal | Fase 2 |
| Comunidade | Feed da box, fist-bumps, grupos por turma | Fase 3 |

---

## 10. Módulos do Gestor

| Módulo | Descrição | Prioridade |
|--------|-----------|------------|
| Dashboard & Analytics | Retenção, receita, ocupação, membros em risco | MVP |
| Gestão de Membros | Fichas, planos, pagamentos, notas privadas | MVP |
| Gestão de Aulas | Horário, capacidade, coaches, cancelamentos | MVP |
| Programação de WODs | Builder, escalas, vídeos, publicação programada | MVP |
| Gestão Administrativa | Faturação AT, SEPA, contratos, relatórios | MVP |
| Radar de Retenção | Alertas ausência, sugestão de ação | Fase 2 |
| Coach View | Vista mobile para uso no chão da box | Fase 2 |
| Funil de Trials | Agendamento, follow-up, métricas conversão | Fase 2 |
| Eventos & Competições | Criação, escalões, convites, classificações | Fase 2 |
| Comunicação | Push segmentado, automações, templates | Fase 2 |
| Loja (gestão) | Produtos, encomendas, stock | Fase 2 |
| Inventário | Equipamento, avarias, substituições | Fase 3 |
| Visibilidade Externa | Perfil público, drop-ins recebidos | Fase 3 |

---

## 11. Roadmap

### Fase 0 — Fundações ✅ (completa)

### Fase 1 — Auth e Onboarding ✅ (completa)
Ver secção 2 para detalhe do que foi implementado.

### Fase 2 — Core MVP (em curso — 0–3 meses)

### Fase 2 — Core MVP (0–3 meses)
**Objetivo**: ter 3–5 boxes em beta ativo a usar a plataforma
- [ ] Gestão de membros e planos
- [ ] Gestão de aulas (horário, capacidade, coaches)
- [ ] WODs: builder + publicação + registo de resultados
- [ ] PRs automáticos a partir de resultados
- [ ] Dashboard básico do gestor (métricas essenciais)
- [ ] Faturação AT certificada (InvoiceXpress)
- [ ] Débitos diretos SEPA via Stripe
- [ ] Diretório público de boxes (SEO)

### Fase 3 — Engagement (3–6 meses)
**Objetivo**: aumentar retenção de atletas e reduzir churn
- [ ] Gamificação (pontos, badges, missões mensais)
- [ ] Coach View (mobile-first)
- [ ] Radar de retenção (alertas de ausência)
- [ ] Funil de trials com follow-up automático
- [ ] Eventos e competições com inscrições e ticketing
- [ ] Loja básica
- [ ] Leaderboard por WOD (opt-in)
- [ ] Notificações push (OneSignal)

### Fase 4 — Crescimento (6–12 meses)
**Objetivo**: expansão para o Brasil e novas fontes de receita
- [ ] Drop-ins com mapa interativo
- [ ] Internacionalização PT-BR
- [ ] Relatórios avançados e exportação
- [ ] App nativa (React Native ou Capacitor)

---

## 12. Decisões Técnicas Tomadas

| Decisão | Escolha | Razão |
|---------|---------|-------|
| Framework | Next.js App Router | SSR para SEO do diretório, RSC para performance |
| Styling | Tailwind CSS v4 | Velocidade de desenvolvimento |
| Components | shadcn/ui | Acessibilidade, customizável, sem lock-in |
| Backend | Supabase | Tudo-em-um: DB, auth, storage, realtime |
| Auth | Magic link + Google OAuth | Sem fricção de password, melhor UX para fitness |
| Multi-tenancy | RLS por box_id | Simples, seguro, sem schemas separados |
| Roles | Por membership (não globais) | Um utilizador pode ter roles diferentes em cada box |
| Onboarding state | Zustand | Estado do wizard em memória, não em URL params |
| Hosting | Vercel | Integração nativa Next.js, edge network |
| Pagamentos | Stripe + SEPA | Cobertura PT/EU, SEPA nativo |
| Pagamentos PT | Easypay (MB WAY, Multibanco) | Fase 2 |
| Faturação AT | InvoiceXpress API | Certificada AT, API REST simples |
| Email | Resend | Developer-friendly, boa entregabilidade |
| Push | OneSignal | Free tier generoso, PWA + nativa |
| i18n | next-intl | PT default, EN suportado, detecta browser |

---

## 13. Regras de Negócio Importantes

1. **Um utilizador pode ser membro de múltiplas boxes** — o role pode ser diferente em cada box
2. **Partner deve ter profile_type: 'professional'** — validar antes de criar a membership
3. **RLS é a única camada de segurança de dados** — nunca filtrar manualmente sem RLS ativo
4. **PRs são calculados automaticamente** ao guardar um `wod_result` — verificar se supera o PR existente para aquele movimento
5. **Lista de espera** é FIFO — quando um spot abre, notificar o primeiro da lista
6. **Cancelamento de aula** com menos de X horas (configurável por box via `settings`) não desconta do plano
7. **Drop-in** requer waiver assinado antes do check-in — guardar `waiver_signed_at`
8. **Fatura** é gerada apenas após pagamento confirmado pelo Stripe webhook — nunca antes
9. **Convite** expira em 7 dias. Link aberto — não valida email contra utilizador autenticado. Qualquer pessoa com o link pode entrar como atleta.
10. **Checkout de convite** só acontece se `boxes.payments_enabled = true`
11. **Profissional** entra com `approval_status: 'pending_approval'` — só acede ao dashboard após aprovação manual pela equipa da plataforma
12. **Box** entra com `approval_status: 'pending_approval'` — só aparece no diretório e aceita membros externos após aprovação
13. **Atleta** entra com `approval_status: 'approved'` — sem aprovação manual necessária
14. **Dados pessoais** seguem RGPD — utilizador pode exportar e eliminar a sua conta

---

## 14. Integrações Críticas para Portugal

### Faturação Certificada AT
**Obrigatório por lei.** Todas as transações com valor fiscal têm de gerar fatura certificada pela Autoridade Tributária.

```
Provider:   InvoiceXpress (https://invoicexpress.com/api-documentation)
Trigger:    Após confirmação de pagamento via Stripe webhook
Output:     PDF da fatura + referência AT
Storage:    Supabase Storage + referência guardada no pedido (orders/drop_ins)
```

### SEPA Débito Direto
```
Provider:   Stripe (SEPA Direct Debit)
Uso:        Cobranças recorrentes de mensalidades
Mandato:    Gerado e guardado no onboarding do membro
```

### MB WAY / Multibanco (Fase 3)
```
Provider:   Easypay
Uso:        Pagamentos pontuais (eventos, loja, drop-ins)
```

---

## 15. Ambiente de Desenvolvimento

```bash
# Instalar dependências
npm install

# Variáveis de ambiente necessárias (.env.local)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
INVOICEXPRESS_API_KEY=
INVOICEXPRESS_ACCOUNT_NAME=
RESEND_API_KEY=
ONESIGNAL_APP_ID=
NEXT_PUBLIC_MAPBOX_TOKEN=
NEXT_PUBLIC_APP_URL=

# Correr localmente
npm run dev

# Supabase local (opcional)
supabase start
supabase db reset
supabase db push
```

---

## 16. Instruções para o Claude Code

Quando trabalhares neste projecto:

1. **Lê sempre este ficheiro primeiro** antes de qualquer alteração
2. **Mantém o schema de BD** da secção 6 como fonte de verdade — alterações de tabelas refletem-se aqui
3. **Respeita a estrutura de pastas** da secção 4 — não criar ficheiros fora da convenção
4. **TypeScript strict** — sem `any`, usar tipos explícitos ou inferência do Zod
5. **RLS sempre** — qualquer nova tabela precisa de políticas RLS antes de ser usada
6. **Sem password auth** — apenas magic link e Google OAuth
7. **shadcn/ui** como base — não reinventar UI primitivos. Para drawers/sheets, usar o padrão motion (ver secção 17)
8. **Server Components por defeito** — só `'use client'` quando necessário
9. **Zod schemas partilhados** — criar em `/schemas`, importar no form e na API. Não usar `.default()` em schemas usados com `zodResolver` — causa conflito de tipos; usar `defaultValues` no `useForm`
10. **Onboarding state em Zustand** — não passar dados sensíveis por URL params
11. **Faturação AT é crítica** — qualquer fluxo de pagamento inclui geração de fatura
12. **Mobile-first** — especialmente Coach View
13. **i18n**: strings PT directamente no código por agora (next-intl fica para depois do MVP)
14. **Inglês no código** — variáveis, funções, comentários em inglês; UI em PT

### Suporte
- Dashboard do profissional (e do gestor) tem botão fixo de suporte via WhatsApp
- Link `https://wa.me/<número>` configurável via variável de ambiente `NEXT_PUBLIC_SUPPORT_WHATSAPP`
- Visível apenas para utilizadores autenticados com perfil profissional

### Alertas a dar ao utilizador
- Se pedir features de Fase 2/3 sem o MVP estar completo → alertar
- Se pedir password auth → recusar, usar magic link
- Se sugerir dados sensíveis em URL params → propor Zustand
- Se propor nova tabela sem RLS → bloquear
- Se propor aprovar profissionais/boxes automaticamente → alertar (aprovação manual é intencional)
- Se propor subscrição cross-box (gym pass) → alertar que é Fase 4

---

## 17. Padrões de UI/UX Estabelecidos

### Drawer / Bottom Sheet (padrão obrigatório)
Todas as drawers usam `motion` do framer-motion — NÃO usar o `Sheet` do shadcn/ui para drawers de conteúdo principal.

```tsx
// Bottom sheet mobile + painel direito desktop
<motion.div
  initial={{ y: "100%", opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: "100%", opacity: 0 }}
  transition={{ type: "spring", damping: 28, stiffness: 300 }}
  className={cn(
    "fixed bottom-0 left-0 right-0 z-50",
    "rounded-t-3xl border-t border-border bg-bg-base px-6 pb-10 pt-5",
    "lg:bottom-0 lg:left-auto lg:right-0 lg:top-0 lg:w-[440px]",
    "lg:rounded-none lg:rounded-l-3xl lg:border-l lg:border-t-0",
    "lg:pb-10 lg:pt-8 lg:overflow-y-auto"
  )}
>
  {/* Mobile handle */}
  <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border lg:hidden" />
  {/* Header: label-caps + font-display text-2xl + subtitle text-sm */}
  {/* Backdrop com blur: fixed inset-0 z-40 bg-black/50 backdrop-blur-sm */}
```

Exemplos de referência: `invite-drawer.tsx`, `template-drawer.tsx`, `slot-card.tsx`

### Botões de ação em drawer
Sempre `PrimaryButton` (full-width, rounded-full) em stack vertical:
```tsx
<PrimaryButton loading={pending}>Ação principal</PrimaryButton>
<PrimaryButton variant="secondary">Cancelar</PrimaryButton>
```

### Formulários em drawer
Usar `FieldInput` de `@/components/shared` (rounded-xl, h-12, bg-bg-input).
Seletores visuais (coach, modalidade, dia da semana) → pills/botões clicáveis, NÃO `<select>` nativo.

### Cards de template semanal
Two-column: texto à esquerda (clicável para editar) + ícones de ação à direita (sempre visíveis).
Indicador de activo: bolinha verde (`bg-green-500`) / cinzenta (`bg-border`) quando pausado.
Pausado: `opacity-40`, mantém posição na grid.

### Gestão de aulas — arquitectura
- Slots derivam dos templates activos (sem botão "gerar") — page.tsx calcula o merge server-side e passa dados ao `ClassesClient` (client component)
- `ensureInstance()` cria o registo DB lazily quando o utilizador toma uma acção
- WODs são atribuídos por modalidade × dia como array — `assignModalityWod(boxId, date, modality, wodIds[], templates)` propaga a todos os slots com o mesmo nome nesse dia
- `onConflict` do Supabase NÃO funciona com partial indexes — usar check manual (SELECT + INSERT condicional)
- Publicação em bulk: `bulkPublishClasses(boxId, slots[], coachId)` — cria instâncias em falta e publica todos os drafts seleccionados
- Select mode gerido em `ClassesClient` — `Set<string>` com chave `startsAt`; só slots `draft` são seleccionáveis

### Modalidades
- Definidas nas Definições da box → `boxes.settings.modalities: string[]`
- Usadas como tag-picker nos templates (pills seleccionáveis)
- Owner pode adicionar modalidade ad-hoc via `window.prompt()` no drawer (fallback rápido)

---

## 18. Decisões de Produto Importantes

| Decisão | Detalhe |
|---------|---------|
| WOD por modalidade × dia | O coach atribui WODs uma vez para "CrossFit de segunda" e aplica a todos os slots (07h, 09h, 18h…) |
| Múltiplos WODs por aula | `classes.wod_ids uuid[]` suporta vários blocos (ex: Força + Condicionamento). Array substituído integralmente no assign |
| class_status inclui 'draft' | Aulas geradas começam como draft → publicar = scheduled |
| Template multi-dia | Ao criar template, selecção múltipla de dias (ex: Seg→Sex) cria N templates de uma vez |
| Coach por defeito = owner | Na drawer de publicar e aula especial, o owner da box fica pré-selecionado |
| Slots automáticos | A página /classes deriva slots dos templates activos sem botão "gerar semana" |
| Aulas especiais | template_id: null, is_special: true — criadas manualmente, não derivam de template |
| Publicação em bulk | Select mode na página de aulas; só drafts seleccionáveis; coach único para o batch |
| wod_type sem Chipper | Chipper é For Time com lista longa — usa descrição textual, não tipo separado |
| wod_type For Load | "Strength" renomeado para "For Load" (terminologia CrossFit padrão) |
| Tabata como tipo próprio | Protocolo distinto (20/10 × 8), score diferente de EMOM |
| wod_category ortogonal ao type | Girls/Heroes/Notables/Games/Weightlifting/Original é a origem; AMRAP/ForTime/etc. é a estrutura |
| benchmark_slug para leaderboard | WODs benchmark guardam slug (ex: 'fran') para comparação cross-box no futuro |
| score_type distance | Adicionado para WODs de row/bike/run pontuados em metros ou calorias |
| score_type round-best/worst/total | Para treinos por rondas temporizadas — manager define nº rondas (result_sets), atleta regista tempo por ronda |
| Duplicar WOD | Sempre cria rascunho sem data nem published_at; abre drawer de edição imediatamente; copia score_type, result_sets, result_reps_per_set |
| Visibilidade de WODs (atleta) | Atleta só vê WOD de uma aula depois de ter participado (booking confirmed OU adicionado pelo coach). Usa função SECURITY DEFINER `get_attended_class_wods` para bypassar RLS de published_at |
| score_display curto | Campo guardado com valor final apenas ("12:34", "170 reps"). Detalhe por ronda/set fica em sets_data (jsonb). Resultados antigos truncados via shortScore() no card |
| DNF (Did Not Finish) | For Time com DNF guarda tempo do time_cap + reps parciais. dnf=true exclui da lógica de PR — exceto DNF+time onde o score é reps completadas (unit="reps") |
| PRs globais vs box-custom | benchmark_slug preenchido → box_id=NULL, PR viaja com atleta. benchmark_slug=NULL → box_id set, PR fica na box. Dois índices únicos parciais garantem unicidade |
| RLS para PRs globais | NULL IN (list) = NULL (falso em SQL). Policy usa `box_id IS NULL OR box_id IN (my_box_ids())` para permitir PRs globais |
| class_id em wod_results | FK opcional para classes. Resolve ambiguidade quando o mesmo WOD aparece em dias diferentes. Deduplicação: resultados de outra sessão são excluídos; scoped ganha sobre legacy (class_id NULL) |
| achieved_at no PR | Usa class.starts_at (data da aula), não now() do momento de registo. Atleta que regista tarde vê a data correta |
| Supabase query immutability | .is()/.eq() retornam novo objeto — `const q = base.is(...); await q.single()` — nunca `base.is(...); await base.single()` |
| Benchmarks sempre visíveis | /athlete/prs mostra todos os benchmark_wods da plataforma, independentemente de a box ter publicado o WOD. overlay de PR onde existe |
| updateWodResult | Action separada de recordWodResult. Verifica ownership antes de update. Reavalia PR após guardar |
