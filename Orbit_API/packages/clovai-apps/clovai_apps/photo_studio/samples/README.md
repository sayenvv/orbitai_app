# Photo Studio canvas JSON samples

Files use the same schema as auto-export (`canvasShapes`, `canvasTexts`, background fields).

## ChatGPT logo

**File:** `chatgpt-style-logo.canvas.json` (same as `chatgpt-logo-solid.canvas.json`)

- Official OpenAI / ChatGPT icon as one `path` shape
- **`pathViewBox`: 16** — correct scale for the SVG coordinates
- **`pathFillRule`: "evenodd"`** — required or the knot renders as broken lines

**Designs template:** **ChatGPT Logo**

### Customize in Photo Studio

1. Click the green icon on the canvas.
2. Right panel:
   - **Background** — icon fill color
   - **Background opacity**
   - **Border color** — outline color
   - **Thickness** — outline width (set above 0 to see a border)
3. Canvas **background** — use the canvas background controls (not the shape panel).

## Shape types

| `shapeType` | Notes |
|-------------|--------|
| `rectangle`, `square`, … | Primitives; rectangles support **`sideGaps`** for woven marks |
| `line` | Straight segment |
| `curvedLine` | Quadratic curve |
| `arc` | Elliptical arc |
| `arrow` | Line with arrowhead |
| **`path`** | Custom SVG — `pathData`, optional `pathViewBox`, optional `pathFillRule` |

### Path example (ChatGPT)

```json
{
  "shapeType": "path",
  "pathData": "M14.949 6.547…",
  "pathViewBox": 16,
  "pathFillRule": "evenodd",
  "fillColor": "#10a37f",
  "strokeColor": "#0d8f6f",
  "strokeWidth": 2
}
```

## Interwoven AI mark (generic)

**File:** `interwoven-brand-mark.canvas.json` — six separate path lobes for multi-color DIY marks.
