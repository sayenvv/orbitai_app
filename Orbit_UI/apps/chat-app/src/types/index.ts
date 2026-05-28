export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  contextSource?: StudySource | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ChatRequest = {
  message: string;
  conversationId?: string;
  context?: string;
  sourceId?: string;
  sourceType?: "study-material" | "uploaded-file";
};

export type ChatResponse = {
  message: Message;
  conversationId: string;
};

export type StudySource = {
  id: string;
  name: string;
  type: "study-material" | "uploaded-file";
  subject?: string;
  createdAt: Date;
};
