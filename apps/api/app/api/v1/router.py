from fastapi import APIRouter

from app.api.v1 import agent, ai, analytics, auth, automation, contact, crm, integrations, n8n, notion, public, webhooks, workflows

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(contact.router)
api_router.include_router(public.router)
api_router.include_router(workflows.router)
api_router.include_router(automation.router)
api_router.include_router(agent.router)
api_router.include_router(integrations.router)
api_router.include_router(webhooks.router)
api_router.include_router(crm.router)
api_router.include_router(analytics.router)
api_router.include_router(ai.router)
api_router.include_router(notion.router)
api_router.include_router(n8n.router)
