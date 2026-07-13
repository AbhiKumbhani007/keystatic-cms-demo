# syntax=docker/dockerfile:1

# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# GitHub reader/repo must be set at build time for generateStaticParams.
ARG NEXT_PUBLIC_GITHUB_REPO_OWNER
ARG NEXT_PUBLIC_GITHUB_REPO_NAME
ENV NEXT_PUBLIC_GITHUB_REPO_OWNER=$NEXT_PUBLIC_GITHUB_REPO_OWNER
ENV NEXT_PUBLIC_GITHUB_REPO_NAME=$NEXT_PUBLIC_GITHUB_REPO_NAME
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# git is required at runtime for the bot auto-commit/push + webhook pull.
RUN apk add --no-cache git \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
