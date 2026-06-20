"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";

import { PlanMarkdownContent } from "@/components/plan/plan-markdown-content";
import {
  getSectionContent,
  type PlanDeliverableContent,
} from "@/lib/plan-deliverable-content";
import {
  DEFAULT_PLAN_HTML_PAGE_STYLE,
  DEFAULT_PLAN_HTML_SIDEBAR_STYLE,
  type PlanHtmlPageStyle,
  type PlanHtmlPageStylesMap,
  type PlanHtmlSidebarStyle,
} from "@/lib/plan-html-page-editor";
import { getSectionDeliverable, type SynopsisSection } from "@/lib/plan-synopsis-catalog";
import {
  DEFAULT_PLAN_PDF_PAGE_FORMAT,
  getPlanPdfPageFormat,
  type PlanPdfPageFormatId,
} from "@/lib/plan-pdf-page-format";
import { cn } from "@/lib/utils";

const PlanMermaidDiagram = dynamic(
  () =>
    import("@/components/plan/plan-mermaid-diagram").then((module) => module.PlanMermaidDiagram),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
        Rendering diagram…
      </div>
    ),
  },
);

const PRINT_PAGE_STYLE: PlanHtmlPageStyle = {
  backgroundColor: "#ffffff",
  textColor: "#111111",
  accentColor: "#1f2937",
  padding: 48,
  fontSize: 15,
  textAlign: "left",
  borderRadius: 0,
};

export type PlanHtmlEditorSelection =
  | { type: "sidebar-panel" }
  | { type: "sidebar-title" }
  | { type: "sidebar-tab"; sectionId: string; tabState: "active" | "inactive" }
  | { type: "sidebar-tab-text"; sectionId: string }
  | { type: "page"; sectionId: string }
  | { type: "page-header"; sectionId: string }
  | { type: "page-content"; sectionId: string }
  | { type: "page-diagram"; sectionId: string }
  | { type: "canvas" };

function selectionRing(active: boolean) {
  return active ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "";
}

function EditorSelectionChrome({
  active,
  label,
  compact = false,
}: {
  active: boolean;
  label: string;
  compact?: boolean;
}) {
  if (!active) return null;

  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-20 border-2 border-primary bg-primary/[0.06] shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_18%,transparent)]",
          compact && "rounded-[inherit]",
        )}
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute z-30 rounded-md bg-primary font-semibold uppercase tracking-wider text-primary-foreground shadow-sm",
          compact ? "left-2 top-2 px-1.5 py-0.5 text-[8px]" : "left-3 top-3 px-2 py-0.5 text-[9px]",
        )}
      >
        {label}
      </div>
    </>
  );
}

function EditableTextRegion({
  editable,
  active,
  onSelect,
  className,
  children,
}: {
  editable: boolean;
  active: boolean;
  onSelect?: () => void;
  className?: string;
  children: ReactNode;
}) {
  if (!editable) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span
      role="button"
      tabIndex={0}
      className={cn(
        "rounded-sm transition-colors",
        "cursor-text outline-none",
        active && "bg-primary/10 ring-2 ring-primary ring-offset-1 ring-offset-transparent",
        !active && "hover:bg-primary/5 hover:outline hover:outline-1 hover:outline-dashed hover:outline-primary/45",
        className,
      )}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          onSelect?.();
        }
      }}
    >
      {children}
    </span>
  );
}

