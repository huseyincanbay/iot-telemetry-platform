ARG NODE_IMAGE=node:24-alpine

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /workspace

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
ENV CI=true
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build:packages
ARG APP
RUN pnpm --filter "@telemetry/${APP}" build \
 && pnpm --filter "@telemetry/${APP}" deploy --prod --legacy /output

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /output ./
COPY --from=build --chown=node:node /workspace/proto /proto
USER node
CMD ["node", "dist/main.js"]
