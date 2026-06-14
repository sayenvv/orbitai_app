import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="user")
    plan: Mapped[str] = mapped_column(String(32), default="free")
    tokens_used: Mapped[int] = mapped_column(default=0)
    tokens_period_start: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    conversations: Mapped[list["Conversation"]] = relationship(back_populates="user")
    rag_documents: Mapped[list["RagDocument"]] = relationship(back_populates="user")
    library_generated_files: Mapped[list["LibraryGeneratedFile"]] = relationship(
        back_populates="user"
    )
    photo_studio_generations: Mapped[list["PhotoStudioGeneration"]] = relationship(
        back_populates="user"
    )
    photo_studio_workspaces: Mapped[list["PhotoStudioWorkspace"]] = relationship(
        back_populates="user"
    )
    code_workspace_projects: Mapped[list["CodeWorkspaceProject"]] = relationship(
        back_populates="user"
    )
    code_workspace_settings: Mapped["CodeWorkspaceUserSettings | None"] = relationship(
        back_populates="user", uselist=False
    )


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    short_name: Mapped[str] = mapped_column(String(64))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="draft")
    icon_key: Mapped[str] = mapped_column(String(64), default="Sparkles")
    color_key: Mapped[str] = mapped_column(String(64), default="indigo")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    configuration: Mapped["AgentConfiguration | None"] = relationship(
        back_populates="agent", uselist=False
    )
    agent_tools: Mapped[list["AgentTool"]] = relationship(
        back_populates="agent", cascade="all, delete-orphan"
    )
    agent_widgets: Mapped[list["AgentWidget"]] = relationship(
        back_populates="agent", cascade="all, delete-orphan"
    )
    agent_adaptive_cards: Mapped[list["AgentAdaptiveCard"]] = relationship(
        back_populates="agent", cascade="all, delete-orphan"
    )
    personalization: Mapped["AgentPersonalization | None"] = relationship(
        back_populates="agent", uselist=False, cascade="all, delete-orphan"
    )
    theme: Mapped["AgentTheme | None"] = relationship(
        back_populates="agent", uselist=False, cascade="all, delete-orphan"
    )
    conversations: Mapped[list["Conversation"]] = relationship(back_populates="agent")


class AgentConfiguration(Base):
    __tablename__ = "agent_configurations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), unique=True
    )
    model: Mapped[str] = mapped_column(String(64), default="gpt-4o-mini")
    temperature: Mapped[float] = mapped_column(default=0.5)
    max_tokens: Mapped[int] = mapped_column(default=2048)
    system_prompt: Mapped[str] = mapped_column(Text, default="You are a helpful assistant.")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    agent: Mapped["Agent"] = relationship(back_populates="configuration")


class Tool(Base):
    __tablename__ = "tools"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    parameters: Mapped[dict] = mapped_column(JSONB, default=dict)
    enabled: Mapped[bool] = mapped_column(default=True)

    agent_tools: Mapped[list["AgentTool"]] = relationship(back_populates="tool")


class AgentTool(Base):
    __tablename__ = "agent_tools"

    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), primary_key=True
    )
    tool_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tools.id", ondelete="CASCADE"), primary_key=True
    )

    agent: Mapped["Agent"] = relationship(back_populates="agent_tools")
    tool: Mapped["Tool"] = relationship(back_populates="agent_tools")


class Widget(Base):
    __tablename__ = "widgets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    key: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    icon_key: Mapped[str] = mapped_column(String(64), default="Sparkles")

    agent_widgets: Mapped[list["AgentWidget"]] = relationship(back_populates="widget")


class AgentWidget(Base):
    __tablename__ = "agent_widgets"

    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), primary_key=True
    )
    widget_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("widgets.id", ondelete="CASCADE"), primary_key=True
    )

    agent: Mapped["Agent"] = relationship(back_populates="agent_widgets")
    widget: Mapped["Widget"] = relationship(back_populates="agent_widgets")


class AdaptiveCard(Base):
    __tablename__ = "adaptive_cards"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)

    agent_adaptive_cards: Mapped[list["AgentAdaptiveCard"]] = relationship(back_populates="card")


class AgentAdaptiveCard(Base):
    __tablename__ = "agent_adaptive_cards"

    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), primary_key=True
    )
    card_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("adaptive_cards.id", ondelete="CASCADE"), primary_key=True
    )

    agent: Mapped["Agent"] = relationship(back_populates="agent_adaptive_cards")
    card: Mapped["AdaptiveCard"] = relationship(back_populates="agent_adaptive_cards")


class AgentPersonalization(Base):
    __tablename__ = "agent_personalizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), unique=True
    )
    greeting: Mapped[str] = mapped_column(Text, default="")
    avatar_emoji: Mapped[str] = mapped_column(String(16), default="🤖")
    quick_prompts: Mapped[list] = mapped_column(JSONB, default=list)
    tone: Mapped[str] = mapped_column(String(32), default="Friendly")
    response_length: Mapped[str] = mapped_column(String(32), default="Medium")
    language: Mapped[str] = mapped_column(String(32), default="English")

    agent: Mapped["Agent"] = relationship(back_populates="personalization")


