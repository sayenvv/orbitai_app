/** Stable catalog UUIDs used in app store URLs (`/apps/{id}`). */
export const catalogAppIds = {
  logoStudio: "a1000001-0001-4000-8000-000000000001",
  photoGenerator: "a1000001-0002-4000-8000-000000000002",
  creativeEditor: "a1000001-0003-4000-8000-000000000003",
  videoSnippets: "a1000001-0004-4000-8000-000000000004",
  voiceMaker: "a1000001-0005-4000-8000-000000000005",
  assetRemix: "a1000001-0006-4000-8000-000000000006",
  careerCoach: "a1000001-0007-4000-8000-000000000007",
  researchCompanion: "a1000001-0008-4000-8000-000000000008",
  clovaiProjects: "a1000001-0009-4000-8000-000000000009",
} as const;

export type CatalogAppId = (typeof catalogAppIds)[keyof typeof catalogAppIds];

const catalogAppIdBySlug: Record<string, CatalogAppId> = {
  "logo-studio": catalogAppIds.logoStudio,
  "photo-studio": catalogAppIds.photoGenerator,
  "photo-generator": catalogAppIds.photoGenerator,
  "creative-editor": catalogAppIds.creativeEditor,
  "video-snippets": catalogAppIds.videoSnippets,
  "voice-maker": catalogAppIds.voiceMaker,
  "asset-remix": catalogAppIds.assetRemix,
  "career-coach": catalogAppIds.careerCoach,
  "research-companion": catalogAppIds.researchCompanion,
  "clovai-projects": catalogAppIds.clovaiProjects,
};

export function getCatalogAppIdForSlug(slug: string): CatalogAppId | undefined {
  return catalogAppIdBySlug[slug];
}
