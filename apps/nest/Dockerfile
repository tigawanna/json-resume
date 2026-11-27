FROM node:25-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install --global pnpm@10.27.0
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/nest/package.json ./apps/nest/
COPY packages/db/package.json ./packages/db/
COPY packages/isomorphic/package.json ./packages/isomorphic/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --filter nest... --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY . .
RUN pnpm --filter @repo/db build \
  && pnpm --filter @repo/isomorphic build \
  && pnpm --filter nest build

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/nest/node_modules ./apps/nest/node_modules
COPY --from=build /app/apps/nest/package.json ./apps/nest/package.json
COPY --from=build /app/apps/nest/dist ./apps/nest/dist
COPY --from=build /app/packages/db/package.json ./packages/db/package.json
COPY --from=build /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=build /app/packages/db/src ./packages/db/src
COPY --from=build /app/packages/isomorphic/package.json ./packages/isomorphic/package.json
COPY --from=build /app/packages/isomorphic/node_modules ./packages/isomorphic/node_modules
COPY --from=build /app/packages/isomorphic/src ./packages/isomorphic/src
USER node
EXPOSE 8080
CMD ["node", "apps/nest/dist/main.js"]
