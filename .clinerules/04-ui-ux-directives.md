# UI/UX Aesthetic Directives

Apply to any visual component (CSS, Tailwind, shadcn/ui):

## Typography
- Geist Sans for body and headings (via next/font)
- Geist Mono for numbers, SKUs, scores, dates
- No usar otras fuentes: el proyecto tiene una sola familia sans
  unificada para consistencia
- No generic fonts (Roboto, Arial, Open Sans)
- Headings: tracking-tight

## Color
- Primary gradient: from-blue-600 to-indigo-600
- Background: from-slate-50 via-white to-indigo-50/40
- Card: bg-white/60 backdrop-blur-sm border-gray-200/30 rounded-2xl
- Avoid generic purple-on-white gradients

## Spacing & Shape
- Cards: rounded-2xl with shadow-sm
- Buttons: rounded-xl with hover:-translate-y-0.5, transition-all
- Inputs: rounded-xl h-11 with focus:ring-4 focus:ring-blue-400/10

## Motion
- Hover: hover:shadow-lg, hover:-translate-y-0.5
- No random animations; every transition has purpose
- Interactive elements: transition-all duration-200

## Charts
- Bar colors: ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff']
- Tooltips: bg-white border rounded-xl shadow-lg

## Navbar — patrón único: barra superior unificada

Todas las páginas del proyecto usan la misma barra superior unificada
(`TopNavbar`): los listados (dashboard, contacts, companies, tags,
opportunities, tasks, products, analytics) y también las páginas de
detalle ([id]), que le pasan un breadcrumb dinámico.
Contiene links a todas las vistas; el logout vive dentro del `AvatarMenu`.

El patrón "navbar mínimo" (logo + botón "Volver") quedó descontinuado:
ya no se usa en ninguna página. No crear navbars mínimos nuevos.

## Navbar — Barra superior unificada (Iteración 3)

El navbar del proyecto es una **barra superior sticky** (NO sidebar),
implementada una sola vez en `frontend/src/components/TopNavbar.tsx`
y reutilizada por todas las páginas de listado.

Contenedor:
`sticky top-0 z-50 bg-[var(--color-surface)] border-b border-[var(--color-line)]`
Sin backdrop-blur, sin gradientes y sin bordes en los links del navbar.

Estructura fija (izquierda → derecha):

1. **Logo** → /dashboard (icono `CircleUserRound` en caja
   `bg-[var(--color-brand)]` + texto "CRM Service", oculto en móvil).
2. **6 links planos**, en este orden exacto:
   1. Dashboard     → /dashboard
   2. Contactos     → /contacts
   3. Empresas      → /companies
   4. Oportunidades → /opportunities
   5. Tareas        → /tasks
   6. Analítica     → /analytics
3. **Dropdown "Catálogo ▾"** (`CatalogDropdown`), con:
   - Productos → /products
   - Tags      → /tags
4. **Zona derecha**, en este orden:
   1. `ConnectionIndicator` — píldora "En vivo" / "Desconectado".
   2. `NotificationBell` — campana con badge de no leídas.
   3. `AvatarMenu` — iniciales del usuario; el **logout vive dentro
      de su dropdown**, ya no es un botón suelto de la barra.

Reglas:
- NO cambiar el orden de los links existentes.
- Entidad nueva: si es de catálogo va dentro de "Catálogo ▾"; si no,
  se inserta en los links planos (antes de "Analítica").
- Link activo: **subrayado de 2px en `--color-brand`** — span
  `absolute bottom-0 left-3 right-3 h-0.5 bg-[var(--color-brand)]
  rounded-full transition-opacity duration-150` — con el texto en
  `text-[var(--color-ink)]`. El inactivo usa
  `text-[var(--color-subtle)]`.
- Todos los links comparten
  `relative px-3 py-2 text-sm font-medium transition-colors rounded-lg hover:text-[var(--color-ink)]`.
- Breadcrumb opcional vía prop `breadcrumb?: { label, href? }[]`
  (último ítem sin link, en `--color-ink`).

## Páginas de detalle ([id]) — navbar completo con breadcrumb

Las páginas de detalle (/contacts/[id], /companies/[id],
/opportunities/[id]) usan <TopNavbar> completo, igual que los listados,
pero con breadcrumb dinámico de 2 niveles:

- Nivel 1: recurso base con link (ej: "Contactos" → /contacts).
- Nivel 2: nombre del recurso actual (no clickeable).

Durante la carga del recurso, el breadcrumb muestra solo el nivel 1.
Al cargar, aparece el nivel 2 con el nombre real.

NO usar navbar mínimo en páginas de detalle. NO dejar botón "Volver"
suelto; el breadcrumb cumple esa función.