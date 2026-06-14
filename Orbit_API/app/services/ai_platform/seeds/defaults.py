"""Default admin-configurable agent, tool, and workflow definitions."""

from __future__ import annotations

from app.services.ai_platform.templates.premium_design import PREMIUM_NEXTJS_FILES, PREMIUM_STATIC_FILES

DEFAULT_AGENT_CONFIGS: list[dict] = [
    {
        "name": "Intent Classifier",
        "role_key": "intent_classifier",
        "workflow_stage": "intent_classification",
        "model_name": "gpt-4o-mini",
        "temperature": 0.0,
        "max_tokens": 1024,
        "system_prompt": (
            "Classify the user request. Return JSON only:\n"
            '{"intent":"project_generation|code_edit|bug_fix|explanation|documentation|deployment",'
            '"project_type":"website|api|fullstack|other","requires_code_generation":true,'
            '"requires_zip":true,"framework_guess":"static_html|nextjs|fastapi|react|other"}. '
            "Use framework_guess=static_html when the user asks for plain HTML/CSS, a static site, "
            "or explicitly says no React/framework."
        ),
        "tools": [],
    },
    {
        "name": "Requirement Agent",
        "role_key": "requirement",
        "workflow_stage": "requirements",
        "model_name": "gpt-4o-mini",
        "temperature": 0.2,
        "system_prompt": (
            "Convert the user prompt into structured requirements. Return JSON only with keys: "
            "project_name, features, pages, tech_stack, non_functional_requirements, acceptance_criteria. "
            "If the user wants plain HTML/CSS, set tech_stack to [\"HTML\", \"CSS\"] and avoid React/Next.js. "
            "Always include acceptance criteria for premium visual design: responsive layout, consistent spacing, "
            "accessible contrast, and no broken asset references."
        ),
        "tools": [],
    },
    {
        "name": "Planning Agent",
        "role_key": "planning",
        "workflow_stage": "planning",
        "model_name": "gpt-4o-mini",
        "system_prompt": (
            "Create an SDLC execution plan. Return JSON only: "
            '{"phases":[{"name":"...","tasks":["..."]}]}'
        ),
        "tools": [],
    },
    {
        "name": "Architecture Agent",
        "role_key": "architecture",
        "workflow_stage": "architecture",
        "model_name": "gpt-4o",
        "temperature": 0.2,
        "system_prompt": (
            "Design project architecture. Return JSON only with keys: framework, language, "
            "folder_structure, dependencies, entry_points, build_command, template_key. "
            "template_key must be one of: static_html, nextjs_basic, fastapi_react. "
            "Use static_html for simple HTML/CSS sites with no build step; use nextjs_basic only "
            "when the user wants React or Next.js."
        ),
        "tools": ["file_tree"],
    },
    {
        "name": "Task Breakdown Agent",
        "role_key": "task_breakdown",
        "workflow_stage": "task_breakdown",
        "model_name": "gpt-4o-mini",
        "system_prompt": (
            'Break architecture into file tasks. Return JSON only: {"tasks":[{"id":"T1",'
            '"file_path":"...","instruction":"..."}]}'
        ),
        "tools": ["file_tree"],
    },
    {
        "name": "Code Generation Agent",
        "role_key": "code_generation",
        "workflow_stage": "code_generation",
        "model_name": "gpt-4o",
        "temperature": 0.1,
        "max_tokens": 32768,
        "retry_policy": {"max_retries": 4, "timeout_seconds": 300},
        "system_prompt": (
            "Generate code for ONE assigned file per response. Return JSON only: "
            '{"files":[{"path":"...","content":"..."}]}. '
            "Design rules: production-quality UI, generous whitespace, consistent typography, responsive layout, "
            "accessible color contrast, no placeholder broken images (use CSS gradients instead). "
            "For static HTML/CSS: NEVER rename existing CSS classes — only change copy, theme variables, and content. "
            "Keep stylesheet href as styles.css and script src as script.js unless instructed otherwise. "
            "Escape JSON string characters properly."
        ),
        "tools": ["file_reader", "file_tree", "dependency_analyzer"],
    },
    {
        "name": "Validation Agent",
        "role_key": "validation",
        "workflow_stage": "validation",
        "model_name": "gpt-4o-mini",
        "system_prompt": (
            "Analyze build/test output. Return JSON only: "
            '{"status":"passed|failed","errors":[],"suggested_fix_files":[]}'
        ),
        "tools": ["command_runner", "file_tree"],
    },
    {
        "name": "Fix Agent",
        "role_key": "fix",
        "workflow_stage": "fix",
        "model_name": "gpt-4o",
        "temperature": 0.1,
        "max_tokens": 16384,
        "retry_policy": {"max_retries": 4, "timeout_seconds": 300},
        "system_prompt": (
            "Fix failed files using errors. Return JSON only: "
            '{"patches":[{"path":"...","operation":"replace","content":"..."}]}'
        ),
        "tools": ["file_reader", "patch_apply", "dependency_analyzer"],
    },
    {
        "name": "Review Agent",
        "role_key": "review",
        "workflow_stage": "review",
        "model_name": "gpt-4o-mini",
        "retry_policy": {"max_retries": 2, "timeout_seconds": 300},
        "system_prompt": (
            "Review project quality and security. Return JSON only with keys: passed, issues, "
            "missing_files, security_warnings. Keep issues short."
        ),
        "tools": ["file_tree", "security_scan", "code_search"],
    },
    {
        "name": "Documentation Agent",
        "role_key": "documentation",
        "workflow_stage": "documentation",
        "model_name": "gpt-4o-mini",
        "retry_policy": {"max_retries": 2, "timeout_seconds": 300},
        "system_prompt": (
            "Generate README and setup docs. Return JSON only: "
            '{"files":[{"path":"README.md","content":"..."}]}'
        ),
        "tools": ["file_tree"],
    },
    {
        "name": "Artifact Agent",
        "role_key": "artifact",
        "workflow_stage": "artifact",
        "model_name": "gpt-4o-mini",
        "temperature": 0.0,
        "retry_policy": {"max_retries": 1, "timeout_seconds": 120},
        "system_prompt": (
            "Prepare artifact metadata. Return JSON only: "
            '{"artifact_name":"project.zip","include_paths":[],"exclude_paths":'
            '["node_modules",".next","dist","build","__pycache__",".git",".env"]}'
        ),
        "tools": ["zip_tool"],
    },
]