export function PlanHtmlSectionSidebar({
  sections,
  activeSectionId,
  onSelectSection,
  title,
  sidebarStyle = DEFAULT_PLAN_HTML_SIDEBAR_STYLE,
  editable = false,
  editorSelection = null,
  onEditorSelect,
  tabLabelOverrides,
}: {
  sections: SynopsisSection[];
  activeSectionId: string;
  onSelectSection: (sectionId: string) => void;
  title?: string;
  sidebarStyle?: PlanHtmlSidebarStyle;
  editable?: boolean;
  editorSelection?: PlanHtmlEditorSelection | null;
  onEditorSelect?: (selection: PlanHtmlEditorSelection) => void;
  tabLabelOverrides?: Record<string, string>;
}) {
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const resolvedTitle = title ?? sidebarStyle.title;
  const panelSelected = editable && editorSelection?.type === "sidebar-panel";

  const handlePanelSelect = () => {
    if (!editable || !onEditorSelect) return;
    onEditorSelect({ type: "sidebar-panel" });
  };

  const handleTabSelect = (sectionId: string) => {
    const tabState = sectionId === activeSectionId ? "active" : "inactive";
    if (editable && onEditorSelect) {
      onEditorSelect({ type: "sidebar-tab", sectionId, tabState });
    }
    onSelectSection(sectionId);
  };

  const edgeToEdge = sidebarStyle.tabsEdgeToEdge;
  const navPaddingX = sidebarStyle.navPaddingX ?? 10;
  const navPaddingY = sidebarStyle.navPaddingY ?? 10;

  return (
    <div
      className={cn(
        "relative h-full min-h-0 shrink-0",
        editable && panelSelected && "z-20",
      )}
      style={{ width: sidebarStyle.width }}
    >
      {editable ? (
        <EditorSelectionChrome active={panelSelected} label="Sidebar selected" />
      ) : null}
      <aside
        className={cn(
          "relative flex h-full min-h-0 flex-col overflow-hidden",
          editable && "cursor-pointer",
          panelSelected && selectionRing(true),
        )}
        style={{
          width: "100%",
          backgroundColor: sidebarStyle.backgroundColor,
          borderRight: `1px solid ${panelSelected ? "color-mix(in oklab, var(--primary) 45%, transparent)" : sidebarStyle.borderColor}`,
        }}
        onClick={editable ? handlePanelSelect : undefined}
      >
      <div
        className={cn(
          "relative px-4 py-3",
          editable && "cursor-pointer",
          panelSelected && "bg-primary/[0.08]",
        )}
        style={{ borderBottom: `1px solid ${sidebarStyle.borderColor}` }}
        onClick={
          editable
            ? (event) => {
                event.stopPropagation();
                handlePanelSelect();
              }
            : undefined
        }
      >
        <EditableTextRegion
          editable={editable}
          active={editable && editorSelection?.type === "sidebar-title"}
          onSelect={() => onEditorSelect?.({ type: "sidebar-title" })}
          className="block"
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: sidebarStyle.headerTitleColor }}
          >
            {resolvedTitle}
          </p>
        </EditableTextRegion>
        <p className="mt-0.5 text-[11px]" style={{ color: sidebarStyle.headerSubtitleColor }}>
          {sections.length} pages
        </p>
      </div>
      <nav
        className={cn(
          "relative min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]",
          editable && panelSelected && "opacity-90",
        )}
        style={{ padding: `${navPaddingY}px ${navPaddingX}px` }}
        onClick={
          editable
            ? (event) => {
                if (event.target === event.currentTarget) {
                  handlePanelSelect();
                }
              }
            : undefined
        }
      >
        {sections.map((section) => {
          const selected = section.id === activeSectionId;
          const hovered = hoveredSectionId === section.id && !selected;
          const tabSelected =
            editable && editorSelection?.type === "sidebar-tab" && editorSelection.sectionId === section.id;
          const tabTextSelected =
            editable &&
            editorSelection?.type === "sidebar-tab-text" &&
            editorSelection.sectionId === section.id;
          const tabLabel = tabLabelOverrides?.[section.id] ?? section.label;
          const tabWidth = edgeToEdge
            ? 100
            : selected
              ? (sidebarStyle.activeTabWidth ?? 100)
              : (sidebarStyle.tabWidth ?? 100);
          const tabBorderRadius = edgeToEdge
            ? 0
            : selected
              ? (sidebarStyle.activeTabBorderRadius ?? 12)
              : (sidebarStyle.tabBorderRadius ?? 12);
          const tabGap = edgeToEdge ? 0 : (sidebarStyle.tabGap ?? 6);
          return (
            <div
              key={section.id}
              className={cn("relative", editable && tabSelected && "z-10")}
              style={{ marginBottom: tabGap, width: edgeToEdge ? "100%" : `${tabWidth}%` }}
            >
              {editable ? (
                <EditorSelectionChrome
                  active={tabSelected}
                  label={selected ? "Active tab" : "Tab"}
                  compact
                />
              ) : null}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleTabSelect(section.id);
                }}
                onMouseEnter={() => setHoveredSectionId(section.id)}
                onMouseLeave={() => setHoveredSectionId(null)}
                className={cn(
                  "relative flex w-full items-center border text-left transition-colors",
                  edgeToEdge ? "w-full rounded-none" : "",
                  tabSelected && selectionRing(true),
                )}
                style={{
                  width: "100%",
                  minHeight: selected ? sidebarStyle.activeTabHeight : sidebarStyle.tabHeight,
                  borderRadius: tabBorderRadius,
                  padding: selected ? sidebarStyle.activeTabPadding : sidebarStyle.tabPadding,
                  backgroundColor: selected
                    ? sidebarStyle.activeTabBackgroundColor
                    : hovered
                      ? sidebarStyle.hoverTabBackgroundColor
                      : sidebarStyle.tabBackgroundColor,
                  color: selected ? sidebarStyle.activeTabTextColor : sidebarStyle.tabTextColor,
                  borderColor: selected
                    ? sidebarStyle.activeTabBorderColor
                    : hovered
                      ? sidebarStyle.hoverTabBorderColor
                      : sidebarStyle.tabBorderColor,
                  boxShadow: selected ? "0 1px 2px rgba(0,0,0,0.05)" : undefined,
                }}
              >
                <span
                  className="min-w-0 flex-1"
                  style={{
                    paddingLeft:
                      sidebarStyle.tabTextPaddingLeft ??
                      sidebarStyle.activeTabTextPaddingLeft ??
                      0,
                  }}
                >
                  <EditableTextRegion
                    editable={editable}
                    active={tabTextSelected}
                    onSelect={() =>
                      onEditorSelect?.({ type: "sidebar-tab-text", sectionId: section.id })
                    }
                    className="block w-full"
                  >
                    <span className="block truncate text-xs font-medium">{tabLabel}</span>
                  </EditableTextRegion>
                </span>
              </button>
            </div>
          );
        })}
      </nav>
      </aside>
    </div>
  );
}

