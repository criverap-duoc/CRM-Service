# ============================================================
# Stage 1: Dependencias
# ============================================================
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# pnpm
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate

# Copiar manifiestos
# pnpm-workspace.yaml es requerido por pnpm 11: define "allowBuilds"
# (sin él, "pnpm install --frozen-lockfile" falla con ERR_PNPM_IGNORED_BUILDS)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Instalar dependencias (con cache mount de BuildKit)
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile


# ============================================================
# Stage 2: Builder
# ============================================================
FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.24.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables públicas que Next.js inyecta en el bundle en tiempo de build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Activar standalone SOLO en Docker (Vercel no lo usa y lo rompe)
ENV NEXT_STANDALONE=true

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build


# ============================================================
# Stage 3: Runner (imagen final)
# ============================================================
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar solo lo necesario del build standalone
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
