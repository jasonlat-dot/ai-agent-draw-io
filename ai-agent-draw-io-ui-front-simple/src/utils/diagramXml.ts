/**
 * 从 AI 回复文本中提取可在 diagrams.net / draw.io embed 中加载的 XML。
 * 只认 <mxfile>...</mxfile> 格式，忽略其他文本。
 * 自动根据内容大小扩展画布页面尺寸，避免连线交叉。
 */
export function extractDiagramXml(raw: string): string | undefined {
  if (!raw || typeof raw !== 'string') {
    return undefined;
  }

  const m = raw.match(/<mxfile[\s\S]*?<\/mxfile>/i);
  return m ? m[0] : undefined;
}

const PAGE_PRESETS: Array<{ threshold: number; width: number; height: number }> = [
  { threshold: 20, width: 2000, height: 2000 },
  { threshold: 40, width: 2400, height: 2400 },
  { threshold: 70, width: 2800, height: 2800 },
  { threshold: Infinity, width: 3200, height: 3200 },
];

function getCanvasSize(xml: string): { pageWidth: number; pageHeight: number } {
  const nodeCount = (xml.match(/<mx(Cell|Vertex|Edge)[^>]*>/g) || []).length;
  const preset = PAGE_PRESETS.find((p) => nodeCount <= p.threshold);
  return {
    pageWidth: preset ? preset.width : 3200,
    pageHeight: preset ? preset.height : 3200,
  };
}

export function autoExpandCanvas(xml: string): string {
  if (!xml) return xml;

  const { pageWidth, pageHeight } = getCanvasSize(xml);
  return xml
    .replace(/(<mxGraphModel\s[^>]*)\bpageWidth="\d+"/i, `$1pageWidth="${pageWidth}"`)
    .replace(/(<mxGraphModel\s[^>]*)\bpageHeight="\d+"/i, `$1pageHeight="${pageHeight}"`);
}
