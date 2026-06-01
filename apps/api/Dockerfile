FROM node:20-alpine

WORKDIR /app

# Install NestJS CLI globally
RUN npm install -g @nestjs/cli

# Copy package files
COPY package.json ./
RUN npm install

# Copy source
COPY . .

# Build
RUN nest build

EXPOSE 3001

CMD ["node", "dist/main"]
