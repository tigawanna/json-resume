<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

The app listens on `PORT` from `apps/nest/.env` (default **5040** if unset). These routes are **not** proxied through the web app (`:3040`) or Hono (`:3100`). Hit Nest directly.

There is no checked-in OpenAPI file; Nest generates the document at boot.

| What         | Path             | Example if `PORT=5040`              |
| ------------ | ---------------- | ----------------------------------- |
| Scalar UI    | `/api/docs`      | http://localhost:5040/api/docs      |
| OpenAPI JSON | `/api/docs-json` | http://localhost:5040/api/docs-json |

HTTP is under `/api` (`/api/me`, `/api/auth/*`, …). OpenAPI `servers` is `SERVER_URL/api`, so Scalar lists `/me` and `/auth/...` against that base. Setup lives in `src/bootstrap/configure-app.ts`.

Platform probes stay at the root, outside `/api` and outside OpenAPI: `GET /health` (liveness) and `GET /ready` (database readiness, 503 during shutdown).

Admin dashboard and table-browser endpoints are documented in [docs/admin.md](docs/admin.md).

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

Most e2e specs use an empty migrated SQLite database with `personas` fixtures. The
`admin-real-data-*.e2e-spec.ts` suites boot the app against a clone of a migrated
Postgres snapshot. Set `NEST_TEST_POSTGRES_URL` to an admin/test role that can
create databases and `NEST_TEST_POSTGRES_SOURCE` to the snapshot database. Each
suite creates and drops its own clone; no mock repository is involved — auth
still uses the `x-mock-user` header with a real user row from the snapshot.

## Deployment

Build once and run `node dist/main` (`pnpm start:prod`). Set `NODE_ENV=production`, `POSTGRES_URL`, and `POSTGRES_POOL_MAX`; listen on `PORT` and in a container bind `0.0.0.0`. The app applies no migrations at boot — run them as a release step before starting the new version:

```bash
pnpm --dir apps/nest db:migrate:postgres
```

`main.ts` handles `SIGTERM`/`SIGINT` explicitly, closes the Nest app and Postgres pool, and force-exits before the 8-second shutdown deadline. It also keeps idle sockets open for 65 s so a load balancer with a longer idle timeout does not see resets. Point your liveness probe at `/health` and readiness at `/ready`.

Throttler counters live in the shared `rate_limit_counter` table, so multiple instances enforce one budget. `CREDITS_ENABLED=true` must be set for résumé charges; otherwise production logs a warning at boot and every résumé is free. Keep `VITE_CREDITS_ENABLED` in the web app aligned.

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

[NestJS Observe](https://observe.nestjs.com) is wired in `AppModule` and turns on automatically in `production` when both `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` are set. Outside production, or without keys, it records and sends nothing.

Run `npx @nestjs/observe link` to issue the key pair into `.env`, then supply the same values as platform secrets in production. `/health` and `/ready` are excluded from traces.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
