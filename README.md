# AgentFlow CRM

AI-powered CRM with drag-and-drop workflows, OpenAI/Claude agents, Gmail/Sheets integrations, n8n sync, and analytics.

![Dashboard](docs/screenshots/dashboard.png)

## Features

| Module | Capabilities |
|--------|----------------|
| **Auth** | GitHub OAuth, JWT sessions |
| **CRM** | Leads, contacts, companies, deals, tasks, notes |
| **Workflows** | React Flow builder — trigger, AI, CRM, n8n, Gmail, Sheets, webhooks |
| **AI Agents** | Lead qualification, email generation, meeting summaries, tool calling |
| **Integrations** | Gmail, Google Sheets, webhooks, n8n import/export/trigger |
| **Analytics** | Workflow runs, success rate, token usage, cost, lead conversion charts |
| **UI** | Dark mode, toasts, skeleton loaders, mobile-responsive dashboard |
| **Security** | Rate limiting, security headers |

## Screenshots

| Dashboard | Workflow Builder |
|-----------|------------------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Workflow Builder](docs/screenshots/workflow-builder.png) |

| Analytics | CRM Leads |
|-----------|-----------|
| ![Analytics](docs/screenshots/analytics.png) | ![CRM Leads](docs/screenshots/crm-leads.png) |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Backend | FastAPI, SQLAlchemy, Alembic |
| Database | PostgreSQL 16 |
| Auth | JWT + GitHub OAuth |
| Deploy | Vercel (web) · Render (API + Postgres) |

## Project Structure

```
.
├── apps/
│   ├── api/              # FastAPI backend
│   └── web/              # Next.js frontend
├── docs/screenshots/     # Product screenshots
├── docker-compose.yml
├── render.yaml           # Render blueprint
└── .env.example
```

## Quick Start (Local)

### 1. Environment

```bash
cp .env.example .env
```

Set `SECRET_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and optional AI/integration keys.

**GitHub OAuth App**

- Homepage: `http://localhost:3000`
- Callback: `http://localhost:8000/api/v1/auth/github/callback`

### 2. Docker

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

### 3. Without Docker

```bash
docker compose up db -d
cd apps/api && pip install -r requirements.txt && alembic upgrade head
uvicorn app.main:app --reload --port 8000

# separate terminal
npm install && npm run dev
```

## Deployment

### Frontend — Vercel

1. Import the repo on [Vercel](https://vercel.com).
2. Set **Root Directory** to `apps/web`.
3. Add environment variables:

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `https://agentflow-api.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |

4. Deploy. `apps/web/vercel.json` configures the Next.js build.

### Backend — Render

1. Connect the repo on [Render](https://render.com).
2. Use **Blueprint** with `render.yaml`, or create:
   - **PostgreSQL** database (`agentflow`)
   - **Web Service** — Docker, context `apps/api`, Dockerfile `apps/api/Dockerfile`
3. Set environment variables (see `.env.example`). Important:

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Auto-linked from Render Postgres |
| `FRONTEND_URL` | Your Vercel URL |
| `CORS_ORIGINS` | Same Vercel URL |
| `API_PUBLIC_URL` | Render service URL |
| `GITHUB_CALLBACK_URL` | `https://<api>/api/v1/auth/github/callback` |
| `ENVIRONMENT` | `production` |

4. On deploy, `start.sh` runs migrations then starts Uvicorn.

### Post-deploy checklist

- [ ] GitHub OAuth callback URLs updated for production domains
- [ ] Google/Slack redirect URIs point to Render API
- [ ] `NEXT_PUBLIC_API_URL` matches Render API URL
- [ ] CORS includes Vercel frontend origin

## Security

- **Rate limiting** — auth and public form endpoints limited per IP
- **Security headers** — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, HSTS in production

## API Overview

| Prefix | Description |
|--------|-------------|
| `/api/v1/auth` | GitHub OAuth, JWT |
| `/api/v1/contact` | Public contact form |
| `/api/v1/public` | Public webhook access requests |
| `/api/v1/workflows` | Workflow CRUD + execution |
| `/api/v1/agent` | AI templates, runs, history |
| `/api/v1/integrations` | OAuth connectors, webhooks |
| `/api/v1/crm` | Leads, contacts, deals, tasks, notes |
| `/api/v1/analytics` | Dashboard metrics |
| `/api/v1/n8n` | Import, export, push, trigger |

## UI (Phase 8)

- **Dark mode** — header theme toggle (light / dark / system)
- **Toasts** — Sonner notifications for saves, errors, workflow runs
- **Skeletons** — loading placeholders on dashboard and list pages
- **Error boundaries** — `error.tsx` and `global-error.tsx`
- **Mobile** — collapsible sidebar, responsive workflow builder and charts

## License

Private — AgentFlow CRM
# AgentFlow
