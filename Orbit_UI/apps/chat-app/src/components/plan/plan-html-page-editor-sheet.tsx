"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Code2, X } from "lucide-react";

import {
  PlanHtmlPagePreview,
  PlanHtmlSectionSidebar,
  type PlanHtmlEditorSelection,
} from "@/components/plan/plan-html-page-preview";
import { studioButtonPrimary, studioButtonSecondary, studioRadius } from "@/components/studio/studio-ui";
import { WorkspaceResizeHandle } from "@/components/workspace/workspace-resize";
import {
  getSectionContent,
  type PlanDeliverableContent,
} from "@/lib/plan-deliverable-content";
import {
  DEFAULT_PLAN_HTML_PAGE_STYLE,
  type PlanHtmlPageStyle,
  type PlanHtmlPageStylesMap,
  type PlanHtmlSidebarStyle,
  updatePlanHtmlPageStyle,
  updatePlanHtmlSidebarStyle,
} from "@/lib/plan-html-page-editor";
import { getSectionDeliverable, type SynopsisSection } from "@/lib/plan-synopsis-catalog";
import { cn } from "@/lib/utils";

const HTML_EDITOR_SIDEBAR_MIN_WIDTH = 200;
const HTML_EDITOR_SIDEBAR_MAX_WIDTH = 480;
const HTML_EDITOR_INSPECTOR_DEFAULT_WIDTH = 300;
const HTML_EDITOR_INSPECTOR_MIN_WIDTH = 240;
const HTML_EDITOR_INSPECTOR_MAX_WIDTH = 520;

const SELECTION_LABELS: Record<PlanHtmlEditorSelection["type"], string> = {
  "sidebar-panel": "Sidebar panel",
  "sidebar-title": "Sidebar title",
  "sidebar-tab": "Section tab",
  "sidebar-tab-text": "Tab label",
  page: "Page card",
  "page-header": "Page heading",
  "page-content": "Page content",
  "page-diagram": "Diagram",
  canvas: "Preview background",
};

function sectionIdFromSelection(selection: PlanHtmlEditorSelection): string | null {
  if ("sectionId" in selection) return selection.sectionId;
  return null;
}

function contentSectionId(selection: PlanHtmlEditorSelection, fallback: string): string {
  return sectionIdFromSelection(selection) ?? fallback;
}

function InspectorField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function inputClass(extra?: string) {
  return cn(
    studioRadius,
    "w-full border border-border/60 bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary/40",
    extra,
  );
}

function ColorField({
  label,
  value,
  onChange,
  allowTransparent = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowTransparent?: boolean;
}) {
  const isTransparent = value === "transparent";
  const colorValue = value.startsWith("#") ? value : "#ffffff";

  return (
    <InspectorField label={label}>
      <div className="flex items-center gap-2">
        {allowTransparent ? (
          <label className="inline-flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground">
            <input
              type="checkbox"
              checked={isTransparent}
              onChange={(event) => onChange(event.target.checked ? "transparent" : "#ffffff")}
              className="accent-primary"
            />
            None
          </label>
        ) : null}
        <input
          type="color"
          value={colorValue}
          disabled={allowTransparent && isTransparent}
          onChange={(event) => onChange(event.target.value)}
          className={cn(inputClass(), "h-9 cursor-pointer px-1 py-1", allowTransparent && isTransparent && "opacity-40")}
        />
      </div>
    </InspectorField>
  );
}

