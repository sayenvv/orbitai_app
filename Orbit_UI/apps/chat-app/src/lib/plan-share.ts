import type { PlanWorkspaceView } from "@/lib/plan-catalog";
import { studioPlanShareUrl, type StudioPhase } from "@/lib/routes";

export type PlanShareContext = {
  planId: string;
  phase?: StudioPhase;
  projectTitle: string;
  planType: PlanWorkspaceView;
};

type PlanShareTheme = {
  headerGradient: string;
  badgeBackground: string;
  badgeColor: string;
  buttonBackground: string;
  accentColor: string;
};

const PLAN_SHARE_THEMES: Record<PlanWorkspaceView, PlanShareTheme> = {
  synopsis: {
    headerGradient: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
    badgeBackground: "#eef2ff",
    badgeColor: "#4338ca",
    buttonBackground: "#4f46e5",
    accentColor: "#6366f1",
  },
  documentation: {
    headerGradient: "linear-gradient(135deg, #0f766e 0%, #059669 100%)",
    badgeBackground: "#ecfdf5",
    badgeColor: "#047857",
    buttonBackground: "#059669",
    accentColor: "#10b981",
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getPlanTypeLabel(planType: PlanWorkspaceView): string {
  return planType === "synopsis" ? "Project Synopsis" : "Project Documentation";
}

export function getPlanShareIntro(planType: PlanWorkspaceView): string {
  return planType === "synopsis"
    ? "I'd like to share a project synopsis with you on Clovai."
    : "I'd like to share project documentation with you on Clovai.";
}

export function getPlanTypeDescription(planType: PlanWorkspaceView): string {
  return planType === "synopsis"
    ? "A structured project synopsis covering scope, architecture, and delivery planning."
    : "Implementation-ready project documentation with specs and reference material.";
}

export function buildPlanShareUrl(context: PlanShareContext): string {
  return studioPlanShareUrl(context.planId, {
    phase: context.phase ?? "plan",
  });
}

export function buildPlanShareMessage(context: PlanShareContext): string {
  const url = buildPlanShareUrl(context);
  const title = context.projectTitle.trim() || "Untitled project";
  const typeLabel = getPlanTypeLabel(context.planType);

  return `Check out this ${typeLabel} on Clovai: ${title}\n\n${url}`;
}

export function buildPlanShareEmailSubject(context: PlanShareContext): string {
  const title = context.projectTitle.trim() || "Untitled project";
  const typeLabel = getPlanTypeLabel(context.planType);
  return `${typeLabel}: ${title}`;
}

export function buildPlanShareEmailBody(context: PlanShareContext): string {
  const url = buildPlanShareUrl(context);
  const title = context.projectTitle.trim() || "Untitled project";
  const typeLabel = getPlanTypeLabel(context.planType);
  const intro = getPlanShareIntro(context.planType);
  const typeDescription = getPlanTypeDescription(context.planType);

  return [
    "Hi,",
    "",
    intro,
    "",
    "PLAN DETAILS",
    "",
    `Project: ${title}`,
    `Type: ${typeLabel}`,
    "",
    "About this plan:",
    typeDescription,
    "",
    "Open the full plan:",
    url,
    "",
    "This link opens the complete plan workspace so you can review every section.",
    "",
    "Best regards",
  ].join("\n");
}

export function buildPlanShareEmailHtml(context: PlanShareContext): string {
  const url = buildPlanShareUrl(context);
  const title = escapeHtml(context.projectTitle.trim() || "Untitled project");
  const typeLabel = escapeHtml(getPlanTypeLabel(context.planType));
  const intro = escapeHtml(getPlanShareIntro(context.planType));
  const typeDescription = escapeHtml(getPlanTypeDescription(context.planType));
  const safeUrl = escapeHtml(url);
  const theme = PLAN_SHARE_THEMES[context.planType];

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${typeLabel}: ${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
            <tr>
              <td style="background:${theme.headerGradient};padding:28px 32px 24px;">
                <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.82);">
                  Clovai Plan Studio
                </p>
                <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:700;color:#ffffff;">
                  ${typeLabel}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">Hi,</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">${intro}</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;">
                  <tr>
                    <td style="padding:20px 22px;">
                      <span style="display:inline-block;margin:0 0 12px;padding:6px 10px;border-radius:999px;background:${theme.badgeBackground};color:${theme.badgeColor};font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">
                        ${typeLabel}
                      </span>
                      <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">
                        Project
                      </p>
                      <p style="margin:0 0 16px;font-size:20px;line-height:1.35;font-weight:700;color:#111827;">
                        ${title}
                      </p>
                      <p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;">
                        ${typeDescription}
                      </p>
                    </td>
                  </tr>
                </table>

                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:10px;background:${theme.buttonBackground};">
                      <a href="${safeUrl}" style="display:inline-block;padding:14px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                        Open full plan
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6b7280;">
                  Or copy this link:
                </p>
                <p style="margin:0 0 24px;font-size:13px;line-height:1.6;word-break:break-all;">
                  <a href="${safeUrl}" style="color:${theme.accentColor};text-decoration:underline;">${safeUrl}</a>
                </p>

                <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">
                  Best regards
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildPlanShareMailto(context: PlanShareContext): string {
  const subject = encodeURIComponent(buildPlanShareEmailSubject(context));
  const body = encodeURIComponent(buildPlanShareEmailBody(context));
  return `mailto:?subject=${subject}&body=${body}`;
}

export function buildPlanShareWhatsAppUrl(context: PlanShareContext): string {
  return `https://wa.me/?text=${encodeURIComponent(buildPlanShareMessage(context))}`;
}

export async function copyPlanShareLink(context: PlanShareContext): Promise<boolean> {
  const url = buildPlanShareUrl(context);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    window.prompt("Copy this plan link:", url);
    return false;
  }
}

export async function copyPlanShareEmailTemplate(context: PlanShareContext): Promise<boolean> {
  const html = buildPlanShareEmailHtml(context);
  const plain = buildPlanShareEmailBody(context);

  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
      return true;
    }

    await navigator.clipboard.writeText(plain);
    return true;
  } catch {
    return false;
  }
}

export async function openPlanShareEmail(context: PlanShareContext): Promise<boolean> {
  await copyPlanShareEmailTemplate(context);
  window.location.href = buildPlanShareMailto(context);
  return true;
}

export function openPlanShareWhatsApp(context: PlanShareContext): void {
  window.open(buildPlanShareWhatsAppUrl(context), "_blank", "noopener,noreferrer");
}
