FROM node:20-alpine

WORKDIR /app

COPY server/package.json server/pnpm-lock.yaml* ./server/
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app/server
RUN pnpm install

COPY server/ ./

EXPOSE 3001
CMD ["pnpm", "dev"]