function rgbaFromHex(hex: string, opacity: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function hexFromRgba(value: string, fallback = "#2563eb") {
  if (!value.startsWith("rgba")) return value.startsWith("#") ? value : fallback;
  const parts = value.match(/\d+/g) ?? ["37", "99", "235"];
  return `#${parts
    .slice(0, 3)
    .map((part) => Number(part).toString(16).padStart(2, "0"))
    .join("")}`;
}

function opacityFromRgba(value: string, fallback = 0.1) {
  if (!value.startsWith("rgba")) return 1;
  return parseFloat(value.split(",")[3] ?? String(fallback));
}

function ActiveTabColorField({
  label,
  value,
  onChange,
  defaultOpacity,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  defaultOpacity: number;
}) {
  const hex = hexFromRgba(value);
  const opacity = Math.round(opacityFromRgba(value, defaultOpacity) * 100);

  return (
    <>
      <ColorField
        label={label}
        value={hex}
        onChange={(nextHex) => {
          const nextOpacity = opacityFromRgba(value, defaultOpacity);
          onChange(nextOpacity >= 1 ? nextHex : rgbaFromHex(nextHex, nextOpacity));
        }}
      />
      {value.startsWith("rgba") ? (
        <InspectorField label={`${label} opacity`}>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={opacity}
            onChange={(event) => onChange(rgbaFromHex(hex, Number(event.target.value) / 100))}
            className="w-full accent-primary"
          />
        </InspectorField>
      ) : null}
    </>
  );
}

function TabLayoutInspector({
  sidebarStyle,
  onSidebarStyleChange,
  isActiveTab,
}: {
  sidebarStyle: PlanHtmlSidebarStyle;
  onSidebarStyleChange: (patch: Partial<PlanHtmlSidebarStyle>) => void;
  isActiveTab: boolean;
}) {
  const navPaddingX = sidebarStyle.navPaddingX ?? 10;
  const navPaddingY = sidebarStyle.navPaddingY ?? 10;
  const tabWidth = isActiveTab ? (sidebarStyle.activeTabWidth ?? 100) : (sidebarStyle.tabWidth ?? 100);
  const tabHeight = isActiveTab ? (sidebarStyle.activeTabHeight ?? 40) : (sidebarStyle.tabHeight ?? 36);
  const textPaddingLeft = sidebarStyle.tabTextPaddingLeft ?? sidebarStyle.activeTabTextPaddingLeft ?? 0;

  const setTextPaddingLeft = (value: number) => {
    onSidebarStyleChange({
      tabTextPaddingLeft: value,
      activeTabTextPaddingLeft: value,
    });
  };

  const enableEdgeToEdge = () => {
    onSidebarStyleChange({
      tabsEdgeToEdge: true,
      navPaddingX: 0,
      navPaddingY: 0,
      tabWidth: 100,
      activeTabWidth: 100,
      tabGap: 0,
      tabBorderRadius: 0,
      activeTabBorderRadius: 0,
    });
  };

  const disableEdgeToEdge = () => {
    onSidebarStyleChange({
      tabsEdgeToEdge: false,
      navPaddingX: 10,
      navPaddingY: 10,
      tabGap: 6,
      tabBorderRadius: 12,
      activeTabBorderRadius: 12,
    });
  };

  return (
    <section className="space-y-3 border-b border-border/40 pb-4">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        Tab layout
      </p>
      <InspectorField label="Edge-to-edge">
        <label className="inline-flex items-center gap-2 text-[11px] text-foreground">
          <input
            type="checkbox"
            checked={sidebarStyle.tabsEdgeToEdge}
            onChange={(event) =>
              event.target.checked ? enableEdgeToEdge() : disableEdgeToEdge()
            }
            className="accent-primary"
          />
          Full sidebar width
        </label>
      </InspectorField>
      <InspectorField label={`Side padding (${navPaddingX}px)`}>
        <input
          type="range"
          min={0}
          max={40}
          step={2}
          value={navPaddingX}
          onChange={(event) =>
            onSidebarStyleChange({
              navPaddingX: Number(event.target.value),
              tabsEdgeToEdge: false,
            })
          }
          className="w-full accent-primary"
        />
      </InspectorField>
      <InspectorField label={`Top/bottom padding (${navPaddingY}px)`}>
        <input
          type="range"
          min={0}
          max={40}
          step={2}
          value={navPaddingY}
          onChange={(event) =>
            onSidebarStyleChange({
              navPaddingY: Number(event.target.value),
              tabsEdgeToEdge: false,
            })
          }
          className="w-full accent-primary"
        />
      </InspectorField>
      <InspectorField label={`Tab width (${tabWidth}%)`}>
        <input
          type="range"
          min={50}
          max={100}
          step={5}
          value={tabWidth}
          onChange={(event) =>
            onSidebarStyleChange(
              isActiveTab
                ? { activeTabWidth: Number(event.target.value), tabsEdgeToEdge: false }
                : { tabWidth: Number(event.target.value), tabsEdgeToEdge: false },
            )
          }
          className="w-full accent-primary"
        />
      </InspectorField>
      <InspectorField label={`Tab height (${tabHeight}px)`}>
        <input
          type="range"
          min={28}
          max={96}
          step={2}
          value={tabHeight}
          onChange={(event) =>
            onSidebarStyleChange(
              isActiveTab
                ? { activeTabHeight: Number(event.target.value) }
                : { tabHeight: Number(event.target.value) },
            )
          }
          className="w-full accent-primary"
        />
      </InspectorField>
      <InspectorField label={`Text left padding (${textPaddingLeft}px)`}>
        <input
          type="range"
          min={0}
          max={48}
          step={2}
          value={textPaddingLeft}
          onChange={(event) => setTextPaddingLeft(Number(event.target.value))}
          className="w-full accent-primary"
        />
      </InspectorField>
      {!isActiveTab ? (
        <InspectorField label={`Gap (${sidebarStyle.tabGap ?? 6}px)`}>
          <input
            type="range"
            min={0}
            max={16}
            step={1}
            value={sidebarStyle.tabGap ?? 6}
            onChange={(event) =>
              onSidebarStyleChange({
                tabGap: Number(event.target.value),
                tabsEdgeToEdge: false,
              })
            }
            className="w-full accent-primary"
          />
        </InspectorField>
      ) : null}
    </section>
  );
}

function SelectionInspector({
  selection,
  sections,
  pageStyle,
  sidebarStyle,
  content,
  tabLabelOverrides,
  activeSectionId,
  onPageStyleChange,
  onSidebarStyleChange,
  onContentChange,
  onTabLabelChange,
}: {
  selection: PlanHtmlEditorSelection;
  sections: SynopsisSection[];
  pageStyle: PlanHtmlPageStyle;
  sidebarStyle: PlanHtmlSidebarStyle;
  content: PlanDeliverableContent | null;
  tabLabelOverrides: Record<string, string>;
  activeSectionId: string;
  onPageStyleChange: (patch: Partial<PlanHtmlPageStyle>) => void;
  onSidebarStyleChange: (patch: Partial<PlanHtmlSidebarStyle>) => void;
  onContentChange: (content: PlanDeliverableContent) => void;
  onTabLabelChange: (sectionId: string, label: string) => void;
}) {
  if (selection.type === "sidebar-title") {
    return (
      <div className="space-y-3">
        <InspectorField label="Sidebar title">
          <input
            type="text"
            value={sidebarStyle.title}
            onChange={(event) => onSidebarStyleChange({ title: event.target.value })}
            className={inputClass()}
          />
        </InspectorField>
      </div>
    );
  }

  if (selection.type === "sidebar-tab-text") {
    const section = sections.find((item) => item.id === selection.sectionId);
    return (
      <div className="space-y-3">
        <InspectorField label="Tab label">
          <input
            type="text"
            value={tabLabelOverrides[selection.sectionId] ?? section?.label ?? ""}
            onChange={(event) => onTabLabelChange(selection.sectionId, event.target.value)}
            className={inputClass()}
          />
        </InspectorField>
        <p className="text-[10px] leading-snug text-muted-foreground">
          Preview-only label for this tab. Clear the field to use the default section name.
        </p>
        <TabLayoutInspector
          sidebarStyle={sidebarStyle}
          onSidebarStyleChange={onSidebarStyleChange}
          isActiveTab={selection.sectionId === activeSectionId}
        />
      </div>
    );
  }

  if (selection.type === "page-content") {
    return content?.format === "document" ? (
      <section className="space-y-2">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          Page content
        </p>
        <textarea
          value={content.text}
          onChange={(event) => onContentChange({ format: "document", text: event.target.value })}
          rows={14}
          className={cn(
            studioRadius,
            "min-h-[220px] w-full resize-y border border-border/60 bg-background px-2.5 py-2 font-mono text-[11px] leading-relaxed text-foreground outline-none focus:border-primary/40",
          )}
          placeholder="Write page content in Markdown…"
        />
      </section>
    ) : (
      <p className="text-sm text-muted-foreground">This section has no editable document content.</p>
    );
  }

  if (selection.type === "page-header") {
    const section = sections.find((item) => item.id === selection.sectionId);
    const deliverable = section ? getSectionDeliverable(section) : null;
    const isTitleSection = deliverable?.id === "title";

    if (isTitleSection && content?.format === "document") {
      return (
        <div className="space-y-3">
          <InspectorField label="Page heading">
            <input
              type="text"
              value={content.text.trim().split("\n")[0] ?? ""}
              onChange={(event) => {
                const lines = content.text.split("\n");
                lines[0] = event.target.value;
                onContentChange({ format: "document", text: lines.join("\n") });
              }}
              className={inputClass()}
            />
          </InspectorField>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <InspectorField label="Page heading">
          <input type="text" value={section?.label ?? ""} disabled className={cn(inputClass(), "opacity-60")} />
        </InspectorField>
        <p className="text-[10px] leading-snug text-muted-foreground">
          This heading comes from the plan outline. Select page content below to edit body text.
        </p>
      </div>
    );
  }

  if (selection.type === "page-diagram") {
    return content?.format === "diagram" ? (
      <section className="space-y-2">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          Mermaid source
        </p>
        <textarea
          value={content.mermaid}
          onChange={(event) => onContentChange({ format: "diagram", mermaid: event.target.value })}
          rows={14}
          spellCheck={false}
          className={cn(
            studioRadius,
            "min-h-[220px] w-full resize-y border border-border/60 bg-background px-2.5 py-2 font-mono text-[11px] leading-relaxed text-foreground outline-none focus:border-primary/40",
          )}
        />
      </section>
    ) : (
      <p className="text-sm text-muted-foreground">This section has no diagram content.</p>
    );
  }

  if (selection.type === "sidebar-panel") {
    return (
      <div className="space-y-3">
        <InspectorField label="Title">
          <input
            type="text"
            value={sidebarStyle.title}
            onChange={(event) => onSidebarStyleChange({ title: event.target.value })}
            className={inputClass()}
          />
        </InspectorField>
        <InspectorField label={`Width (${sidebarStyle.width}px)`}>
          <input
            type="range"
            min={HTML_EDITOR_SIDEBAR_MIN_WIDTH}
            max={HTML_EDITOR_SIDEBAR_MAX_WIDTH}
            step={4}
            value={sidebarStyle.width}
            onChange={(event) => onSidebarStyleChange({ width: Number(event.target.value) })}
            className="w-full accent-primary"
          />
        </InspectorField>
        <ColorField
          label="Background"
          value={sidebarStyle.backgroundColor}
          onChange={(value) => onSidebarStyleChange({ backgroundColor: value })}
        />
        <ColorField
          label="Border"
          value={sidebarStyle.borderColor}
          onChange={(value) => onSidebarStyleChange({ borderColor: value })}
        />
        <ColorField
          label="Header title"
          value={sidebarStyle.headerTitleColor}
          onChange={(value) => onSidebarStyleChange({ headerTitleColor: value })}
        />
        <ColorField
          label="Header subtitle"
          value={sidebarStyle.headerSubtitleColor}
          onChange={(value) => onSidebarStyleChange({ headerSubtitleColor: value })}
        />
        <InspectorField label="Edge-to-edge">
          <label className="inline-flex items-center gap-2 text-[11px] text-foreground">
            <input
              type="checkbox"
              checked={sidebarStyle.tabsEdgeToEdge}
              onChange={(event) =>
                event.target.checked
                  ? onSidebarStyleChange({
                      tabsEdgeToEdge: true,
                      navPaddingX: 0,
                      navPaddingY: 0,
                      tabWidth: 100,
                      activeTabWidth: 100,
                      tabGap: 0,
                      tabBorderRadius: 0,
                      activeTabBorderRadius: 0,
                    })
                  : onSidebarStyleChange({
                      tabsEdgeToEdge: false,
                      navPaddingX: 10,
                      navPaddingY: 10,
                      tabGap: 6,
                      tabBorderRadius: 12,
                      activeTabBorderRadius: 12,
                    })
              }
              className="accent-primary"
            />
            Full sidebar width
          </label>
        </InspectorField>
        <InspectorField label={`Side padding (${sidebarStyle.navPaddingX ?? 10}px)`}>
          <input
            type="range"
            min={0}
            max={40}
            step={2}
            value={sidebarStyle.navPaddingX ?? 10}
            onChange={(event) =>
              onSidebarStyleChange({
                navPaddingX: Number(event.target.value),
                tabsEdgeToEdge: false,
              })
            }
            className="w-full accent-primary"
          />
        </InspectorField>
        <InspectorField label={`Top/bottom padding (${sidebarStyle.navPaddingY ?? 10}px)`}>
          <input
            type="range"
            min={0}
            max={40}
            step={2}
            value={sidebarStyle.navPaddingY ?? 10}
            onChange={(event) =>
              onSidebarStyleChange({
                navPaddingY: Number(event.target.value),
                tabsEdgeToEdge: false,
              })
            }
            className="w-full accent-primary"
          />
        </InspectorField>
      </div>
    );
  }

  if (selection.type === "sidebar-tab") {
    const isActiveTab = selection.tabState === "active";

    if (isActiveTab) {
      return (
        <div className="space-y-4">
          <TabLayoutInspector
            sidebarStyle={sidebarStyle}
            onSidebarStyleChange={onSidebarStyleChange}
            isActiveTab
          />
          <section className="space-y-3">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Active tab colors
            </p>
          <ActiveTabColorField
            label="Background"
            value={sidebarStyle.activeTabBackgroundColor}
            onChange={(value) => onSidebarStyleChange({ activeTabBackgroundColor: value })}
            defaultOpacity={0.1}
          />
          <ColorField
            label="Text"
            value={sidebarStyle.activeTabTextColor}
            onChange={(value) => onSidebarStyleChange({ activeTabTextColor: value })}
          />
          <ActiveTabColorField
            label="Border"
            value={sidebarStyle.activeTabBorderColor}
            onChange={(value) => onSidebarStyleChange({ activeTabBorderColor: value })}
            defaultOpacity={0.35}
          />
          <InspectorField label={`Padding (${sidebarStyle.activeTabPadding ?? 10}px)`}>
            <input
              type="range"
              min={6}
              max={24}
              step={1}
              value={sidebarStyle.activeTabPadding ?? 10}
              onChange={(event) => onSidebarStyleChange({ activeTabPadding: Number(event.target.value) })}
              className="w-full accent-primary"
            />
          </InspectorField>
          <InspectorField label={`Corner radius (${sidebarStyle.activeTabBorderRadius ?? 12}px)`}>
            <input
              type="range"
              min={0}
              max={24}
              step={2}
              value={sidebarStyle.activeTabBorderRadius ?? 12}
              onChange={(event) =>
                onSidebarStyleChange({ activeTabBorderRadius: Number(event.target.value) })
              }
              className="w-full accent-primary"
            />
          </InspectorField>
          </section>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <TabLayoutInspector
          sidebarStyle={sidebarStyle}
          onSidebarStyleChange={onSidebarStyleChange}
          isActiveTab={false}
        />
        <section className="space-y-3">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Inactive tab colors
          </p>
        <ColorField
          label="Background"
          value={sidebarStyle.tabBackgroundColor}
          onChange={(value) => onSidebarStyleChange({ tabBackgroundColor: value })}
          allowTransparent
        />
        <ColorField
          label="Text"
          value={sidebarStyle.tabTextColor}
          onChange={(value) => onSidebarStyleChange({ tabTextColor: value })}
        />
        <ColorField
          label="Border"
          value={sidebarStyle.tabBorderColor}
          onChange={(value) => onSidebarStyleChange({ tabBorderColor: value })}
          allowTransparent
        />
        <InspectorField label={`Padding (${sidebarStyle.tabPadding ?? 10}px)`}>
          <input
            type="range"
            min={6}
            max={20}
            step={1}
            value={sidebarStyle.tabPadding ?? 10}
            onChange={(event) => onSidebarStyleChange({ tabPadding: Number(event.target.value) })}
            className="w-full accent-primary"
          />
        </InspectorField>
        <InspectorField label={`Corner radius (${sidebarStyle.tabBorderRadius ?? 12}px)`}>
          <input
            type="range"
            min={0}
            max={24}
            step={2}
            value={sidebarStyle.tabBorderRadius ?? 12}
            onChange={(event) => onSidebarStyleChange({ tabBorderRadius: Number(event.target.value) })}
            className="w-full accent-primary"
          />
        </InspectorField>
        <ActiveTabColorField
          label="Hover background"
          value={sidebarStyle.hoverTabBackgroundColor}
          onChange={(value) => onSidebarStyleChange({ hoverTabBackgroundColor: value })}
          defaultOpacity={0.55}
        />
        <ActiveTabColorField
          label="Hover border"
          value={sidebarStyle.hoverTabBorderColor}
          onChange={(value) => onSidebarStyleChange({ hoverTabBorderColor: value })}
          defaultOpacity={0.9}
        />
        </section>
      </div>
    );
  }

  if (selection.type === "canvas") {
    return (
      <div className="space-y-3">
        <ColorField
          label="Background"
          value={sidebarStyle.canvasBackgroundColor}
          onChange={(value) => onSidebarStyleChange({ canvasBackgroundColor: value })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="space-y-3">
        <ColorField
          label="Background"
          value={pageStyle.backgroundColor}
          onChange={(value) => onPageStyleChange({ backgroundColor: value })}
        />
        <ColorField
          label="Text color"
          value={pageStyle.textColor}
          onChange={(value) => onPageStyleChange({ textColor: value })}
        />
        <ColorField
          label="Accent color"
          value={pageStyle.accentColor}
          onChange={(value) => onPageStyleChange({ accentColor: value })}
        />
        <InspectorField label={`Padding (${pageStyle.padding}px)`}>
          <input
            type="range"
            min={16}
            max={96}
            step={4}
            value={pageStyle.padding}
            onChange={(event) => onPageStyleChange({ padding: Number(event.target.value) })}
            className="w-full accent-primary"
          />
        </InspectorField>
        <InspectorField label={`Font size (${pageStyle.fontSize}px)`}>
          <input
            type="range"
            min={12}
            max={28}
            step={1}
            value={pageStyle.fontSize}
            onChange={(event) => onPageStyleChange({ fontSize: Number(event.target.value) })}
            className="w-full accent-primary"
          />
        </InspectorField>
        <InspectorField label="Corner radius">
          <input
            type="range"
            min={0}
            max={32}
            step={2}
            value={pageStyle.borderRadius}
            onChange={(event) => onPageStyleChange({ borderRadius: Number(event.target.value) })}
            className="w-full accent-primary"
          />
        </InspectorField>
        <InspectorField label="Text align">
          <select
            value={pageStyle.textAlign}
            onChange={(event) =>
              onPageStyleChange({
                textAlign: event.target.value as PlanHtmlPageStyle["textAlign"],
              })
            }
            className={inputClass()}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </InspectorField>
      </section>

      {content?.format === "document" ? (
        <section className="space-y-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Content
          </p>
          <textarea
            value={content.text}
            onChange={(event) => onContentChange({ format: "document", text: event.target.value })}
            rows={10}
            className={cn(
              studioRadius,
              "min-h-[180px] w-full resize-y border border-border/60 bg-background px-2.5 py-2 font-mono text-[11px] leading-relaxed text-foreground outline-none focus:border-primary/40",
            )}
            placeholder="Write page content in Markdown…"
          />
        </section>
      ) : null}

      {content?.format === "diagram" ? (
        <section className="space-y-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Mermaid source
          </p>
          <textarea
            value={content.mermaid}
            onChange={(event) => onContentChange({ format: "diagram", mermaid: event.target.value })}
            rows={10}
            spellCheck={false}
            className={cn(
              studioRadius,
              "min-h-[180px] w-full resize-y border border-border/60 bg-background px-2.5 py-2 font-mono text-[11px] leading-relaxed text-foreground outline-none focus:border-primary/40",
            )}
          />
        </section>
      ) : null}
    </div>
  );
}

function selectionSubtitle(
  selection: PlanHtmlEditorSelection,
  sections: SynopsisSection[],
  tabLabelOverrides: Record<string, string>,
): string {
  const sectionId = sectionIdFromSelection(selection);
  if (sectionId) {
    const section = sections.find((item) => item.id === sectionId);
    if (selection.type === "sidebar-tab-text") {
      return tabLabelOverrides[sectionId] ?? section?.label ?? "Tab";
    }
    return section?.label ?? "Section";
  }
  return SELECTION_LABELS[selection.type];
}

export function PlanHtmlPageEditorSheet({
  open,
  projectTitle,
  sections,
  contentByDeliverableId,
  projectPrompt,
  pageStyles,
  sidebarStyle,
  onPageStylesChange,
  onSidebarStyleChange,
  onContentChange,
  onClose,
}: {
  open: boolean;
  projectTitle: string;
  sections: SynopsisSection[];
  contentByDeliverableId: Record<string, PlanDeliverableContent>;
  projectPrompt: string;
  pageStyles: PlanHtmlPageStylesMap;
  sidebarStyle: PlanHtmlSidebarStyle;
  onPageStylesChange: (styles: PlanHtmlPageStylesMap) => void;
  onSidebarStyleChange: (style: PlanHtmlSidebarStyle) => void;
  onContentChange: (deliverableId: string, content: PlanDeliverableContent) => void;
  onClose: () => void;
}) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? "");
  const [editorSelection, setEditorSelection] = useState<PlanHtmlEditorSelection>(() => ({
    type: "page",
    sectionId: sections[0]?.id ?? "",
  }));
  const [draftStyles, setDraftStyles] = useState<PlanHtmlPageStylesMap>(pageStyles);
  const [draftSidebarStyle, setDraftSidebarStyle] = useState(sidebarStyle);
  const [draftContent, setDraftContent] = useState<Record<string, PlanDeliverableContent>>({});
  const [draftTabLabels, setDraftTabLabels] = useState<Record<string, string>>({});
  const [inspectorPanelWidth, setInspectorPanelWidth] = useState(HTML_EDITOR_INSPECTOR_DEFAULT_WIDTH);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraftStyles(pageStyles);
    setDraftSidebarStyle(sidebarStyle);
    setDraftTabLabels({});
    const nextContent: Record<string, PlanDeliverableContent> = {};
    for (const section of sections) {
      nextContent[section.id] = getSectionContent(contentByDeliverableId, section, projectPrompt);
    }
    setDraftContent(nextContent);
    setDirty(false);
    const nextSectionId = sections[0]?.id ?? "";
    setActiveSectionId((current) => {
      if (sections.some((section) => section.id === current)) return current;
      return nextSectionId;
    });
    setEditorSelection((current) => {
      const sectionId = sectionIdFromSelection(current);
      if (sectionId && sections.some((section) => section.id === sectionId)) {
        return current;
      }
      return { type: "page", sectionId: nextSectionId };
    });
  }, [contentByDeliverableId, open, pageStyles, projectPrompt, sections, sidebarStyle]);

  const activeSection = useMemo(
    () => sections.find((section) => section.id === activeSectionId) ?? sections[0],
    [activeSectionId, sections],
  );

  const selectedSectionId = sectionIdFromSelection(editorSelection) ?? activeSectionId;

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) ?? activeSection,
    [activeSection, sections, selectedSectionId],
  );

  const activeStyle = selectedSection
    ? (draftStyles[selectedSection.id] ?? DEFAULT_PLAN_HTML_PAGE_STYLE)
    : DEFAULT_PLAN_HTML_PAGE_STYLE;

  const activeContent = selectedSection
    ? (draftContent[selectedSection.id] ??
      getSectionContent(contentByDeliverableId, selectedSection, projectPrompt))
    : null;

  const handleEditorSelect = useCallback((selection: PlanHtmlEditorSelection) => {
    setEditorSelection(selection);
    const sectionId = sectionIdFromSelection(selection);
    if (sectionId) {
      setActiveSectionId(sectionId);
    }
  }, []);

  const updateSelectedPageStyle = useCallback(
    (patch: Partial<PlanHtmlPageStyle>) => {
      const sectionId = contentSectionId(editorSelection, activeSectionId);
      if (!sectionId) return;
      setDraftStyles((current) => updatePlanHtmlPageStyle(current, sectionId, patch));
      setDirty(true);
    },
    [activeSectionId, editorSelection],
  );

  const updateSidebarStyle = useCallback((patch: Partial<PlanHtmlSidebarStyle>) => {
    setDraftSidebarStyle((current) => updatePlanHtmlSidebarStyle(current, patch));
    setDirty(true);
  }, []);

  const updateTabLabel = useCallback((sectionId: string, label: string) => {
    setDraftTabLabels((current) => {
      const section = sections.find((item) => item.id === sectionId);
      if (!label.trim() || label === section?.label) {
        const next = { ...current };
        delete next[sectionId];
        return next;
      }
      return { ...current, [sectionId]: label };
    });
    setDirty(true);
  }, [sections]);

  const updateSelectedContent = useCallback(
    (content: PlanDeliverableContent) => {
      const sectionId = contentSectionId(editorSelection, activeSectionId);
      if (!sectionId) return;
      setDraftContent((current) => ({ ...current, [sectionId]: content }));
      setDirty(true);
    },
    [activeSectionId, editorSelection],
  );

  const handleSave = useCallback(() => {
    onPageStylesChange(draftStyles);
    onSidebarStyleChange(draftSidebarStyle);
    for (const section of sections) {
      const deliverable = getSectionDeliverable(section);
      const content = draftContent[section.id];
      if (!content) continue;
      onContentChange(deliverable.id, content);
    }
    setDirty(false);
  }, [
    draftContent,
    draftSidebarStyle,
    draftStyles,
    onContentChange,
    onPageStylesChange,
    onSidebarStyleChange,
    sections,
  ]);

  if (!open || typeof document === "undefined") return null;

  const previewSection = activeSection ?? sections[0];
  const previewContent = previewSection
    ? (draftContent[previewSection.id] ??
      getSectionContent(contentByDeliverableId, previewSection, projectPrompt))
    : null;
  const previewStyle = previewSection
    ? (draftStyles[previewSection.id] ?? DEFAULT_PLAN_HTML_PAGE_STYLE)
    : DEFAULT_PLAN_HTML_PAGE_STYLE;

  return createPortal(
    <div className="plan-html-page-editor-sheet fixed inset-0 z-[1300] flex flex-col bg-background/95 backdrop-blur-sm">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
            <Code2 className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              HTML page editor
            </p>
            <h2 className="truncate text-sm font-semibold text-foreground">{projectTitle}</h2>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className={cn(studioButtonSecondary("px-3 py-1.5 text-xs"))}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty}
            className={cn(studioButtonPrimary("px-3 py-1.5 text-xs"), !dirty && "opacity-50")}
          >
            Save pages
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close HTML page editor"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <PlanHtmlSectionSidebar
          sections={sections}
          activeSectionId={activeSection?.id ?? ""}
          onSelectSection={setActiveSectionId}
          sidebarStyle={draftSidebarStyle}
          editable
          editorSelection={editorSelection}
          onEditorSelect={handleEditorSelect}
          tabLabelOverrides={draftTabLabels}
        />

        <WorkspaceResizeHandle
          side="left"
          ariaLabel="Resize pages sidebar"
          onDrag={(delta) => {
            setDraftSidebarStyle((current) =>
              updatePlanHtmlSidebarStyle(current, {
                width: Math.min(
                  HTML_EDITOR_SIDEBAR_MAX_WIDTH,
                  Math.max(HTML_EDITOR_SIDEBAR_MIN_WIDTH, current.width + delta),
                ),
              }),
            );
            setDirty(true);
          }}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {previewSection && previewContent ? (
            <PlanHtmlPagePreview
              section={previewSection}
              content={previewContent}
              style={previewStyle}
              variant="screen"
              projectTitle={projectTitle}
              canvasBackgroundColor={draftSidebarStyle.canvasBackgroundColor}
              editable
              editorSelection={editorSelection}
              onEditorSelect={handleEditorSelect}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select a section to edit.
            </div>
          )}
        </div>

        <WorkspaceResizeHandle
          side="right"
          ariaLabel="Resize inspector panel"
          onDrag={(delta) =>
            setInspectorPanelWidth((width) =>
              Math.min(
                HTML_EDITOR_INSPECTOR_MAX_WIDTH,
                Math.max(HTML_EDITOR_INSPECTOR_MIN_WIDTH, width + delta),
              ),
            )
          }
        />

        <aside
          className="flex shrink-0 flex-col border-l border-border/60 bg-muted/15"
          style={{ width: inspectorPanelWidth }}
        >
          <div className="border-b border-border/50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {SELECTION_LABELS[editorSelection.type]}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-foreground">
              {selectionSubtitle(editorSelection, sections, draftTabLabels)}
            </p>
            <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
              Click sidebar, tabs, page, text, or background to edit. Text regions show a dashed
              outline on hover.
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
            <SelectionInspector
              selection={editorSelection}
              sections={sections}
              activeSectionId={activeSection?.id ?? ""}
              pageStyle={activeStyle}
              sidebarStyle={draftSidebarStyle}
              content={activeContent}
              tabLabelOverrides={draftTabLabels}
              onPageStyleChange={updateSelectedPageStyle}
              onSidebarStyleChange={updateSidebarStyle}
              onContentChange={updateSelectedContent}
              onTabLabelChange={updateTabLabel}
            />
          </div>
        </aside>
      </div>
    </div>,
    document.body,
  );
}
