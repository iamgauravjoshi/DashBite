# Operations — baseline (Phase 0)

## Local development

1. Start Docker Desktop.
2. Copy `.env.example` → `.env`, adjust `POSTGRES_PASSWORD` if needed.
3. `npm.cmd install`
4. `npm.cmd run db:up` (Postgres 18-alpine on 5432)
5. `npx.cmd prisma migrate dev --name init` (first run)
6. `npm.cmd run dev` → http://localhost:3000, `/api/health`

## Environment variables

See `.env.example`. Never commit `.env`. Required: `DATABASE_URL`, `NEXTAUTH_SECRET` (placeholder until P2), `APP_TIMEZONE=Asia/Kolkata`, `APP_DEFAULT_CITY`.

## Backups / recovery / monitoring

- Pilot (P11): documented backup (pg_dump schedule), recovery drill, log retention, uptime check. Not configured in Phase 0 beyond Docker volume `smartmess-pgdata`.
- Production deploy: blocked until Phase 11 checklist + explicit authorization. No prod secrets in repo.

## Support

Pilot support procedures defined in Phase 11. Phase 0: file issues with repro + logs (no customer data in logs).
