import type { CanvasShapeElement } from "./photo-studio-canvas-types";
import { PATH_CHATGPT_ICON, PATH_CHATGPT_ICON_VIEWBOX, PATH_LOBE_CHATGPT } from "./photo-studio-path-presets";

export const CHATGPT_MARK_GROUP = "chatgpt-mark";

const GREEN = "#10a37f";
const GREEN_DARK = "#0d8f6f";

/** Radial positions for six knot arms (x%, y%, rotation°). */
const LOBE_LAYOUT: Array<{ x: number; y: number; rotation: number }> = [
  { x: 50, y: 28.5, rotation: 0 },
  { x: 66, y: 37.5, rotation: 60 },
  { x: 66, y: 54.5, rotation: 120 },
  { x: 50, y: 63.5, rotation: 180 },
  { x: 34, y: 54.5, rotation: 240 },
  { x: 34, y: 37.5, rotation: 300 },
];

export function isChatGptSolidIcon(shape: CanvasShapeElement): boolean {
  if (shape.shapeType !== "path" || shape.pathViewBox !== PATH_CHATGPT_ICON_VIEWBOX) {
    return false;
  }
  const data = shape.pathData?.trim();
  return Boolean(data && data.length > 200 && data.startsWith("M14.949"));
}

export function createChatGptLobeShape(index: number, fillColor: string): CanvasShapeElement {
  const layout = LOBE_LAYOUT[index - 1];
  return {
    id: `chatgpt-lobe-${index}`,
    shapeType: "path",
    pathData: PATH_LOBE_CHATGPT,
    x: layout.x,
    y: layout.y,
    width: 20,
    height: 30,
    rotation: layout.rotation,
    groupId: CHATGPT_MARK_GROUP,
    strokeWidth: 0,
    strokeColor: GREEN_DARK,
    fillColor,
    fillOpacity: 1,
    cornerRadius: 0,
    label: `Arm ${index}`,
  };
}

/** Six separate paths — select any arm and change fill in the right panel. */
export function createChatGptEditableLogoShapes(): CanvasShapeElement[] {
  return LOBE_LAYOUT.map((_, index) => {
    const i = index + 1;
    const fill = i % 2 === 1 ? GREEN : GREEN_DARK;
    return createChatGptLobeShape(i, fill);
  });
}

export function createChatGptSolidIconShape(): CanvasShapeElement {
  return {
    id: "chatgpt-icon",
    shapeType: "path",
    pathData: PATH_CHATGPT_ICON,
    pathViewBox: PATH_CHATGPT_ICON_VIEWBOX,
    x: 50,
    y: 44,
    width: 40,
    height: 40,
    rotation: 0,
    groupId: null,
    strokeWidth: 0,
    strokeColor: GREEN,
    fillColor: GREEN,
    fillOpacity: 1,
    cornerRadius: 0,
    pathFillRule: "evenodd",
    label: "ChatGPT icon",
  };
}

/** Replace one solid icon path with six independently colorable lobes. */
export function explodeChatGptSolidIcon(solidId: string): {
  removeId: string;
  shapes: CanvasShapeElement[];
} {
  return {
    removeId: solidId,
    shapes: createChatGptEditableLogoShapes(),
  };
}
