import { catalogAppIds } from "./app-ids";

export type AppHelpCatalogApp = {
  id: string;
  name: string;
  description: string;
  tagline: string;
  badges: string[];
  modelAccess: string;
};

export type AppHelpSection = {
  title: string;
  body: string;
};

export type AppHelpContent = {
  appId: string;
  appName: string;
  title: string;
  subtitle: string;
  sections: AppHelpSection[];
  workflowSteps?: string[];
};

const photoStudioHelp: AppHelpContent = {
  appId: catalogAppIds.photoGenerator,
  appName: "Photo Studio",
  title: "Photo Studio help",
  subtitle: "Navigation, saving projects, and creating visuals with AI.",
  sections: [
    {
      title: "Home",
      body: "Your starting point with a quick overview of what Photo Studio can create.",
    },
    {
      title: "Open",
      body: "Browse your library, upload an image, or continue a recent saved project.",
    },
    {
      title: "New",
      body: "Start a local draft canvas. Nothing is saved to your library until you use Save project and enter a name.",
    },
    {
      title: "Save project",
      body: "Use Save project in the workspace toolbar to name your work and add it to recents.",
    },
    {
      title: "Generate",
      body: "Open the Prompt tool to create AI variants, then apply them to the canvas as editable layers.",
    },
    {
      title: "Designs",
      body: "Browse templates and saved designs from the Designs panel. Apply a design to load shapes and text onto the canvas.",
    },
    {
      title: "Export",
      body: "Export transparent PNGs or full mockups with background from the workspace toolbar when your canvas has content.",
    },
  ],
  workflowSteps: [
    "Open or upload an image, or start a new blank workspace",
    "Adjust aspect ratio, style, and prompt settings",
    "Generate AI visuals and apply them to the canvas",
    "Edit layers, add shapes and text, then save your project",
  ],
};

const researchCompanionHelp: AppHelpContent = {
  appId: catalogAppIds.researchCompanion,
  appName: "Research Companion",
  title: "Research Companion help",
  subtitle: "Navigation, documents, annotations, and AI-generated insights.",
  sections: [
    {
      title: "Home",
      body: "Overview, insight setup progress, and how Research Companion fits your workflow.",
    },
    {
      title: "Open",
      body: "Browse your library, upload a PDF, or resume a recent document.",
    },
    {
      title: "New",
      body: "Start a local draft workspace. Attach a document when you are ready — nothing is added to recents until you open a file.",
    },
    {
      title: "Insights",
      body: "After attaching a PDF, generate AI summaries, evidence maps, and discussion prompts from Home.",
    },
    {
      title: "File panel",
      body: "Review page thumbnails and navigate the source PDF while you annotate.",
    },
    {
      title: "AI tools",
      body: "Use Ask, Summary, Flashcards, and Notes from the right toolbar to work with the open document.",
    },
  ],
  workflowSteps: [
    "Open or upload a PDF from your library",
    "Generate AI insights for summaries and study aids",
    "Review the document alongside insights in the workspace",
    "Annotate, ask questions, and export notes",
  ],
};

const clovaiProjectsHelp: AppHelpContent = {
  appId: catalogAppIds.clovaiProjects,
  appName: "Clovai Projects",
  title: "Clovai Projects help",
  subtitle: "Workspaces, SDLC generation, artifact editing, and exports.",
  sections: [
    {
      title: "Home",
      body: "Dashboard with workspace cards, search, status filters, and recent projects.",
    },
    {
      title: "New workspace",
      body: "Enter a name, upload requirements or paste text, select SDLC modules, and generate.",
    },
    {
      title: "Processing",
      body: "Track upload, analysis, and generation steps while the workspace is prepared.",
    },
    {
      title: "Workspace",
      body: "Three-column layout: SDLC sidebar, artifact editor, and AI assistant panel.",
    },
    {
      title: "Review status",
      body: "Mark artifacts as reviewed or verified to track progress on the dashboard.",
    },
    {
      title: "Export",
      body: "Use Export in the toolbar or Export Center to download PDF, Markdown, HTML, or DOCX.",
    },
  ],
  workflowSteps: [
    "Create a workspace from requirements",
    "Select SDLC sections to generate",
    "Review and edit each artifact",
    "Export documentation for stakeholders",
  ],
};

const helpByAppId: Partial<Record<string, AppHelpContent>> = {
  [catalogAppIds.photoGenerator]: photoStudioHelp,
  [catalogAppIds.researchCompanion]: researchCompanionHelp,
  [catalogAppIds.clovaiProjects]: clovaiProjectsHelp,
};

function buildGenericHelpContent(app: AppHelpCatalogApp): AppHelpContent {
  const sections: AppHelpSection[] = [
    {
      title: "About this app",
      body: app.description,
    },
    {
      title: "Getting started",
      body: `Launch ${app.name} from the app store, then follow the in-app prompts to begin. ${app.tagline}`,
    },
  ];

  if (app.badges.length > 0) {
    sections.push({
      title: "Included features",
      body: app.badges.join(" · "),
    });
  }

  sections.push({
    title: "Model access",
    body: `This app runs on ${app.modelAccess}. Upgrade your plan for larger models and higher usage limits.`,
  });

  return {
    appId: app.id,
    appName: app.name,
    title: `${app.name} help`,
    subtitle: app.tagline,
    sections,
  };
}

export function getAppHelpContent(app: AppHelpCatalogApp): AppHelpContent {
  return helpByAppId[app.id] ?? buildGenericHelpContent(app);
}

export function getAppHelpHref(appOrId: AppHelpCatalogApp | string): string {
  const id = typeof appOrId === "string" ? appOrId : appOrId.id;
  return `/apps/${id}/help`;
}
