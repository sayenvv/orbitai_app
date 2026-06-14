from fastapi import APIRouter

from app.api.v1.control.agent_resources import router as control_agent_resources_router
from app.api.v1.control.agents import router as control_agents_router
from app.api.v1.control.plan_limits import router as control_plan_limits_router
from app.api.v1.control.platform_config import router as control_platform_config_router
from app.api.v1.platform.dashboard import router as platform_dashboard_router
from app.api.v1.public.ai_platform import router as ai_platform_router
from app.api.v1.public.apps import router as apps_router
from app.api.v1.public.auth import router as auth_router
from app.api.v1.public.crawl import router as crawl_router
from app.api.v1.public.chat import router as chat_router
from app.api.v1.public.files import router as files_router
from app.api.v1.public.library import router as library_router
from app.api.v1.public.multi_agent import router as multi_agent_router
from app.api.v1.public.media import router as media_router
from app.api.v1.public.misc import router as misc_router
from app.api.v1.public.llm import router as llm_router
from app.api.v1.public.photo_studio import router as photo_studio_router
from app.api.v1.public.project_planning import router as project_planning_router
from app.api.v1.public.code_workspace import router as code_workspace_router

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router)
api_router.include_router(apps_router)
api_router.include_router(photo_studio_router)
api_router.include_router(project_planning_router)
api_router.include_router(code_workspace_router)
api_router.include_router(chat_router)
api_router.include_router(crawl_router)
api_router.include_router(files_router)
api_router.include_router(media_router)
api_router.include_router(misc_router)
api_router.include_router(library_router)
api_router.include_router(llm_router)
api_router.include_router(multi_agent_router)
api_router.include_router(control_agents_router)
api_router.include_router(control_agent_resources_router)
api_router.include_router(control_plan_limits_router)
api_router.include_router(control_platform_config_router)
api_router.include_router(platform_dashboard_router)
api_router.include_router(ai_platform_router)
