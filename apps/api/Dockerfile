# ── Build stage ──────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

COPY apps/api/package.json ./package.json
COPY apps/api/tsconfig.json ./tsconfig.json
COPY apps/api/nest-cli.json ./nest-cli.json

# Full install (incl. dev deps) needed to build
RUN npm install

COPY apps/api/src ./src
RUN npx nest build

# Drop dev dependencies from the production node_modules
RUN npm prune --omit=dev

# ── Runtime stage ────────────────────────────────────────────
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Copy only what the runtime needs
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# Run as the unprivileged built-in `node` user, not root
USER node

EXPOSE 3001

CMD ["node", "dist/main"]
