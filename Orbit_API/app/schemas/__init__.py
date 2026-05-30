from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


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


# --- Chat ---


class StreamMessageRequest(BaseModel):
    message: str
    conversation_id: UUID | None = None
    agent_id: str | None = None
    source_id: UUID | None = None
    source_type: str | None = None


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


# --- Ollama ---


class OllamaModelResponse(BaseModel):
    name: str
    size: int | None = None
    modified_at: datetime | None = None
    digest: str | None = None
    family: str | None = None
    parameter_size: str | None = None
    quantization_level: str | None = None


class OllamaModelListResponse(BaseModel):
    data: list[OllamaModelResponse]


class OllamaStatusResponse(BaseModel):
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
