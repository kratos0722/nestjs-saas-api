# nestjs-saas-api

A multi-tenant **B2B SaaS API** built with **NestJS + TypeScript**. It demonstrates
the parts of a SaaS backend that are easy to get subtly wrong: tenant isolation,
authentication, role-based access, and input validation — backed by unit and
end-to-end tests that prove the isolation guarantees.

> Original reference implementation. Sample data is synthetic; no proprietary code.

## Why it exists

Most CRUD tutorials skip the hard part of SaaS: making sure one customer can
**never** see or touch another customer's data. Here that rule is enforced in two
places — the service layer always scopes queries to the caller's `orgId`, and the
repositories reject cross-tenant access even if a caller forgets to filter. A
foreign resource id returns `404`, so it is indistinguishable from one that does
not exist.

## Features

- **Tenant onboarding** — `POST /auth/register` creates an organization and its
  first user (the owner) in one step.
- **JWT authentication** — stateless bearer tokens via `@nestjs/jwt` + Passport;
  the token carries `orgId` and `role`.
- **Strict tenant isolation** — every project operation is scoped to the caller's
  org; cross-tenant reads/writes return `404`.
- **Role-based access control** — a `RolesGuard` + `@Roles()` decorator; only an
  `owner` may delete a project.
- **Validated DTOs** — `class-validator` with a global `ValidationPipe`
  (`whitelist` + `forbidNonWhitelisted`) rejects unknown or malformed fields.
- **Clean architecture** — controllers → services → repository interfaces. The
  persistence layer is injected, so swapping storage touches no business logic.

## API

| Method | Path              | Auth        | Description                                 |
| ------ | ----------------- | ----------- | ------------------------------------------- |
| POST   | `/auth/register`  | public      | Create an org + owner, return a JWT         |
| POST   | `/auth/login`     | public      | Exchange credentials for a JWT              |
| POST   | `/projects`       | any member  | Create a project in the caller's org        |
| GET    | `/projects`       | any member  | List the caller's org's projects            |
| GET    | `/projects/:id`   | any member  | Fetch one project (404 if not in your org)  |
| PATCH  | `/projects/:id`   | any member  | Update a project                            |
| DELETE | `/projects/:id`   | owner only  | Delete a project                            |

## Run locally

```bash
npm ci
npm run start:dev      # http://localhost:3000
```

```bash
# Register a tenant and capture the token
curl -s localhost:3000/auth/register \
  -H 'content-type: application/json' \
  -d '{"orgName":"Acme","email":"owner@acme.test","password":"sup3r-secret"}'
```

## Test

```bash
npm test               # unit + e2e (Jest + Supertest)
```

The suite covers service-level tenant isolation, the `RolesGuard`, and a full
HTTP end-to-end flow (registration, auth, cross-tenant `404`, validation `400`,
owner-only delete).

## Persistence

The shipped repositories (`src/common/in-memory.repositories.ts`) are in-memory,
so the API and its tests run with no external database. They sit behind the
interfaces in `src/common/repositories.ts`; a production Postgres adapter
implements those same interfaces and is bound in place of the in-memory ones in
`auth.module.ts` / `projects.module.ts` — no service or controller changes
required.

## Tech

NestJS 10 · TypeScript · Passport JWT · class-validator · Jest · Supertest · Docker

## License

MIT — see [LICENSE](LICENSE).
