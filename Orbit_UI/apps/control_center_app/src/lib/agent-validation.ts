export type AgentFormValues = {
  name: string;
  slug: string;
  shortName: string;
  description: string;
  systemPrompt: string;
};

export type AgentFieldErrors = Partial<Record<keyof AgentFormValues | "form", string>>;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateAgentForm(
  values: AgentFormValues,
  options: { mode: "create" | "edit" },
): AgentFieldErrors {
  const errors: AgentFieldErrors = {};
  const name = values.name.trim();
  const slug = values.slug.trim();
  const shortName = values.shortName.trim();
  const description = values.description.trim();
  const systemPrompt = values.systemPrompt.trim();

  if (!name) {
    errors.name = "Name is required.";
  } else if (name.length < 2) {
    errors.name = "Name must be at least 2 characters.";
  } else if (name.length > 80) {
    errors.name = "Name must be 80 characters or fewer.";
  }

  if (options.mode === "create") {
    if (!slug) {
      errors.slug = "Slug is required.";
    } else if (slug.length < 2) {
      errors.slug = "Slug must be at least 2 characters.";
    } else if (slug.length > 64) {
      errors.slug = "Slug must be 64 characters or fewer.";
    } else if (!SLUG_PATTERN.test(slug)) {
      errors.slug = "Use lowercase letters, numbers, and single dashes only (e.g. trip-adviser).";
    }
  }

  if (shortName.length > 32) {
    errors.shortName = "Short name must be 32 characters or fewer.";
  }

  if (description.length > 500) {
    errors.description = "Description must be 500 characters or fewer.";
  }

  if (systemPrompt.length > 12_000) {
    errors.systemPrompt = "System prompt must be 12,000 characters or fewer.";
  }

  return errors;
}

export function hasFieldErrors(errors: AgentFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function apiErrorToFieldErrors(
  message: string,
  status: number,
): AgentFieldErrors {
  const lower = message.toLowerCase();
  if (status === 400 && lower.includes("slug")) {
    return { slug: message };
  }
  if (status === 404) {
    return { form: "Agent not found. It may have been removed." };
  }
  if (status === 403) {
    return { form: "You do not have permission to perform this action." };
  }
  if (status >= 500) {
    return { form: "Server error. Try again in a moment." };
  }
  return { form: message };
}
