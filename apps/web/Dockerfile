FROM node:25-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install --global pnpm@10.27.0
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/isomorphic/package.json ./packages/isomorphic/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --filter web... --frozen-lockfile --ignore-scripts

FROM deps AS build
ARG VITE_API_ORIGIN
ARG VITE_API_URL
ENV VITE_API_ORIGIN=$VITE_API_ORIGIN
ENV VITE_API_URL=$VITE_API_URL
COPY . .
RUN pnpm --filter @repo/isomorphic build \
  && pnpm --filter web build

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/apps/web/.output ./apps/web/.output
COPY --from=build /app/packages/isomorphic/package.json ./packages/isomorphic/package.json
COPY --from=build /app/packages/isomorphic/node_modules ./packages/isomorphic/node_modules
COPY --from=build /app/packages/isomorphic/src ./packages/isomorphic/src
USER node
EXPOSE 8080
CMD ["node", "apps/web/.output/server/index.mjs"]