function SectionBody({
  section,
  content,
  style,
  variant,
  editable = false,
  editorSelection = null,
  onEditorSelect,
}: {
  section: SynopsisSection;
  content: PlanDeliverableContent;
  style: PlanHtmlPageStyle;
  variant: "screen" | "print";
  editable?: boolean;
  editorSelection?: PlanHtmlEditorSelection | null;
  onEditorSelect?: (selection: PlanHtmlEditorSelection) => void;
}) {
  const deliverable = getSectionDeliverable(section);
  const contentSelected =
    editable && editorSelection?.type === "page-content" && editorSelection.sectionId === section.id;
  const diagramSelected =
    editable && editorSelection?.type === "page-diagram" && editorSelection.sectionId === section.id;

  if (content.format === "diagram") {
    const source = content.mermaid.trim();
    if (!source) {
      return <p className="text-sm opacity-55">No diagram content for this section.</p>;
    }
    const diagramTheme = variant === "print" ? "neutral" : undefined;
    const diagramShell = (
      <div
        className={cn(
          "overflow-hidden rounded-lg border p-3",
          variant === "print" ? "border-[#d1d5db] bg-white" : "border-border/50 bg-background/80",
        )}
      >
        <PlanMermaidDiagram source={source} className="w-full" theme={diagramTheme} />
      </div>
    );

    if (editable) {
      return (
        <EditableTextRegion
          editable={editable}
          active={diagramSelected}
          onSelect={() => onEditorSelect?.({ type: "page-diagram", sectionId: section.id })}
          className="block w-full"
        >
          {diagramShell}
        </EditableTextRegion>
      );
    }

    return diagramShell;
  }

  if (content.format === "matrix") {
    return (
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            {content.headers.map((header, index) => (
              <th
                key={`header-${index}`}
                className="border px-3 py-2 font-semibold"
                style={{
                  borderColor: `color-mix(in oklab, ${style.accentColor} 25%, transparent)`,
                  color: style.accentColor,
                  backgroundColor: `color-mix(in oklab, ${style.accentColor} 8%, ${style.backgroundColor})`,
                }}
              >
                {header || "—"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {content.rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell, colIndex) => (
                <td
                  key={`cell-${rowIndex}-${colIndex}`}
                  className="border px-3 py-2"
                  style={{
                    borderColor: `color-mix(in oklab, ${style.accentColor} 18%, transparent)`,
                  }}
                >
                  {cell || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (!content.text.trim()) {
    return (
      <p className="text-sm opacity-55">
        {deliverable.id === "title" ? "No project title yet." : "No content for this section."}
      </p>
    );
  }

  return (
    <EditableTextRegion
      editable={editable}
      active={contentSelected}
      onSelect={() => onEditorSelect?.({ type: "page-content", sectionId: section.id })}
      className="block w-full"
    >
      <div className="plan-ws-chat-turn-prose plan-ws-document-preview min-w-0">
        <PlanMarkdownContent content={content.text} />
      </div>
    </EditableTextRegion>
  );
}

function PlanHtmlPageArticle({
  section,
  content,
  style,
  variant = "screen",
  editable = false,
  editorSelection = null,
  onEditorSelect,
}: {
  section: SynopsisSection;
  content: PlanDeliverableContent;
  style: PlanHtmlPageStyle;
  variant?: "screen" | "print";
  editable?: boolean;
  editorSelection?: PlanHtmlEditorSelection | null;
  onEditorSelect?: (selection: PlanHtmlEditorSelection) => void;
}) {
  const resolvedStyle = variant === "print" ? { ...style, ...PRINT_PAGE_STYLE } : style;
  const pageSelected = editable && editorSelection?.type === "page" && editorSelection.sectionId === section.id;
  const headerSelected =
    editable && editorSelection?.type === "page-header" && editorSelection.sectionId === section.id;
  const deliverable = getSectionDeliverable(section);
  const headerTitle =
    deliverable.id === "title" && content.format === "document" && content.text.trim()
      ? content.text.trim().split("\n")[0]?.trim() || section.label
      : section.label;

  return (
    <article
      className={cn(
        "relative w-full transition-[background-color,color,border-radius,padding] duration-200",
        variant === "screen" ? "shadow-lg" : "plan-pdf-page-article",
        editable && "cursor-pointer",
        pageSelected && selectionRing(true),
      )}
      style={{
        backgroundColor: resolvedStyle.backgroundColor,
        color: resolvedStyle.textColor,
        padding: resolvedStyle.padding,
        fontSize: resolvedStyle.fontSize,
        textAlign: resolvedStyle.textAlign,
        borderRadius: resolvedStyle.borderRadius,
        border:
          variant === "print"
            ? "1px solid #d1d5db"
            : pageSelected
              ? "2px solid color-mix(in oklab, var(--primary) 55%, transparent)"
              : `1px solid color-mix(in oklab, ${resolvedStyle.accentColor} 28%, transparent)`,
        fontFamily: variant === "print" ? '"Times New Roman", Times, serif' : undefined,
        lineHeight: variant === "print" ? 1.55 : undefined,
      }}
    >
      <header
        className="mb-6 border-b pb-5"
        style={{
          borderColor: `color-mix(in oklab, ${resolvedStyle.accentColor} 35%, transparent)`,
        }}
      >
        <p
          className="mb-1.5 text-[11px] uppercase tracking-wider opacity-70"
          style={{ color: resolvedStyle.accentColor }}
        >
          {section.label}
        </p>
        <EditableTextRegion
          editable={editable}
          active={headerSelected}
          onSelect={() => onEditorSelect?.({ type: "page-header", sectionId: section.id })}
        >
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: resolvedStyle.textColor }}
          >
            {headerTitle}
          </h1>
        </EditableTextRegion>
        <p className="mt-2 text-sm opacity-75">{section.description}</p>
      </header>

      <SectionBody
        section={section}
        content={content}
        style={resolvedStyle}
        variant={variant}
        editable={editable}
        editorSelection={editorSelection}
        onEditorSelect={onEditorSelect}
      />
    </article>
  );
}

export function PlanHtmlPagePreview({
  section,
  content,
  style,
  variant = "screen",
  projectTitle,
  canvasBackgroundColor,
  editable = false,
  editorSelection = null,
  onEditorSelect,
}: {
  section: SynopsisSection;
  content: PlanDeliverableContent;
  style: PlanHtmlPageStyle;
  variant?: "screen" | "print";
  projectTitle?: string;
  canvasBackgroundColor?: string;
  editable?: boolean;
  editorSelection?: PlanHtmlEditorSelection | null;
  onEditorSelect?: (selection: PlanHtmlEditorSelection) => void;
}) {
  const resolvedCanvasBackground =
    variant === "screen"
      ? (canvasBackgroundColor ?? DEFAULT_PLAN_HTML_SIDEBAR_STYLE.canvasBackgroundColor)
      : "#e8eaed";
  const pageSelected = editable && editorSelection?.type === "page" && editorSelection.sectionId === section.id;
  const canvasSelected = editable && editorSelection?.type === "canvas";

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      style={{ backgroundColor: resolvedCanvasBackground }}
    >
      <div className="shrink-0 border-b border-border/50 bg-background/70 px-5 py-2.5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <span className="truncate">{section.label}</span>
          {projectTitle ? <span className="truncate">{projectTitle}</span> : null}
        </div>
      </div>

      <div
        className={cn(
          "relative min-h-0 flex-1 overflow-auto p-6 sm:p-8",
          editable && "cursor-pointer",
        )}
        onClick={
          editable && onEditorSelect
            ? () => onEditorSelect({ type: "canvas" })
            : undefined
        }
      >
        {editable ? (
          <EditorSelectionChrome active={canvasSelected} label="Canvas selected" />
        ) : null}
        <div className="relative mx-auto w-full max-w-[760px]">
          <div
            className={cn("relative", editable && pageSelected && "z-10")}
            onClick={
              editable && onEditorSelect
                ? (event) => {
                    event.stopPropagation();
                    onEditorSelect({ type: "page", sectionId: section.id });
                  }
                : undefined
            }
          >
            {editable ? (
              <EditorSelectionChrome active={pageSelected} label="Page selected" />
            ) : null}
            <PlanHtmlPageArticle
              section={section}
              content={content}
              style={style}
              variant={variant}
              editable={editable}
              editorSelection={editorSelection}
              onEditorSelect={onEditorSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function resolvePageStyle(
  sectionId: string,
  pageStyles: PlanHtmlPageStylesMap,
  variant: "screen" | "print",
): PlanHtmlPageStyle {
  const base = pageStyles[sectionId] ?? DEFAULT_PLAN_HTML_PAGE_STYLE;
  if (variant === "print") {
    return { ...base, ...PRINT_PAGE_STYLE };
  }
  return base;
}

export function PlanPdfPagesLayout({
  sections,
  contentByDeliverableId,
  projectPrompt,
  pageStyles,
  pageFormat = DEFAULT_PLAN_PDF_PAGE_FORMAT,
  emptyMessage,
}: {
  sections: SynopsisSection[];
  contentByDeliverableId: Record<string, PlanDeliverableContent>;
  projectPrompt: string;
  pageStyles: PlanHtmlPageStylesMap;
  pageFormat?: PlanPdfPageFormatId;
  emptyMessage?: ReactNode;
}) {
  const format = getPlanPdfPageFormat(pageFormat);

  if (sections.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        {emptyMessage ?? "No sections available."}
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
      style={{ backgroundColor: "#e8eaed" }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 sm:p-8 [scrollbar-width:thin]">
        <div className="mx-auto flex w-full flex-col items-center gap-8">
          {sections.map((section) => {
            const content = getSectionContent(contentByDeliverableId, section, projectPrompt);
            const style = resolvePageStyle(section.id, pageStyles, "print");
            return (
              <div
                key={section.id}
                className="plan-pdf-page-sheet relative w-full shrink-0 overflow-hidden bg-white shadow-[0_2px_10px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.08)]"
                style={{
                  width: `min(${format.widthMm}mm, 100%)`,
                  minHeight: `${format.heightMm}mm`,
                }}
              >
                <PlanHtmlPageArticle
                  section={section}
                  content={content}
                  style={style}
                  variant="print"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function PlanHtmlViewerLayout({
  projectTitle,
  sections,
  contentByDeliverableId,
  projectPrompt,
  pageStyles,
  sidebarStyle = DEFAULT_PLAN_HTML_SIDEBAR_STYLE,
  variant,
  emptyMessage,
}: {
  projectTitle: string;
  sections: SynopsisSection[];
  contentByDeliverableId: Record<string, PlanDeliverableContent>;
  projectPrompt: string;
  pageStyles: PlanHtmlPageStylesMap;
  sidebarStyle?: PlanHtmlSidebarStyle;
  variant: "screen" | "print";
  emptyMessage?: ReactNode;
}) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? "");
  const activeSection =
    sections.find((section) => section.id === activeSectionId) ?? sections[0];

  useEffect(() => {
    setActiveSectionId((current) => {
      if (sections.some((section) => section.id === current)) return current;
      return sections[0]?.id ?? "";
    });
  }, [sections]);

  if (!activeSection) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        {emptyMessage ?? "No sections available."}
      </div>
    );
  }

  const content = getSectionContent(contentByDeliverableId, activeSection, projectPrompt);
  const style = resolvePageStyle(activeSection.id, pageStyles, variant);

  const resolvedSidebarStyle =
    variant === "print"
      ? { ...sidebarStyle, title: "Document pages" }
      : sidebarStyle;

  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden">
      <PlanHtmlSectionSidebar
        sections={sections}
        activeSectionId={activeSection.id}
        onSelectSection={setActiveSectionId}
        sidebarStyle={resolvedSidebarStyle}
      />
      <PlanHtmlPagePreview
        section={activeSection}
        content={content}
        style={style}
        variant={variant}
        projectTitle={projectTitle}
        canvasBackgroundColor={sidebarStyle.canvasBackgroundColor}
      />
    </div>
  );
}
