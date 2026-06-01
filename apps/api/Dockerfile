FROM node:20-alpine

RUN npm install -g @nestjs/cli

WORKDIR /app

# Copy API dependencies and config (paths relative to repo root)
COPY apps/api/package.json ./package.json
COPY apps/api/tsconfig.json ./tsconfig.json
COPY apps/api/nest-cli.json ./nest-cli.json

RUN npm install

# Copy source
COPY apps/api/src ./src

# Build
RUN nest build

EXPOSE 3001

CMD ["node", "dist/main"]
