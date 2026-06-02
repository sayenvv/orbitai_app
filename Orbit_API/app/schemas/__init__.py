from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, model_validator


# --- Auth ---


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    role: str
    email_verified: bool = True
    image: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class AuthResponse(BaseModel):
    user: UserResponse


# --- Agents (public) ---


class PublicAgentResponse(BaseModel):
    id: UUID
    slug: str
    name: str
    short_name: str
    description: str
    icon_key: str
    color_key: str


class PublicAgentListResponse(BaseModel):
    data: list[PublicAgentResponse]


class DefaultChatResponse(BaseModel):
    assistant_name: str
    description: str


# --- Chat ---


class StreamHistoryItem(BaseModel):
    role: str
    content: str


class StreamMessageRequest(BaseModel):
    message: str
    conversation_id: UUID | None = None
    agent_id: str | None = None
    app_slug: str | None = None
    source_id: UUID | None = None
    source_type: str | None = None
    history: list[StreamHistoryItem] = Field(default_factory=list)


class CreateConversationRequest(BaseModel):
    agent_id: str | None = None
    title: str = "New conversation"


class ConversationSummary(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    agent_id: UUID | None = None
    agent_slug: str | None = None
    agent_name: str | None = None
    agent_short_name: str | None = None
    icon_key: str | None = None
    color_key: str | None = None
    app_slug: str | None = None
    source_id: UUID | None = None

    model_config = {"from_attributes": True}


class ConversationListResponse(BaseModel):
    data: list[ConversationSummary]
    has_more: bool = False
    next_offset: int | None = None


class MessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    timestamp: datetime

    model_config = {"from_attributes": True}


class ConversationDetailResponse(BaseModel):
    messages: list[MessageResponse]


class SubscriptionResponse(BaseModel):
    plan: str = "free"
    tokens_used: int = 0
    tokens_limit: int | None = None
    tokens_remaining: int | None = None
    period_start: datetime | None = None
    period_end: datetime | None = None
    usage_percent: float = 0.0
    limit_reached: bool = False


class PlanLimitItem(BaseModel):
    plan: str
    label: str
    tagline: str = ""
    features: list[str] = Field(default_factory=list)
    highlight: bool = False
    token_limit: int | None
    token_limit_raw: int
    updated_at: datetime | None = None


class PlanLimitsResponse(BaseModel):
    data: list[PlanLimitItem]


class PlanLimitPatch(BaseModel):
    token_limit: int | None = None
    label: str | None = None
    tagline: str | None = None
    features: list[str] | None = None
    highlight: bool | None = None
    ai_stack: dict | None = None


class ChatStackItem(BaseModel):
    provider: str = "ollama"
    model: str = "llama3.2"
    deployment: str | None = None


class EmbeddingStackItem(BaseModel):
    provider: str = "fastembed"
    model: str = "BAAI/bge-small-en-v1.5"
    deployment: str | None = None
    dimensions: int = 384


class PlanAiStackItem(BaseModel):
    chat: ChatStackItem
    embeddings: EmbeddingStackItem


class PlanLimitControlItem(PlanLimitItem):
    ai_stack: PlanAiStackItem


class PlanLimitsControlResponse(BaseModel):
    data: list[PlanLimitControlItem]


class PlanLimitsUpdate(BaseModel):
    plans: dict[str, PlanLimitPatch]


class TokenUsageResponse(BaseModel):
    tokens_used: int
    tokens_limit: int | None
    tokens_remaining: int | None
    usage_percent: float
    limit_reached: bool


# --- RAG documents ---


class RagDocumentResponse(BaseModel):
    id: UUID
    user_id: UUID
    conversation_id: UUID | None = None
    original_filename: str
    name: str
    original_name: str
    mime_type: str
    file_size_bytes: int
    page_count: int
    pages_processed: int
    chunk_count: int
    status: str
    error_message: str | None = None
    metadata: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime | None = None


class RagDocumentListResponse(BaseModel):
    data: list[RagDocumentResponse]


class PdfInspectResponse(BaseModel):
    total_pages: int
    page_limit: int | None
    pages_indexed: int
    will_truncate: bool
    plan: str


class ImportWebpageRequest(BaseModel):
    url: str = Field(min_length=4, max_length=2048)
    conversation_id: UUID | None = None


class CrawlRequest(BaseModel):
    url: str = Field(min_length=4, max_length=2048)
    follow_links: bool = Field(
        default=True,
        description="Recursively fetch every discovered link (one page at a time).",
    )
    complete: bool = Field(
        default=True,
        description="Scrape until no links remain (up to crawl_max_pages, default 500).",
    )
    max_depth: int | None = Field(
        default=None,
        ge=0,
        le=20,
        description="Optional link-depth cap. Omit for full recursive crawl.",
    )
    max_pages: int | None = Field(
        default=None,
        ge=1,
        le=1000,
        description="Page cap. Omit with complete=true to drain the whole queue (up to 500).",
    )
    same_origin_only: bool = True
    path_prefix_scope: bool = Field(
        default=False,
        description="When true, only follow links under the start page's directory.",
    )
    auto_doc_scope: bool = Field(
        default=True,
        description="Auto-limit follow to the doc section (e.g. /en-us/agent-framework on Learn).",
    )
    include_links: bool = True
    fetch_retries: int | None = Field(
        default=None,
        ge=1,
        le=5,
        description="Per-page fetch attempts before marking URL failed (default 3).",
    )

    @model_validator(mode="after")
    def apply_nested_defaults(self) -> "CrawlRequest":
        if not self.follow_links:
            self.max_depth = 0
            self.max_pages = 1
            self.complete = False
        return self


class CrawledPageResponse(BaseModel):
    url: str
    title: str
    text: str
    depth: int
    links: list[str] = Field(default_factory=list)


class CrawlResponse(BaseModel):
    start_url: str
    pages: list[CrawledPageResponse]
    page_count: int
    truncated: bool = False
    failed_urls: list[str] = Field(default_factory=list)
    combined_text: str = ""
    pending_urls: int = 0
    pending_url_list: list[str] = Field(default_factory=list)
    max_pages_limit: int = 0


class CreateUploadInsightsRequest(BaseModel):
    insight_types: list[str] | None = None


class LibraryGeneratedFileResponse(BaseModel):
    id: UUID
    title: str
    type: str
    preview: str = ""
    conversation_id: UUID | None = None
    agent_id: UUID | None = None
    source_document_id: UUID | None = None
    source_filename: str | None = None
    agent_slug: str | None = None
    agent_name: str = "Clovai"
    agent_short_name: str | None = None
    icon_key: str = "Sparkles"
    color_key: str = "indigo"
    created_at: datetime
    updated_at: datetime | None = None


class LibraryResponse(BaseModel):
    uploads: list[RagDocumentResponse]
    generated: list[LibraryGeneratedFileResponse]


# --- Local LLM ---


class LlmModelResponse(BaseModel):
    name: str
    size: int | None = None
    modified_at: datetime | None = None
    digest: str | None = None
    family: str | None = None
    parameter_size: str | None = None
    quantization_level: str | None = None


class LlmModelListResponse(BaseModel):
    data: list[LlmModelResponse]


class LlmStatusResponse(BaseModel):
    available: bool
    base_url: str
    default_model: str
    provider: str


# --- Control center ---


class ControlAgentResponse(BaseModel):
    id: UUID
    slug: str
    name: str
    short_name: str
    description: str
    status: str
    icon_key: str
    color_key: str

    model_config = {"from_attributes": True}


class ControlAgentCreate(BaseModel):
    slug: str
    name: str
    short_name: str
    description: str = ""
    status: str = "draft"
    icon_key: str = "Sparkles"
    color_key: str = "indigo"


class ControlAgentUpdate(BaseModel):
    name: str | None = None
    short_name: str | None = None
    description: str | None = None
    status: str | None = None
    icon_key: str | None = None
    color_key: str | None = None


class ControlConfigurationResponse(BaseModel):
    model: str
    temperature: float
    max_tokens: int
    system_prompt: str


class ControlConfigurationUpdate(BaseModel):
    model: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    system_prompt: str | None = None


class ControlToolItem(BaseModel):
    id: UUID | None = None
    name: str
    description: str = ""
    parameters: dict = Field(default_factory=dict)
    enabled: bool = True


class ControlWidgetItem(BaseModel):
    id: UUID
    key: str
    name: str
    description: str
    icon_key: str

    model_config = {"from_attributes": True}


class ControlAgentWidgetsResponse(BaseModel):
    widgets: list[ControlWidgetItem]
    enabled_widget_ids: list[UUID]


class ControlAgentWidgetsUpdate(BaseModel):
    enabled_widget_ids: list[UUID]


class ControlAdaptiveCardItem(BaseModel):
    id: UUID | None = None
    name: str
    description: str = ""
    payload: dict = Field(default_factory=dict)


class ControlPersonalizationResponse(BaseModel):
    id: UUID
    agent_id: UUID
    greeting: str
    avatar_emoji: str
    quick_prompts: list[str]
    tone: str
    response_length: str
    language: str

    model_config = {"from_attributes": True}


class ControlPersonalizationUpdate(BaseModel):
    greeting: str
    avatar_emoji: str
    quick_prompts: list[str]
    tone: str
    response_length: str
    language: str = "English"


class ControlThemeResponse(BaseModel):
    color_key: str
    border_radius: str
    density: str
    font_sans: str
    bubble_style: str
    dark_mode: str


class ControlThemeUpdate(BaseModel):
    color_key: str | None = None
    border_radius: str | None = None
    density: str | None = None
    font_sans: str | None = None
    bubble_style: str | None = None
    dark_mode: str | None = None
