# UI/UX Aesthetic Directives

Apply to any visual component (CSS, Tailwind, shadcn/ui):

## Typography
- Inter for body, Outfit for headings
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

## Navbar — dos patrones válidos en el proyecto

Este proyecto tiene DOS patrones de navbar válidos:

1. **Navbar completo** — para páginas de listado (dashboard, contacts,
   companies, tags, tasks, analytics, products).
   Contiene botones a todas las vistas + botón de cerrar sesión.

2. **Navbar mínimo** — para páginas de detalle o formularios ([id], new).
   Solo contiene un botón "Volver" con icono ArrowLeft.

NO conviertas un navbar mínimo en completo sin autorización explícita.
NO agregues links de navegación a un navbar mínimo.

## Navbar — Orden fijo de botones

El navbar completo (páginas de listado) SIEMPRE debe respetar este orden:

1. Dashboard       → /dashboard
2. Contactos       → /contacts
3. Analítica       → /analytics
4. Empresas        → /companies
5. Tags            → /tags
6. Tareas          → /tasks
7. Productos       → /products
8. Cerrar sesión   → (botón ghost, onClick=logout, con icono LogOut)

Reglas:
- NO cambiar el orden de los botones existentes.
- Al añadir una entidad nueva, insértala justo antes de "Cerrar sesión"
  (al final de la lista de links, dejando logout siempre como último).
- Mantener el estilo idéntico:
  - Links intermedios: variant="outline" con
    className="border-gray-200/60 hover:border-blue-400/50 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-medium text-gray-700 rounded-xl"
  - El link activo (página actual): mismo className pero con
    border-blue-400/50, bg-blue-50, hover:border-blue-400/50
  - Cerrar sesión: variant="ghost" size="sm" con
    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 rounded-xl transition-all duration-200" y el icono <LogOut className="h-4 w-4 mr-1.5" />

Aplica este orden a TODOS los navbars completos:
- dashboard/page.tsx
- contacts/page.tsx
- analytics/page.tsx
- companies/page.tsx
- tags/page.tsx
- tasks/page.tsx
- products/page.tsx

Las páginas de detalle ([id]) y formularios (new) usan navbar mínimo
(solo botón "Volver"). NO convertir esos a navbar completo.