DEFAULT_TOOL_CONFIGS: list[dict] = [
    {"name": "file_writer", "tool_type": "file_writer", "description": "Create/update/delete files"},
    {"name": "file_reader", "tool_type": "file_reader", "description": "Read workspace files"},
    {"name": "file_tree", "tool_type": "file_tree", "description": "List workspace structure"},
    {"name": "command_runner", "tool_type": "command_runner", "description": "Run sandboxed commands"},
    {"name": "patch_apply", "tool_type": "patch_apply", "description": "Apply file patches"},
    {"name": "dependency_analyzer", "tool_type": "dependency_analyzer", "description": "Inspect deps"},
    {"name": "code_search", "tool_type": "code_search", "description": "Search project files"},
    {"name": "zip_tool", "tool_type": "zip_tool", "description": "Create ZIP artifacts"},
    {"name": "blob_upload", "tool_type": "blob_upload", "description": "Upload to Azure Blob"},
    {"name": "validation", "tool_type": "validation", "description": "Run build/test checks"},
    {"name": "security_scan", "tool_type": "security_scan", "description": "Scan for secrets/issues"},
]

DEFAULT_WORKFLOW_CONFIG = {
    "name": "project_generation_mvp",
    "intent": "project_generation",
    "require_human_approval": False,
    "max_fix_attempts": 3,
    "stages_json": [
        {"stage": "intent_classification", "role_key": "intent_classifier"},
        {"stage": "requirements", "role_key": "requirement"},
        {"stage": "planning", "role_key": "planning"},
        {"stage": "architecture", "role_key": "architecture"},
        {"stage": "task_breakdown", "role_key": "task_breakdown"},
        {"stage": "code_generation", "role_key": "code_generation"},
        {"stage": "write_files", "role_key": "code_generation"},
        {"stage": "validation", "role_key": "validation"},
        {"stage": "fix", "role_key": "fix"},
        {"stage": "review", "role_key": "review"},
        {"stage": "documentation", "role_key": "documentation"},
        {"stage": "artifact", "role_key": "artifact"},
        {"stage": "upload", "role_key": "artifact"},
    ],
}

PROJECT_TEMPLATES: dict[str, dict] = {
    "nextjs_basic": {
        "framework": "Next.js",
        "language": "TypeScript",
        "build_command": "npm run build",
        "files": PREMIUM_NEXTJS_FILES,
    },
    "fastapi_react": {
        "framework": "FastAPI + React",
        "language": "Python + TypeScript",
        "build_command": "npm run build",
        "files": {
            "backend/main.py": (
                "from fastapi import FastAPI\napp=FastAPI()\n@app.get('/health')\n"
                "def health(): return {'status':'ok'}"
            ),
            "backend/requirements.txt": "fastapi\nuvicorn[standard]\n",
            "frontend/package.json": (
                '{"name":"frontend","private":true,"scripts":{"dev":"vite","build":"vite build"},'
                '"dependencies":{"react":"19.0.0","react-dom":"19.0.0"},'
                '"devDependencies":{"vite":"6.0.3","@vitejs/plugin-react":"4.3.4","typescript":"5.7.2"}}'
            ),
        },
    },
    "static_html": {
        "framework": "Static HTML",
        "language": "HTML/CSS/JS",
        "build_command": "",
        "files": PREMIUM_STATIC_FILES,
    },
}
