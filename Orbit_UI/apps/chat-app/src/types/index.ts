export type WebSearchImage = {
  imageUrl: string;
  thumbnailUrl?: string | null;
  pageUrl?: string | null;
  title?: string | null;
  alt?: string | null;
  source?: string | null;
};

export type AdaptiveCard = {
  type: "place" | "job" | "web_result" | "image" | string;
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  url?: string | null;
  address?: string | null;
  rating?: string | null;
  price?: string | null;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  salary?: string | null;
  experienceLevel?: string | null;
  source?: string | null;
  badges?: string[];
};

export type MessageRoutingMetadata = {
  routing?: {
    primary_agent: string;
    selected_agents: string[];
    intent: string;
    topics: string[];
    reasoning: string;
  } | null;
  orchestration_status?: string | null;
  human_prompt?: string | null;
  images?: WebSearchImage[];
  cards?: AdaptiveCard[];
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: MessageRoutingMetadata;
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  contextSource?: StudySource | null;
  createdAt: Date;
  updatedAt: Date;
  agentId?: string | null;
  agentSlug?: string | null;
  agentName?: string | null;
  agentShortName?: string | null;
  iconKey?: string | null;
  colorKey?: string | null;
  appSlug?: string | null;
  sourceId?: string | null;
};

export type ChatRequest = {
  message: string;
  conversationId?: string;
  context?: string;
  sourceId?: string;
  sourceType?: "study-material" | "uploaded-file" | "webpage";
};

export type ChatResponse = {
  message: Message;
  conversationId: string;
};

export type StudySource = {
  id: string;
  name: string;
  type: "study-material" | "uploaded-file" | "webpage";
  subject?: string;
  url?: string;
  status?: "pending" | "processing" | "ready" | "failed";
  createdAt: Date;
};
