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