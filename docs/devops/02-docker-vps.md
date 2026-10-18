# DevOps Stage 2 — Docker + VPS + CI/CD

**Roadmap phase:** 5 · **Standalone:** yes, needs only the app running locally

## Goal

Run Invoicely yourself on a single Linux server: containerized web app, background worker, and
Postgres, deployed automatically from GitHub, with backups and monitoring.

## What you'll learn

- Writing production Dockerfiles (multi-stage, non-root, small images)
- Linux server basics: SSH keys, firewall, users, updates
- Reverse proxies and automatic TLS
- Container registries and deploy pipelines
- Backups, restores, and uptime monitoring

## Architecture

```
GitHub Actions ── build & push ──▶ GHCR (container registry)
       │
       └── deploy (SSH) ──▶ VPS
                             ├── Caddy (reverse proxy, TLS)
                             ├── web    (Next.js standalone)
                             ├── worker (pg-boss jobs)
                             └── postgres (volume) ──▶ nightly backup → object storage
```

## Steps

1. [ ] Set `output: 'standalone'` in `next.config` and write a multi-stage `Dockerfile`
2. [ ] Add a worker entrypoint that starts pg-boss consumers
3. [ ] Write `compose.yaml` for local dev (web, worker, postgres) and `compose.prod.yaml`
4. [ ] Provision a VPS (e.g. Hetzner, DigitalOcean): non-root user, SSH keys only, `ufw`, automatic security updates
5. [ ] Install Docker; add Caddy as the reverse proxy with automatic HTTPS
6. [ ] CI: build the image, tag it with the git SHA, push to GitHub Container Registry
7. [ ] CD: on merge to `main`, SSH in → pull the image → run migrations → `docker compose up -d`
8. [ ] Secrets: keep them in GitHub Actions secrets and a root-only `.env` on the server
9. [ ] Backups: nightly `pg_dump` to S3-compatible storage with a retention policy; **test a restore**
10. [ ] Add a `/api/health` endpoint and an external uptime monitor
11. [ ] Ship container logs somewhere searchable (start with `docker logs` + log rotation)

## Done when

- A merge to `main` deploys to the VPS with no manual steps
- You have restored a backup into a fresh database at least once
- You get an alert when the site goes down

## Cost notes

A small VPS plus object storage for backups costs a few dollars a month.
