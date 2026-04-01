FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- Builder ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN pnpm build

# --- Runner ---
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9 --activate
RUN apk add --no-cache curl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Entrypoint script for migrations + start
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

USER nextjs
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
