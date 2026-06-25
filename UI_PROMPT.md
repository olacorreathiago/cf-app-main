# UI Prompt — CrossFit Box App
> Passa este prompt ao Claude Code antes de criar qualquer componente de UI.
> Referências visuais: Apple Fitness+, Runna, Ladder, WHOOP, Zero

---

## Missão

Cria uma UI **mobile-first** com experiência otimizada para desktop, seguindo um sistema de design coeso, acessível, com suporte nativo a light/dark mode. A estética é **atlética, moderna e focada** — dark mode como modo principal, com um accent color energético. Sem decoração desnecessária. Cada pixel serve um propósito.

---

## 1. Design Tokens (globals.css / tailwind.config)

Define estes tokens como CSS custom properties e mapeia-os no Tailwind. São a única fonte de verdade — **nunca usar valores hardcoded**.

```css
/* globals.css */
:root {
  /* Brand */
  --color-accent: #C8FF00;          /* verde lima — accent principal (inspirado Apple Fitness+) */
  --color-accent-hover: #B0E000;
  --color-accent-foreground: #0A0A0A; /* texto sobre accent — sempre escuro */

  /* Surface — Light mode */
  --color-bg-base: #F5F5F0;          /* fundo global, levemente quente */
  --color-bg-card: #FFFFFF;
  --color-bg-card-hover: #F0F0EB;
  --color-bg-overlay: rgba(0,0,0,0.04);
  --color-bg-input: #EBEBEB;

  /* Text — Light mode */
  --color-text-primary: #0F0F0F;
  --color-text-secondary: #5A5A5A;
  --color-text-tertiary: #9A9A9A;
  --color-text-disabled: #CCCCCC;

  /* Border — Light mode */
  --color-border: #E2E2DC;
  --color-border-strong: #C8C8C2;

  /* Status */
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #3B82F6;

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Shadow */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.08);
  --shadow-card: 0 2px 8px rgba(0,0,0,0.06);

  /* Spacing scale (usa Tailwind — aqui para referência) */
  /* 4px base grid */
}

/* Dark mode — ativa via class="dark" no <html> */
.dark {
  --color-bg-base: #0A0A0A;          /* preto profundo — não #000 puro */
  --color-bg-card: #141414;
  --color-bg-card-hover: #1C1C1C;
  --color-bg-overlay: rgba(255,255,255,0.04);
  --color-bg-input: #1A1A1A;

  --color-text-primary: #F0F0F0;
  --color-text-secondary: #A0A0A0;
  --color-text-tertiary: #606060;
  --color-text-disabled: #383838;

  --color-border: #1E1E1E;
  --color-border-strong: #2A2A2A;

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.4);
  --shadow-card: 0 2px 8px rgba(0,0,0,0.3);
}
```

```js
// tailwind.config.ts — extende com os tokens
theme: {
  extend: {
    colors: {
      accent: 'var(--color-accent)',
      'accent-hover': 'var(--color-accent-hover)',
      'accent-fg': 'var(--color-accent-foreground)',
      'bg-base': 'var(--color-bg-base)',
      'bg-card': 'var(--color-bg-card)',
      'bg-input': 'var(--color-bg-input)',
      'text-primary': 'var(--color-text-primary)',
      'text-secondary': 'var(--color-text-secondary)',
      'text-tertiary': 'var(--color-text-tertiary)',
      border: 'var(--color-border)',
      'border-strong': 'var(--color-border-strong)',
      success: 'var(--color-success)',
      warning: 'var(--color-warning)',
      error: 'var(--color-error)',
    },
    borderRadius: {
      sm: 'var(--radius-sm)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      xl: 'var(--radius-xl)',
    },
    boxShadow: {
      card: 'var(--shadow-card)',
      md: 'var(--shadow-md)',
    },
  }
}
```

---

## 2. Tipografia