class AgentTheme(Base):
    __tablename__ = "agent_themes"

    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), primary_key=True
    )
    border_radius: Mapped[str] = mapped_column(String(32), default="0.625rem")
    density: Mapped[str] = mapped_column(String(32), default="comfortable")
    font_sans: Mapped[str] = mapped_column(String(64), default="Inter")
    bubble_style: Mapped[str] = mapped_column(String(32), default="rounded")
    dark_mode: Mapped[str] = mapped_column(String(32), default="follow system")

    agent: Mapped["Agent"] = relationship(back_populates="theme")


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(512), default="New conversation")
    app_slug: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    source_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rag_documents.id", ondelete="SET NULL"), nullable=True, index=True
    )
    orchestration_session_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    orchestration_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User | None"] = relationship(back_populates="conversations")
    agent: Mapped["Agent | None"] = relationship(back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation",
        order_by="Message.created_at",
        cascade="all, delete-orphan",
    )
    rag_documents: Mapped[list["RagDocument"]] = relationship(
        back_populates="conversation",
        foreign_keys="RagDocument.conversation_id",
    )
    source_document: Mapped["RagDocument | None"] = relationship(
        foreign_keys=[source_id],
        uselist=False,
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(32))
    content: Mapped[str] = mapped_column(Text, default="")
    widget_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")


class PlanLimit(Base):
    __tablename__ = "plan_limits"

    plan: Mapped[str] = mapped_column(String(32), primary_key=True)
    label: Mapped[str] = mapped_column(String(64), default="Free")
    tagline: Mapped[str] = mapped_column(Text, default="")
    features: Mapped[list] = mapped_column(JSONB, default=list)
    highlight: Mapped[bool] = mapped_column(default=False)
    token_limit: Mapped[int] = mapped_column(default=200_000)
    ai_stack: Mapped[dict] = mapped_column(JSONB, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class RagDocument(Base):
    __tablename__ = "rag_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    original_filename: Mapped[str] = mapped_column(String(512))
    mime_type: Mapped[str] = mapped_column(String(128), default="application/pdf")
    storage_path: Mapped[str] = mapped_column(String(1024))
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    page_count: Mapped[int] = mapped_column(Integer, default=0)
    pages_processed: Mapped[int] = mapped_column(Integer, default=0)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    doc_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="rag_documents")
    conversation: Mapped["Conversation | None"] = relationship(
        back_populates="rag_documents",
        foreign_keys=[conversation_id],
    )
    chunks: Mapped[list["RagChunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan", order_by="RagChunk.chunk_index"
    )


class RagChunk(Base):
    __tablename__ = "rag_chunks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rag_documents.id", ondelete="CASCADE"), index=True
    )
    chunk_index: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    page_start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    page_end: Mapped[int | None] = mapped_column(Integer, nullable=True)
    embedding: Mapped[list[float]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    document: Mapped["RagDocument"] = relationship(back_populates="chunks")


class LibraryGeneratedFile(Base):
    __tablename__ = "library_generated_files"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True
    )
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True
    )
    source_document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rag_documents.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(512))
    item_type: Mapped[str] = mapped_column(String(64), default="Generated")
    preview: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="library_generated_files")
    conversation: Mapped["Conversation | None"] = relationship()
    agent: Mapped["Agent | None"] = relationship()
    source_document: Mapped["RagDocument | None"] = relationship()


class PhotoStudioGeneration(Base):
    __tablename__ = "photo_studio_generations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    batch_id: Mapped[str] = mapped_column(String(64), index=True)
    prompt: Mapped[str] = mapped_column(Text)
    creation_type: Mapped[str] = mapped_column(String(32))
    aspect_ratio: Mapped[str] = mapped_column(String(16))
    style_preset: Mapped[str] = mapped_column(String(32))
    label: Mapped[str] = mapped_column(String(128))
    preview_gradient: Mapped[str] = mapped_column(String(255))
    transparent_background: Mapped[bool | None] = mapped_column(nullable=True)
    canvas_background_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    variant_index: Mapped[int] = mapped_column(Integer, default=0)
    reference_asset_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rag_documents.id", ondelete="SET NULL"), nullable=True
    )
    image_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="photo_studio_generations")
    reference_asset: Mapped["RagDocument | None"] = relationship()


class PhotoStudioWorkspace(Base):
    __tablename__ = "photo_studio_workspaces"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(512))
    asset_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rag_documents.id", ondelete="SET NULL"), nullable=True
    )
    asset_name: Mapped[str | None] = mapped_column(String(512), nullable=True)
    state: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    last_opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="photo_studio_workspaces")
    asset: Mapped["RagDocument | None"] = relationship()


class CodeWorkspaceProject(Base):
    __tablename__ = "code_workspace_projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(512))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    state: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    last_opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="code_workspace_projects")


class CodeWorkspaceUserSettings(Base):
    __tablename__ = "code_workspace_user_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    storage_root_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    preferences: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="code_workspace_settings")


from app.models.ai_platform import (  # noqa: E402, F401
    PlatformAgentConfig,
    PlatformAgentRun,
    PlatformArtifact,
    PlatformCheckpoint,
    PlatformExecutionLog,
    PlatformProjectFile,
    PlatformToolConfig,
    PlatformWorkflowConfig,
    PlatformWorkflowRun,
)
