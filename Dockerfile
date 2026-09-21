FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/core/package.json packages/core/package.json
COPY packages/shield/package.json packages/shield/package.json
COPY packages/cli/package.json packages/cli/package.json
COPY packages/mcp/package.json packages/mcp/package.json
COPY packages/canary/package.json packages/canary/package.json
COPY packages/llm-agent/package.json packages/llm-agent/package.json

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:22-slim AS run
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production

COPY --from=build /app /app

CMD ["node", "packages/canary/dist/bin.js", "run"]
