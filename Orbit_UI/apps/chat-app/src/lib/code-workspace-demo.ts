export type CodeTreeNode =
  | { kind: "folder"; name: string; children: CodeTreeNode[] }
  | { kind: "file"; name: string; path: string };

export type CodeWorkspaceFile = {
  path: string;
  language: string;
  content: string;
};

export const CODE_PROJECT_NAME = "AXIOM-API-CLIENT";

export const CODE_PROJECT_TREE: CodeTreeNode[] = [
  {
    kind: "folder",
    name: "src",
    children: [
      { kind: "file", name: "client.ts", path: "src/client.ts" },
      { kind: "file", name: "factory.ts", path: "src/factory.ts" },
      { kind: "file", name: "rate-limiter.ts", path: "src/rate-limiter.ts" },
      { kind: "file", name: "types.ts", path: "src/types.ts" },
      { kind: "file", name: "utils.ts", path: "src/utils.ts" },
    ],
  },
  { kind: "file", name: "index.ts", path: "index.ts" },
  { kind: "file", name: "package.json", path: "package.json" },
  { kind: "file", name: "tsconfig.json", path: "tsconfig.json" },
  { kind: "file", name: "README.md", path: "README.md" },
];

export const CODE_WORKSPACE_FILES: Record<string, CodeWorkspaceFile> = {
  "src/client.ts": {
    path: "src/client.ts",
    language: "typescript",
    content: `import type { AxiomConfig, CompletionMessage, CompletionOptions, CompletionResult } from './types';
import { RateLimiter } from './rate-limiter';

const DEFAULT_BASE_URL = 'https://api.axiom.ai/v1';

/**
 * Core HTTP client for the Axiom API.
 * Handles authentication, rate limiting, and request retries.
 */
export class AxiomClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly limiter: RateLimiter;

  constructor(config: AxiomConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.limiter = new RateLimiter(config.maxRequestsPerMinute ?? 60);
  }

  async complete(
    model: string,
    messages: CompletionMessage[],
    options?: CompletionOptions,
  ): Promise<CompletionResult> {
    await this.limiter.acquire();

    const response = await fetch(\`\${this.baseUrl}/completions\`, {
      method: 'POST',
      headers: {
        Authorization: \`Bearer \${this.apiKey}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, ...options }),
    });

    if (!response.ok) {
      throw new Error(\`Axiom API error: \${response.status}\`);
    }

    return (await response.json()) as CompletionResult;
  }

  async embed(model: string, input: string | string[]): Promise<number[][]> {
    await this.limiter.acquire();

    const response = await fetch(\`\${this.baseUrl}/embeddings\`, {
      method: 'POST',
      headers: {
        Authorization: \`Bearer \${this.apiKey}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, input }),
    });

    if (!response.ok) {
      throw new Error(\`Axiom API error: \${response.status}\`);
    }

    const payload = (await response.json()) as { data: Array<{ embedding: number[] }> };
    return payload.data.map((row) => row.embedding);
  }
}
`,
  },
  "src/types.ts": {
    path: "src/types.ts",
    language: "typescript",
    content: `export type CompletionMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type CompletionOptions = {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
};

export type CompletionResult = {
  text: string;
  usage: {
    input: number;
    output: number;
  };
};

export type AxiomConfig = {
  apiKey: string;
  baseUrl?: string;
  maxRequestsPerMinute?: number;
};
`,
  },
  "src/factory.ts": {
    path: "src/factory.ts",
    language: "typescript",
    content: `import { AxiomClient } from './client';
import type { AxiomConfig } from './types';

export function createAxiomClient(config: AxiomConfig): AxiomClient {
  if (!config.apiKey?.trim()) {
    throw new Error('Axiom API key is required');
  }

  return new AxiomClient(config);
}
`,
  },
  "src/rate-limiter.ts": {
    path: "src/rate-limiter.ts",
    language: "typescript",
    content: `export class RateLimiter {
  private readonly maxPerMinute: number;
  private timestamps: number[] = [];

  constructor(maxPerMinute: number) {
    this.maxPerMinute = Math.max(1, maxPerMinute);
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < 60_000);

    if (this.timestamps.length >= this.maxPerMinute) {
      const waitMs = 60_000 - (now - this.timestamps[0]);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.acquire();
    }

    this.timestamps.push(now);
  }
}
`,
  },
  "src/utils.ts": {
    path: "src/utils.ts",
    language: "typescript",
    content: `export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
`,
  },
  "index.ts": {
    path: "index.ts",
    language: "typescript",
    content: `export { AxiomClient } from './src/client';
export { createAxiomClient } from './src/factory';
export type { AxiomConfig, CompletionMessage, CompletionOptions, CompletionResult } from './src/types';
`,
  },
  "package.json": {
    path: "package.json",
    language: "json",
    content: `{
  "name": "axiom-api-client",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  }
}
`,
  },
  "tsconfig.json": {
    path: "tsconfig.json",
    language: "json",
    content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "outDir": "dist"
  },
  "include": ["src", "index.ts"]
}
`,
  },
  "README.md": {
    path: "README.md",
    language: "markdown",
    content: `# Axiom API Client

TypeScript SDK for the Axiom inference API.

\`\`\`ts
import { createAxiomClient } from 'axiom-api-client';

const client = createAxiomClient({ apiKey: process.env.AXIOM_API_KEY! });
const result = await client.complete('axiom-ultra-3.1', [
  { role: 'user', content: 'Hello' },
]);
\`\`\`
`,
  },
};

export const DEFAULT_OPEN_FILES = ["src/client.ts", "src/types.ts", "index.ts"] as const;

export function breadcrumbSegments(path: string): string[] {
  return ["axiom-api-client", ...path.split("/")];
}
