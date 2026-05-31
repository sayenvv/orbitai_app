export type AgentSuggestion = {
  id: string;
  label: string;
  prompt: string;
};

const AGENT_SUGGESTIONS: Record<string, AgentSuggestion[]> = {
  "study-helper": [
    {
      id: "summarize",
      label: "Summarize my notes into the key points I should remember",
      prompt: "Summarize my study notes into the key points I should remember.",
    },
    {
      id: "flashcards",
      label: "Create flashcards for a topic I'm studying",
      prompt: "Create 10 flashcards on a topic I'm studying. Ask which topic first.",
    },
    {
      id: "quiz",
      label: "Give me a short practice quiz before my exam",
      prompt: "Give me a 5-question practice quiz. Ask which subject first.",
    },
    {
      id: "explain",
      label: "Explain a difficult concept with a simple analogy",
      prompt: "Explain a concept in simple terms with an everyday analogy.",
    },
  ],
  "job-search": [
    {
      id: "resume",
      label: "Review my resume for the role I'm targeting",
      prompt: "Review my resume and suggest specific improvements for the role I'm targeting.",
    },
    {
      id: "interview",
      label: "Run a mock interview with realistic follow-up questions",
      prompt: "Conduct a mock interview for a role I'm applying to. Ask which role first.",
    },
    {
      id: "cover-letter",
      label: "Help me draft a tailored cover letter",
      prompt: "Help me write a compelling cover letter. Ask for the job and company details.",
    },
    {
      id: "linkedin",
      label: "Improve my LinkedIn headline and about section",
      prompt: "Audit my LinkedIn profile and suggest a stronger headline and about section.",
    },
  ],
  "coding-tutor": [
    {
      id: "debug",
      label: "Help me debug code and explain the fix",
      prompt: "Help me debug my code. I'll paste it — explain what's wrong and how to fix it.",
    },
    {
      id: "concept",
      label: "Explain a programming concept with a code example",
      prompt: "Explain a programming concept with a short code example.",
    },
    {
      id: "review",
      label: "Review my code for best practices and improvements",
      prompt: "Review my code for best practices and suggest improvements.",
    },
    {
      id: "project",
      label: "Suggest a project to build at my skill level",
      prompt: "Suggest a hands-on project to learn a language or framework. Ask my level first.",
    },
  ],
  "career-guidance": [
    {
      id: "paths",
      label: "Which career paths fit my background and interests?",
      prompt: "What career paths fit my skills and interests? Ask me about my background first.",
    },
    {
      id: "roadmap",
      label: "Build a 90-day roadmap toward my next career goal",
      prompt: "Create a 90-day skill roadmap for a career goal I have in mind.",
    },
    {
      id: "switch",
      label: "Plan a transition into a new field or role",
      prompt: "Help me plan a career transition. Ask where I am today and where I want to go.",
    },
    {
      id: "skills",
      label: "Identify skill gaps for a role I want to pursue",
      prompt: "Analyze the skill gap between my profile and a target role.",
    },
  ],
  "language-learning": [
    {
      id: "conversation",
      label: "Practice conversation at my current level",
      prompt: "Let's practice conversation in a language. Ask which language and my level.",
    },
    {
      id: "grammar",
      label: "Explain a grammar rule with clear examples",
      prompt: "Explain a grammar topic with examples and common mistakes to avoid.",
    },
    {
      id: "phrases",
      label: "Teach useful phrases for a situation I describe",
      prompt: "Teach me 15 useful phrases for a situation I describe.",
    },
    {
      id: "correction",
      label: "Correct my writing and explain the grammar",
      prompt: "I'll write a sentence — correct it and explain the grammar.",
    },
  ],
  "general-knowledge": [
    {
      id: "explain",
      label: "Give me a clear, structured overview of a topic",
      prompt: "Explain a topic clearly with headings and the essential facts.",
    },
    {
      id: "compare",
      label: "Compare two ideas and highlight the key differences",
      prompt: "Compare and contrast two topics — ask me which ones.",
    },
    {
      id: "timeline",
      label: "Walk me through the timeline and context of an event",
      prompt: "Give me a timeline and context for a historical or scientific topic.",
    },
    {
      id: "debate",
      label: "Present both sides of a topic with balanced nuance",
      prompt: "Present both sides of a debate fairly, then summarize the nuance.",
    },
  ],
  "trip-adviser": [
    {
      id: "itinerary",
      label: "Plan a day-by-day itinerary for my trip",
      prompt: "Plan a multi-day itinerary. Ask my destination, dates, and travel style.",
    },
    {
      id: "budget",
      label: "Suggest a budget-friendly plan with estimated costs",
      prompt: "Suggest a budget-friendly trip plan with estimated costs.",
    },
    {
      id: "local",
      label: "Share local tips and places worth visiting",
      prompt: "What are local tips and hidden gems for a city I'm visiting?",
    },
    {
      id: "checklist",
      label: "Create a packing and pre-trip checklist",
      prompt: "Create a packing and travel checklist for my upcoming trip.",
    },
  ],
};

const DEFAULT_SUGGESTIONS: AgentSuggestion[] = [
  {
    id: "explain",
    label: "Explain a topic I'm curious about in structured detail",
    prompt: "Explain a topic I'm curious about in simple, structured detail.",
  },
  {
    id: "plan",
    label: "Help me build a step-by-step plan for a goal",
    prompt: "Help me create a step-by-step plan for a goal I have in mind.",
  },
  {
    id: "brainstorm",
    label: "Brainstorm options and compare the best approaches",
    prompt: "Brainstorm ideas with me and compare the best options.",
  },
];

export function getAgentSuggestions(agentSlug: string): AgentSuggestion[] {
  return AGENT_SUGGESTIONS[agentSlug] ?? DEFAULT_SUGGESTIONS;
}