```css
/* Font stack — importar via next/font */
/* Display (headings grandes, hero): Inter ou Geist — peso 700/800 */
/* Body: Inter ou Geist — peso 400/500 */

/* Scale */
--text-xs:    0.75rem;   /* 12px — labels, badges */
--text-sm:    0.875rem;  /* 14px — body small, captions */
--text-base:  1rem;      /* 16px — body padrão */
--text-lg:    1.125rem;  /* 18px — body destaque */
--text-xl:    1.25rem;   /* 20px — títulos de secção */
--text-2xl:   1.5rem;    /* 24px — títulos de página (mobile) */
--text-3xl:   1.875rem;  /* 30px — títulos de página (desktop) */
--text-4xl:   2.25rem;   /* 36px — hero */
--text-display: 3rem;    /* 48px — display / hero grande */
```

**Regras:**
- Headings de página: `font-bold tracking-tight` — nunca tracking wide em títulos
- Labels e badges: `text-xs font-semibold uppercase tracking-widest`
- Métricas numéricas (PRs, tempos): `font-bold tabular-nums` — usa fonte monospaced para números que mudam
- Corpo: `leading-relaxed` (1.625) para melhor legibilidade
- Máximo de 2 pesos de fonte por ecrã

---

## 3. Layout — Mobile First com Breakpoints

```
Base (mobile):  < 640px   — 1 coluna, padding 16px, bottom navigation
sm:             640px+    — transição, ainda mobile
md:             768px+    — tablet, sidebar pode aparecer
lg:             1024px+   — desktop, sidebar fixa, conteúdo em 2 colunas
xl:             1280px+   — desktop largo, max-width 1200px centrado
2xl:            1536px+   — widescreen, max-width 1400px
```

### Shell da App

**Mobile**: Bottom navigation bar (5 itens max) + header simples com título e ações
**Desktop**: Sidebar fixa esquerda (240px) + topbar + área de conteúdo

```tsx
/* Estrutura base — mobile */
<div className="flex flex-col min-h-screen bg-bg-base">
  <Header />                           {/* sticky top, h-14 */}
  <main className="flex-1 pb-20">      {/* pb-20 para bottom nav */}
    {children}
  </main>
  <BottomNav />                        {/* fixed bottom, h-16, backdrop-blur */}
</div>

/* Estrutura base — desktop (lg:) */
<div className="lg:flex lg:h-screen lg:overflow-hidden bg-bg-base">
  <Sidebar />                          {/* w-60, border-r, overflow-y-auto */}
  <div className="flex-1 flex flex-col lg:overflow-hidden">
    <Topbar />                         {/* h-14, border-b */}
    <main className="flex-1 lg:overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6">
        {children}
      </div>
    </main>
  </div>
</div>
```

### Grid de Conteúdo

```
Mobile:   1 coluna — cards full width
md:       2 colunas — cards em grid
lg:       3 colunas — dashboard widgets
xl:       4 colunas — para grids densos (biblioteca de movimentos, loja)
```

---

## 4. Componentes Base

### Botões

```tsx
/* Variantes obrigatórias */

// Primary — accent lime, texto escuro, impacto máximo
<button className="
  bg-accent text-accent-fg font-semibold
  px-6 py-3 rounded-full           /* pill shape — referência Apple Fitness+ */
  hover:bg-accent-hover
  active:scale-[0.98]
  transition-all duration-150
  focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
  disabled:opacity-40 disabled:cursor-not-allowed
">

// Secondary — fundo card, borda
<button className="
  bg-bg-card text-text-primary border border-border font-medium
  px-6 py-3 rounded-full
  hover:bg-bg-card-hover hover:border-border-strong
  ...
">

// Ghost — sem fundo, só texto
// Destructive — error color
// Icon button — quadrado 40x40, rounded-lg
```

**Tamanhos:**
- `sm`: `px-4 py-2 text-sm h-8`
- `md`: `px-6 py-3 text-base h-11` ← default
- `lg`: `px-8 py-4 text-lg h-14` ← CTAs principais (ex: "Reservar Aula")

### Cards

