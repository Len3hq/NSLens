FROM node:22-alpine AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig*.json ./
COPY lib ./lib
COPY artifacts ./artifacts

RUN pnpm install --frozen-lockfile

# Vite requires PORT and BASE_PATH at build time
ENV PORT=3000
ENV BASE_PATH=/
RUN pnpm --filter @workspace/web build

RUN pnpm --filter @workspace/api-server build


FROM node:22-alpine AS runtime

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY lib ./lib
COPY artifacts ./artifacts

RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build /app/artifacts/web/dist/public ./public

EXPOSE 8080

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
