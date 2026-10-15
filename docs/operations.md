# Operations — baseline (Phase 0)

## Local development

1. Start Docker Desktop.
2. Copy `.env.example` → `.env`, adjust `POSTGRES_PASSWORD` if needed.
3. `npm.cmd install`
4. `npm.cmd run db:up` (Postgres 18-alpine on 5432)
5. `npx.cmd prisma migrate dev --name init` (first run)
6. `npm.cmd run dev` → http://localhost:3000, `/api/health`

## Environment variables

See `.env.example`. Never commit `.env`. Required: `DATABASE_URL`, `BETTER_AUTH_SECRET` (≥32 chars), `BETTER_AUTH_URL`, `APP_TIMEZONE=Asia/Kolkata`, `APP_DEFAULT_CITY`.

## Auth operations (Phase 2)

- Email delivery is DEV-CONSOLE ONLY (server terminal + test outbox). Production MUST configure a real provider before pilot — the sender throws in `NODE_ENV=production` by design.
- First platform admin: `npx.cmd auth@latest create-admin --email <e> --name "<n>" --role PLATFORM_ADMIN --password "<pw>"`. The bootstrap opens exactly once; later attempts are rejected. Further admins are managed in-console (Phase 10).
- Staff accounts cannot self-register (API + hook reject with guidance). Owner invites arrive in Phase 3.
- Suspended/deactivated accounts: sign-in blocked (ban) and API blocked (status); ban revokes sessions.

## Test database

Integration tests use `smartmess_test` on the same Postgres container (auto-created + `migrate deploy` in `beforeAll`). Never point them at the dev database. Rate limiting is disabled under `NODE_ENV=test` only.

## Backups / recovery / monitoring

- Pilot (P11): documented backup (pg_dump schedule), recovery drill, log retention, uptime check. Not configured in Phase 0 beyond Docker volume `smartmess-pgdata`.
- Production deploy: blocked until Phase 11 checklist + explicit authorization. No prod secrets in repo.

## Support

Pilot support procedures defined in Phase 11. Phase 0: file issues with repro + logs (no customer data in logs).
