from fastapi import APIRouter

from app.api.v1.control.agents import router as control_agents_router
from app.api.v1.platform.dashboard import router as platform_router
from app.api.v1.public.auth import router as auth_router
from app.api.v1.public.chat import router as chat_router
from app.api.v1.public.misc import router as misc_router

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router)
api_router.include_router(chat_router)
api_router.include_router(misc_router)
api_router.include_router(control_agents_router)
api_router.include_router(platform_router)
