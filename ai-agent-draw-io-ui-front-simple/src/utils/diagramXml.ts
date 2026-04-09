import pako from 'pako';

/**
 * 将 <diagram> 内 base64+deflate 的压缩块展开为明文 <mxGraphModel>（与「导出为 XML」可读格式一致）。
 */
export function expandCompressedDiagramInMxfile(mxfileXml: string): string {
  return mxfileXml.replace(
    /<diagram([^>]*)>([^<]*)<\/diagram>/gi,
    (full, attrs: string, inner: string) => {
      const t = inner.trim();
      if (!t || t.startsWith('<')) {
        return full;
      }
      try {
        const decoded = atob(t);
        const byteArray = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
          byteArray[i] = decoded.charCodeAt(i);
        }
        const decompressed = pako.inflate(byteArray, { to: 'string' });
        return `<diagram${attrs}>${decompressed}</diagram>`;
      } catch {
        return full;
      }
    }
  );
}

/**
 * 从 AI 回复文本中提取可在 diagrams.net / draw.io embed 中加载的 XML。
 * 只认 <mxfile>...</mxfile> 格式，忽略其他文本。
 * 自动根据内容大小扩展画布页面尺寸，避免连线交叉。
 * 处理 JSON 转义字符（\n、\" 等）
 */
export function extractDiagramXml(raw: string): string | undefined {
  if (!raw || typeof raw !== 'string') {
    return undefined;
  }

  // 先尝试直接匹配（正常格式）
  let m = raw.match(/<mxfile[\s\S]*?<\/mxfile>/i);
  if (m) {
    return m[0];
  }

  // 处理 JSON 转义格式：\n 和 \" 等
  // 将转义的 XML 片段还原为正常 XML
  const unescaped = raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');

  m = unescaped.match(/<mxfile[\s\S]*?<\/mxfile>/i);
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