```tsx
/* Card base */
<div className="
  bg-bg-card rounded-xl border border-border shadow-card
  overflow-hidden
  hover:border-border-strong transition-colors duration-150
">

/* Card com imagem hero (referência WHOOP/Ladder) */
<div className="relative rounded-xl overflow-hidden aspect-[4/3]">
  <Image fill className="object-cover" />
  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
  <div className="absolute bottom-0 left-0 p-4">
    <span className="text-xs font-semibold uppercase tracking-widest text-white/70">AMRAP • 20min</span>
    <h3 className="text-white font-bold text-xl mt-1">Fran</h3>
  </div>
</div>

/* Card métrica (dashboard) */
<div className="bg-bg-card rounded-xl p-4 border border-border">
  <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-1">Membros Ativos</p>
  <p className="text-3xl font-bold tabular-nums text-text-primary">127</p>
  <p className="text-sm text-success mt-1">↑ 3 este mês</p>
</div>

/* Card de aula (referência Runna — barra lateral colorida) */
<div className="bg-bg-card rounded-xl border border-border overflow-hidden flex">
  <div className="w-1 bg-accent flex-shrink-0" />   {/* barra lateral accent */}
  <div className="p-4 flex-1">
    ...
  </div>
</div>
```

### Badges / Pills

```tsx
/* Status de aula */
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
  bg-success/15 text-success">  {/* vagas disponíveis */}
  3 vagas
</span>

<span className="... bg-error/15 text-error">Completo</span>
<span className="... bg-warning/15 text-warning">Poucos lugares</span>
<span className="... bg-accent/15 text-accent">RX</span>

/* Nível do atleta */
<span className="... border border-accent/30 text-accent bg-accent/10">Scaled</span>
```

### Formulários

```tsx
<input className="
  w-full bg-bg-input text-text-primary
  border border-border rounded-lg
  px-4 py-3 text-base
  placeholder:text-text-tertiary
  focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
  disabled:opacity-50
  transition-shadow duration-150
" />

/* Label */
<label className="block text-sm font-medium text-text-secondary mb-1.5" />

/* Erro */
<p className="text-sm text-error mt-1 flex items-center gap-1">
  <IconAlertCircle size={14} />
  Campo obrigatório
</p>
```

### Bottom Navigation (Mobile)

```tsx
/* 5 itens max, fixed bottom, backdrop blur */
<nav className="
  fixed bottom-0 left-0 right-0 z-50
  h-16 flex items-center justify-around
  bg-bg-card/80 backdrop-blur-xl
  border-t border-border
  safe-area-bottom                   /* respeita notch iOS */
">
  {/* Cada item */}
  <button className="flex flex-col items-center gap-0.5 px-4 py-2">
    <Icon size={22} className="text-text-tertiary group-data-[active]:text-accent" />
    <span className="text-[10px] font-medium text-text-tertiary group-data-[active]:text-accent">
      Início
    </span>
  </button>
</nav>
```

### Sidebar (Desktop)

```tsx
<aside className="hidden lg:flex flex-col w-60 h-screen border-r border-border bg-bg-card overflow-y-auto">
  {/* Logo */}
  <div className="h-14 flex items-center px-6 border-b border-border">
    <Logo />
  </div>
  
  {/* Nav items */}
  <nav className="flex-1 px-3 py-4 space-y-0.5">
    <SidebarItem icon={Home} label="Dashboard" href="/dashboard" />
    {/* ... */}
  </nav>
  
  {/* User info no fundo */}
  <div className="p-4 border-t border-border">
    <UserAvatar />
  </div>
</aside>
```

---

## 5. Padrões de Ecrã

### Dashboard do Atleta (referência Runna + Apple Fitness+)

