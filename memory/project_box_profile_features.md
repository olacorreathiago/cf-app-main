---
name: project-box-profile-features
description: Status das 4 funcionalidades implementadas no perfil da box em junho 2025
metadata:
  type: project
---

Sessão de desenvolvimento no perfil da box (junho 2025). Todos os 4 itens foram implementados e estão funcionais.

**Item 1 — Limite de lista de espera nas configurações operacionais** ✅
- `max_waitlist` (int 0–50) adicionado ao schema Zod, tipo `BoxSettings`, formulário operacional e server action
- Formulário operacional redesenhado com padrão "settings panel" (label+descrição à esquerda, input à direita, divisores)
- Formulário de informações da box também padronizado no mesmo estilo

**Item 2 — Enforcement da fila de espera** ✅
- `bookClass()` verifica `max_waitlist`: bloqueia se `max_waitlist=0` ou `waitlist_count >= max_waitlist`
- `cancelBooking()` e `removeAthleteFromClass()` promovem automaticamente o primeiro da lista de espera usando `supabaseAdmin` (necessário para bypass RLS — outros utilizadores)
- `addAthleteToClass()` verifica capacidade antes de inserir — entra em waitlist se lotado
- Posição na fila mostrada no ClassCard: "Lista de espera · posição 1 de 3" (denominador = `max_waitlist` das settings)
- RPC `get_waitlist_positions(user_id, class_ids)` criada em migration `00027`
- Bug de ordering corrigido: `created_at` resetado ao reativar booking cancelado
- `maxWaitlist` propagado por toda a cadeia: dashboard-actions → athlete/page → ClassCard, e classes-actions → classes/page → ClassesClient → ClassCard

**Item 3 — Upload de ficheiro para logo da box** ✅
- `logo_url` removido do `boxInfoSchema` e do `updateBoxInfo`
- Nova server action `updateBoxLogo` usa `supabaseAdmin` (RLS da tabela `boxes` bloqueia update com client normal)
- Componente `BoxLogoUpload` faz upload para bucket `box-assets` (já existia com policies corretas)
- Policies de UPDATE e DELETE adicionadas ao bucket `box-assets` em migration `00028`
- Fluxo: delete ficheiro existente → insert novo (evita depender de upsert)

**Item 4 — Corte 1:1 da imagem de avatar da box** ✅
- `react-easy-crop` instalado
- Componente `ImageCropModal` criado em `src/components/shared/image-crop-modal.tsx` (reutilizável)
- `BoxLogoUpload` abre o modal de crop antes do upload; gera JPEG via canvas
- Aspect ratio sempre 1:1

**Why:** Pedido do utilizador para melhorar o perfil da box.
**How to apply:** Migrations 00027 e 00028 devem ser aplicadas no Supabase. Bucket `box-assets` precisa das novas policies de UPDATE/DELETE (00028).
