from __future__ import annotations

"""Project starter templates for Clovops code workspaces.

Edit PROJECT_TEMPLATES below to add or change language/framework skeletons.
Each template defines file paths, languages, and initial file contents.
"""

from dataclasses import dataclass

from fastapi import HTTPException, status

from clovai_apps.code_workspace.schemas import (
    CodeWorkspaceNode,
    CodeWorkspaceState,
    CodeWorkspaceUiState,
)

DEFAULT_PROJECT_TEMPLATE_ID = "empty"


@dataclass(frozen=True)
class ProjectTemplateFile:
    path: str
    language: str
    content: str


@dataclass(frozen=True)
class ProjectTemplate:
    id: str
    label: str
    description: str
    language: str
    framework: str | None
    files: tuple[ProjectTemplateFile, ...]


def _file(path: str, language: str, content: str) -> ProjectTemplateFile:
    return ProjectTemplateFile(path=path, language=language, content=content.strip() + "\n")


PROJECT_TEMPLATES: dict[str, ProjectTemplate] = {
    "empty": ProjectTemplate(
        id="empty",
        label="Empty project",
        description="Start with a blank workspace — no files or folders.",
        language="none",
        framework=None,
        files=(),
    ),
    "typescript": ProjectTemplate(
        id="typescript",
        label="TypeScript",
        description="Minimal TypeScript package with src/index.ts and basic config.",
        language="typescript",
        framework=None,
        files=(
            _file(
                "package.json",
                "json",
                """{
  "name": "my-project",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}""",
            ),
            _file(
                "tsconfig.json",
                "json",
                """{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}""",
            ),
            _file(
                "src/index.ts",
                "typescript",
                """export function main(): void {
  console.log("Hello from TypeScript");
}

main();
""",
            ),
            _file(
                "README.md",
                "markdown",
                """# TypeScript project

Run `npm install`, then `npm run build` and `npm start`.
""",
            ),
        ),
    ),
    "python": ProjectTemplate(
        id="python",
        label="Python",
        description="Simple Python script with requirements.txt.",
        language="python",
        framework=None,
        files=(
            _file(
                "main.py",
                "python",
                """def main() -> None:
    print("Hello from Python")


if __name__ == "__main__":
    main()
""",
            ),
            _file("requirements.txt", "plaintext", ""),
            _file(
                "README.md",
                "markdown",
                """# Python project

Create a virtualenv, install deps, then run `python main.py`.
""",
            ),
        ),
    ),
    "python-fastapi": ProjectTemplate(
        id="python-fastapi",
        label="Python · FastAPI",
        description="FastAPI app skeleton with a health route.",
        language="python",
        framework="fastapi",
        files=(
            _file(
                "app/main.py",
                "python",
                """from fastapi import FastAPI

app = FastAPI(title="My API")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
""",
            ),
            _file(
                "requirements.txt",
                "plaintext",
                """fastapi>=0.110.0
uvicorn[standard]>=0.27.0
""",
            ),
            _file(
                "README.md",
                "markdown",
                """# FastAPI project

Install dependencies, then run:

`uvicorn app.main:app --reload`
""",
            ),
        ),
    ),
    "node-express": ProjectTemplate(
        id="node-express",
        label="Node · Express",
        description="Express server skeleton with a health route.",
        language="javascript",
        framework="express",
        files=(
            _file(
                "package.json",
                "json",
                """{
  "name": "my-api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/index.js"
  },
  "dependencies": {
    "express": "^4.19.0"
  }
}""",
            ),
            _file(
                "src/index.js",
                "javascript",
                """import express from "express";

const app = express();
const port = process.env.PORT || 3000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
""",
            ),
            _file(
                "README.md",
                "markdown",
                """# Express project

Run `npm install`, then `npm start`.
""",
            ),
        ),
    ),
}


def list_project_templates() -> list[ProjectTemplate]:
    order = ["empty", "typescript", "python", "python-fastapi", "node-express"]
    return [PROJECT_TEMPLATES[item] for item in order if item in PROJECT_TEMPLATES]


def resolve_project_template(template_id: str | None, *, seed_demo: bool | None = None) -> ProjectTemplate:
    normalized = (template_id or "").strip().lower()
    if not normalized:
        normalized = "typescript" if seed_demo else DEFAULT_PROJECT_TEMPLATE_ID

    if normalized not in PROJECT_TEMPLATES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown project template: {template_id}",
        )
    return PROJECT_TEMPLATES[normalized]


def _slugify_segment(name: str) -> str:
    return name.replace(".", "-").replace("_", "-")


def _build_nodes_from_files(files: tuple[ProjectTemplateFile, ...]) -> tuple[list[CodeWorkspaceNode], dict[str, str]]:
    nodes: list[CodeWorkspaceNode] = []
    contents: dict[str, str] = {}
    folder_ids: dict[str, str] = {}

    def ensure_folder(path_parts: list[str]) -> str | None:
        if not path_parts:
            return None
        current_path = ""
        parent_id: str | None = None
        for part in path_parts:
            current_path = f"{current_path}/{part}" if current_path else part
            if current_path in folder_ids:
                parent_id = folder_ids[current_path]
                continue
            folder_id = f"folder-{_slugify_segment(current_path)}"
            nodes.append(
                CodeWorkspaceNode(
                    id=folder_id,
                    kind="folder",
                    name=part,
                    parent_id=parent_id,
                )
            )
            folder_ids[current_path] = folder_id
            parent_id = folder_id
        return parent_id

    for index, template_file in enumerate(files):
        parts = [segment for segment in template_file.path.split("/") if segment]
        if not parts:
            continue
        file_name = parts[-1]
        parent_id = ensure_folder(parts[:-1])
        file_id = f"file-{_slugify_segment(template_file.path)}-{index}"
        nodes.append(
            CodeWorkspaceNode(
                id=file_id,
                kind="file",
                name=file_name,
                parent_id=parent_id,
                language=template_file.language,
            )
        )
        contents[template_file.path] = template_file.content

    return nodes, contents


def build_state_from_template(template_id: str | None, *, seed_demo: bool | None = None) -> tuple[CodeWorkspaceState, dict[str, str]]:
    template = resolve_project_template(template_id, seed_demo=seed_demo)
    if not template.files:
        return CodeWorkspaceState(), {}

    nodes, contents = _build_nodes_from_files(template.files)
    file_nodes = [node for node in nodes if node.kind == "file"]
    active_file_id = file_nodes[0].id if file_nodes else None
    expanded_folder_ids = [node.id for node in nodes if node.kind == "folder"]

    return (
        CodeWorkspaceState(
            nodes=nodes,
            ui=CodeWorkspaceUiState(
                explorer_focus_id=active_file_id,
                active_file_id=active_file_id,
                expanded_folder_ids=expanded_folder_ids,
                open_file_ids=[active_file_id] if active_file_id else [],
            ),
        ),
        contents,
    )