```
Mobile layout:
┌─────────────────────────┐
│ Header: "Bom dia, João" │
│ [Streak: 🔥 12 dias]    │
├─────────────────────────┤
│ Calendário semanal      │
│ M T W T F S S           │
│ ○ ✓ ● ○ ○ ○ ○          │  ← dots de cor por tipo de aula
├─────────────────────────┤
│ PRÓXIMA AULA            │
│ ┌─────────────────────┐ │
│ │ | CrossFit • 18:00  │ │  ← barra lateral accent
│ │ | Coach: Miguel     │ │
│ │ | 8/12 inscritos    │ │
│ │       [Cancelar]    │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ WOD DE HOJE             │
│ ┌─────────────────────┐ │
│ │ AMRAP 20            │ │
│ │ 5 Pull-ups          │ │
│ │ 10 Push-ups         │ │
│ │ 15 Air Squats       │ │
│ │ [Registar resultado]│ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ OS TEUS PRs RECENTES    │
│ Back Squat  120kg  ↑    │
│ Fran        8:42   ↑    │
└─────────────────────────┘

Desktop: sidebar + 2 colunas
Col 1 (2/3): calendário + aula + WOD
Col 2 (1/3): PRs + leaderboard + atividade
```

### Coach View (mobile-first, uso no chão da box)

```
Layout ultra-simples, texto grande, mínimo de ações:
┌─────────────────────────┐
│ ← CrossFit • 18:00      │
│ Coach: tu               │
├─────────────────────────┤
│ 8 ATLETAS               │
├─────────────────────────┤
│ ┌──┐ Ana Silva    RX    │
│ │  │ Último Fran: 9:12  │
│ └──┘                    │
│ ┌──┐ Rui Mendes  Scaled │
│ │  │ ⚠ Lesão no ombro  │  ← flag de lesão bem visível
│ └──┘                    │
│ ...                     │
├─────────────────────────┤
│ [Registar resultados]   │
└─────────────────────────┘
```

### Dashboard do Gestor

```
Desktop (prioridade):
┌────────────────────────────────────────┐
│ Boa tarde, Box CrossFit Porto          │
├────────┬────────┬────────┬─────────────┤
│ 127    │ 94.2%  │ €3.840 │ ⚠ 8 risco  │  ← métrica cards
│ Membros│Retenção│ MRR    │             │
├────────┴────────┴────────┴─────────────┤
│ Aulas hoje          │ Radar de risco   │
│ 07:00 ✓ 12/12      │ João - 3 sem aus │
│ 09:00 ✓  8/12      │ Maria - 2 sem    │
│ 18:00 ● 10/12      │ [Ver todos →]    │
│ 19:30 ○  3/12      │                  │
├─────────────────────┴──────────────────┤
│ Receita este mês ── gráfico sparkline  │
└────────────────────────────────────────┘
```

---

## 6. Acessibilidade (WCAG 2.1 AA mínimo)

**Contraste obrigatório:**
```
Texto normal:   mínimo 4.5:1
Texto grande:   mínimo 3:1
Accent (#C8FF00) sobre dark bg (#0A0A0A): 12.6:1 ✓
Accent sobre white: 2.1:1 ✗ — NUNCA usar texto accent em light mode
→ Em light mode, usar accent só como background de botões (com texto escuro)
```

**Regras de implementação:**
```tsx
// Focus visível em todos os elementos interativos
className="focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"

// Nunca remover outline sem alternativa
// className="outline-none"  ← PROIBIDO sem focus-visible substituto

// Targets tácteis mínimos: 44x44px (botões, ícones de nav)
// Em mobile, padding extra nos elementos interativos pequenos

// ARIA obrigatório:
// - aria-label em botões icon-only
// - aria-current="page" nos nav items ativos
// - aria-live="polite" em updates de estado (reserva confirmada, etc.)
// - role="status" em contadores que atualizam

// Semântica HTML:
// <nav>, <main>, <header>, <aside> — nunca div para estrutura
// <button> para ações, <a> para navegação — nunca inverter
// Headings hierárquicos: h1 > h2 > h3 — nunca saltar níveis

// Imagens:
// alt="" em imagens decorativas
// alt descritivo em imagens de conteúdo
// Avatares: alt="Foto de {nome}"
```

**Reduced motion:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Dark Mode

**Implementação:**
```tsx
// _app.tsx ou layout.tsx — usar next-themes
import { ThemeProvider } from 'next-themes'

<ThemeProvider
  attribute="class"           // aplica class="dark" no <html>
  defaultTheme="dark"         // dark como default
  enableSystem={true}         // respeita preferência do SO
>

// Uso nos componentes: usar só tokens CSS — nunca dark: prefix do Tailwind
// ✓  bg-bg-card              (muda automaticamente com o token)
// ✗  bg-white dark:bg-zinc-900  (duplicação — evitar)
```

**Imagens:**
```tsx
// Fotos de atletas — funcionam em ambos os modos
// Logos e ícones SVG — usar currentColor para adaptar automaticamente
// Gradientes sobre imagens — ajustar opacidade por mode se necessário
```

---

## 8. Animações e Microinterações

**Princípio**: subtil e funcional. Animações comunicam estado, não decoram.

```tsx
// Transições standard
transition-colors duration-150    // mudanças de cor (hover, active)
transition-transform duration-200 // escala, translate
transition-opacity duration-200   // fade in/out

// Entrada de listas (stagger)
// Usar Framer Motion com variants — não CSS puro para listas longas

// Skeleton loaders — sempre em vez de spinners para conteúdo de página
<div className="animate-pulse bg-bg-overlay rounded-lg h-16 w-full" />

// Toast/feedback de ação — sonner ou react-hot-toast
// Posição: bottom-center em mobile, top-right em desktop

// Check-in confirmado: micro-animação de checkmark (Lottie ou CSS)
// PR batido: celebração subtil — confetti leve (canvas-confetti)
```

---

## 9. Convenções de Ficheiros e Componentes

```
components/
├── ui/                     # shadcn/ui — não editar diretamente
├── shared/
│   ├── layout/
│   │   ├── app-shell.tsx
│   │   ├── sidebar.tsx
│   │   ├── bottom-nav.tsx
│   │   └── topbar.tsx
│   ├── data-display/
│   │   ├── metric-card.tsx
│   │   ├── wod-card.tsx
│   │   ├── class-card.tsx
│   │   └── pr-row.tsx
│   └── feedback/
│       ├── skeleton.tsx
│       ├── empty-state.tsx
│       └── error-boundary.tsx
├── athlete/
│   ├── dashboard/
│   ├── wods/
│   └── bookings/
└── manager/
    ├── dashboard/
    ├── members/
    └── coach-view/
```

**Regras de componentes:**
```tsx
// Props tipadas sempre com interface, não type alias
interface ClassCardProps {
  class: ClassWithCoach     // tipos do Supabase — usar tipos gerados
  onBook?: () => void
  variant?: 'default' | 'compact'
}

// Componentes exportam named export + default export
export function ClassCard({ class: cls, onBook, variant = 'default' }: ClassCardProps) { ... }
export default ClassCard

// Server Components por default — só 'use client' quando necessário:
// - event handlers (onClick, onChange)
// - hooks (useState, useEffect, etc.)
// - browser APIs
```

---

## 10. Checklist antes de fazer commit de um componente

```
□ Funciona em mobile (375px) e desktop (1280px)?
□ Dark mode e light mode testados?
□ Estados cobertos: default, hover, focus, active, disabled, loading, empty, error?
□ Texto legível em ambos os modos (contraste verificado)?
□ Targets tácteis ≥ 44px em mobile?
□ Focus visible em todos os elementos interativos?
□ ARIA labels em ícones e botões sem texto?
□ Sem valores hardcoded — só tokens CSS?
□ Skeleton loader para estados de carregamento?
□ Reduced motion respeitado?
```

---

## Referências Visuais (resumo de cada app)

| App | O que aplicar |
|-----|--------------|
| **Apple Fitness+** | Dark profundo, accent lime, pill buttons, cards dark com border subtil |
| **Runna** | Calendário semanal horizontal, barra lateral colorida nos cards de treino, métricas em destaque |
| **Ladder** | Hero image full-bleed com gradiente, tipografia display bold uppercase, social proof inline |
| **WHOOP** | Grid de cards com imagem editorial, badges de nível no canto do card |
| **Zero** | Navegação bottom bar minimalista, hierarquia clara de conteúdo, sem ruído visual |

