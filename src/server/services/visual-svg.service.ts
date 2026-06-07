import type { VisualRequest } from '@/server/schemas/visual-request';
import { normalizeSvgForDisplay } from '@/lib/normalize-svg-for-display';

function pickColour(index: number) {
  const colours = ["#2563eb", "#16a34a", "#f97316", "#dc2626", "#9333ea", "#0891b2"];
  return colours[index % colours.length];
}

/** Label/value rows from the visual tool (bar, pie, histogram, pictograph). */
function normalizeLabeledSeries(data: unknown): { label: string; value: number }[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => {
      const r = row as { label?: unknown; value?: unknown };
      const value = Number(r.value);
      return {
        label: String(r.label ?? '').trim(),
        value: Number.isFinite(value) ? Math.max(0, value) : 0,
      };
    })
    .filter((d) => d.label.length > 0 || d.value > 0);
}

function normalizeXYSeries(data: unknown): { x: number; y: number }[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => {
      const r = row as { x?: unknown; y?: unknown };
      const x = Number(r.x);
      const y = Number(r.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { x, y };
    })
    .filter((p): p is { x: number; y: number } => p !== null);
}

function createBarGraph(input: VisualRequest) {
  const data = normalizeLabeledSeries(input.data);
  if (data.length === 0) {
      return { svg: '<svg width="800" height="500" xmlns="http://www.w3.org/2000/svg"><text x="400" y="250" text-anchor="middle">No data provided for bar graph.</text></svg>' };
  }

  const width = 800;
  const height = 500;
  const padding = 70;
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = (width - padding * 2) / data.length - 20;

  const bars = data.map((d, i) => {
    const barHeight = (d.value / maxValue) * (height - padding * 2);
    const x = padding + i * (barWidth + 20) + 10;
    const y = height - padding - barHeight;

    return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${pickColour(i)}" />
      <text x="${x + barWidth / 2}" y="${height - 45}" text-anchor="middle" font-size="14" fill="#333">${d.label}</text>
      <text x="${x + barWidth / 2}" y="${y - 10}" text-anchor="middle" font-size="14" font-weight="bold" fill="#333">${d.value}</text>
    `;
  }).join("");

  const yAxisLabels = [];
  const numTicks = 5;
  for (let i = 0; i <= numTicks; i++) {
    const value = (maxValue / numTicks) * i;
    const y = height - padding - (value / maxValue) * (height - padding * 2);
    yAxisLabels.push(`<text x="${padding - 10}" y="${y + 4}" text-anchor="end" font-size="12" fill="#666">${Math.round(value)}</text>`);
    yAxisLabels.push(`<line x1="${padding - 5}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`);
  }

  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background-color: white; font-family: sans-serif;">
  <text x="${width / 2}" y="35" text-anchor="middle" font-size="22" font-weight="bold" fill="#111">${input.title}</text>
  
  ${yAxisLabels.join("")}
  
  <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>
  <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>
  ${bars}
  <text x="${width / 2}" y="${height - 15}" text-anchor="middle" font-size="14" fill="#333">${input.xAxisLabel ?? ""}</text>
  <text x="${padding - 50}" y="${height / 2}" transform="rotate(-90 ${padding - 50} ${height / 2})" text-anchor="middle" font-size="14" fill="#333">${input.yAxisLabel ?? ""}</text>
</svg>`;

  return { svg };
}

/** Histogram: same label/value data as bar charts, adjacent bins (no gaps). */
function createHistogram(input: VisualRequest) {
  const data = normalizeLabeledSeries(input.data);
  if (data.length === 0) {
    return {
      svg: '<svg width="800" height="500" xmlns="http://www.w3.org/2000/svg"><text x="400" y="250" text-anchor="middle">No data provided for histogram.</text></svg>',
    };
  }

  const width = 800;
  const height = 500;
  const padding = 70;
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const plotWidth = width - padding * 2;
  const barWidth = plotWidth / data.length;

  const bars = data.map((d, i) => {
    const barHeight = (d.value / maxValue) * (height - padding * 2);
    const x = padding + i * barWidth;
    const y = height - padding - barHeight;

    return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${pickColour(i)}" />
      <text x="${x + barWidth / 2}" y="${height - 45}" text-anchor="middle" font-size="14" fill="#333">${d.label}</text>
      <text x="${x + barWidth / 2}" y="${y - 10}" text-anchor="middle" font-size="14" font-weight="bold" fill="#333">${d.value}</text>
    `;
  }).join('');

  const yAxisLabels = [];
  const numTicks = 5;
  for (let i = 0; i <= numTicks; i++) {
    const value = (maxValue / numTicks) * i;
    const y = height - padding - (value / maxValue) * (height - padding * 2);
    yAxisLabels.push(
      `<text x="${padding - 10}" y="${y + 4}" text-anchor="end" font-size="12" fill="#666">${Math.round(value)}</text>`,
    );
    yAxisLabels.push(
      `<line x1="${padding - 5}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`,
    );
  }

  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background-color: white; font-family: sans-serif;">
  <text x="${width / 2}" y="35" text-anchor="middle" font-size="22" font-weight="bold" fill="#111">${input.title}</text>
  ${yAxisLabels.join('')}
  <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>
  <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>
  ${bars}
  <text x="${width / 2}" y="${height - 15}" text-anchor="middle" font-size="14" fill="#333">${input.xAxisLabel ?? 'Category'}</text>
  <text x="${padding - 50}" y="${height / 2}" transform="rotate(-90 ${padding - 50} ${height / 2})" text-anchor="middle" font-size="14" fill="#333">${input.yAxisLabel ?? 'Frequency'}</text>
</svg>`;

  return { svg };
}

function createLineGraph(input: VisualRequest) {
  const data = normalizeXYSeries(input.data);
  const width = 800;
  const height = 500;
  const padding = 70;

  if (data.length === 0) {
    return {
      svg: `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="400" y="250" text-anchor="middle">No data provided for line chart.</text></svg>`,
    };
  }

  const maxY = Math.max(...data.map((d) => d.y), 1);
  const maxX = Math.max(...data.map((d) => d.x), 1);

  const sorted = [...data].sort((a, b) => a.x - b.x);

  const points = sorted.map((d) => {
    const x = padding + (d.x / maxX) * (width - padding * 2);
    const y = height - padding - (d.y / maxY) * (height - padding * 2);
    return `${x},${y}`;
  });

  const circles = data.map((d) => {
    const x = padding + (d.x / maxX) * (width - padding * 2);
    const y = height - padding - (d.y / maxY) * (height - padding * 2);
    return `<circle cx="${x}" cy="${y}" r="6" fill="#2563eb" />`;
  }).join("");

  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background-color: white; font-family: sans-serif;">
  <rect width="100%" height="100%" fill="white"/>
  <text x="${width / 2}" y="35" text-anchor="middle" font-size="26" font-weight="bold">${input.title}</text>
  <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="black" stroke-width="2"/>
  <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="black" stroke-width="2"/>
  <polyline points="${points.join(" ")}" fill="none" stroke="#2563eb" stroke-width="4"/>
  ${circles}
  <text x="${width / 2}" y="${height - 15}" text-anchor="middle" font-size="16">${input.xAxisLabel ?? "X Axis"}</text>
  <text x="20" y="${height / 2}" transform="rotate(-90 20 ${height / 2})" text-anchor="middle" font-size="16">${input.yAxisLabel ?? "Y Axis"}</text>
</svg>`;

  return { svg };
}

function escapeSvgText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Vertices + edges (undirected lines between named nodes). */
function normalizeGraphData(data: unknown): {
  nodes: { id: string; label: string; x?: number; y?: number }[];
  edges: { from: string; to: string }[];
} {
  const raw = data as {
    vertices?: { id?: string; name?: string; x?: number; y?: number }[];
    nodes?: { id?: string; label?: string; x?: number; y?: number }[];
    edges?: { from?: string; to?: string }[];
  };

  let nodes: { id: string; label: string; x?: number; y?: number }[] = [];

  const vertexList = raw?.vertices ?? raw?.nodes;
  if (Array.isArray(vertexList)) {
    nodes = vertexList
      .map((v, i) => {
        const id = String(v.id ?? v.name ?? `V${i + 1}`).trim();
        const label = String(v.name ?? v.label ?? id).trim();
        const x = Number(v.x);
        const y = Number(v.y);
        return {
          id,
          label: label || id,
          ...(Number.isFinite(x) && Number.isFinite(y) ? { x, y } : {}),
        };
      })
      .filter((n) => n.id.length > 0);
  }

  let edges: { from: string; to: string }[] = [];
  if (Array.isArray(raw?.edges)) {
    edges = raw.edges
      .map((e) => ({
        from: String(e.from ?? '').trim(),
        to: String(e.to ?? '').trim(),
      }))
      .filter((e) => e.from.length > 0 && e.to.length > 0 && e.from !== e.to);
  }

  return { nodes, edges };
}

function createScatterPlot(input: VisualRequest) {
  const data = normalizeXYSeries(input.data);
  const width = 800;
  const height = 500;
  const padding = 70;

  if (data.length === 0) {
    return {
      svg: `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="400" y="250" text-anchor="middle">No data provided for scatter plot.</text></svg>`,
    };
  }

  const maxY = Math.max(...data.map((d) => d.y), 1);
  const maxX = Math.max(...data.map((d) => d.x), 1);

  const dots = data
    .map((d) => {
      const x = padding + (d.x / maxX) * (width - padding * 2);
      const y = height - padding - (d.y / maxY) * (height - padding * 2);
      return `<circle cx="${x}" cy="${y}" r="7" fill="#2563eb" stroke="#1d4ed8" stroke-width="2"/>`;
    })
    .join('');

  const svg = `
<!-- StudYear scatter plot: points only, no connecting lines -->
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background-color: white; font-family: sans-serif;">
  <rect width="100%" height="100%" fill="white"/>
  <text x="${width / 2}" y="35" text-anchor="middle" font-size="26" font-weight="bold">${escapeSvgText(input.title)}</text>
  <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="black" stroke-width="2"/>
  <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="black" stroke-width="2"/>
  ${dots}
  <text x="${width / 2}" y="${height - 15}" text-anchor="middle" font-size="16">${escapeSvgText(input.xAxisLabel ?? 'X Axis')}</text>
  <text x="20" y="${height / 2}" transform="rotate(-90 20 ${height / 2})" text-anchor="middle" font-size="16">${escapeSvgText(input.yAxisLabel ?? 'Y Axis')}</text>
</svg>`;

  return { svg };
}

function createGraphTheoryDiagram(input: VisualRequest) {
  const { nodes, edges } = normalizeGraphData(input.data);
  const width = 800;
  const height = 500;
  const cx = width / 2;
  const cy = height / 2 + 15;
  const radius = Math.min(180, 60 + nodes.length * 18);

  if (nodes.length === 0) {
    return {
      svg: `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="400" y="250" text-anchor="middle">Add at least one vertex to draw the graph.</text></svg>`,
    };
  }

  const positioned = new Map<string, { x: number; y: number; label: string }>();
  nodes.forEach((node, i) => {
    if (node.x !== undefined && node.y !== undefined) {
      positioned.set(node.id, { x: node.x, y: node.y, label: node.label });
      return;
    }
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    positioned.set(node.id, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      label: node.label,
    });
  });

  const nodeRadius = 22;
  const resolvePos = (id: string) => {
    if (positioned.has(id)) return positioned.get(id);
    const lower = id.toLowerCase();
    for (const [key, pos] of positioned) {
      if (key.toLowerCase() === lower) return pos;
    }
    return undefined;
  };

  const edgeLines = edges
    .map((e) => {
      const a = resolvePos(e.from);
      const b = resolvePos(e.to);
      if (!a || !b) return '';
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#64748b" stroke-width="2.5"/>`;
    })
    .join('');

  const nodeMarkup = nodes
    .map((node) => {
      const p = positioned.get(node.id);
      if (!p) return '';
      return `
      <circle cx="${p.x}" cy="${p.y}" r="${nodeRadius}" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
      <text x="${p.x}" y="${p.y + 5}" text-anchor="middle" font-size="15" font-weight="bold" fill="#1e3a8a">${escapeSvgText(p.label)}</text>
    `;
    })
    .join('');

  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background-color: white; font-family: sans-serif;">
  <rect width="100%" height="100%" fill="white"/>
  <text x="${width / 2}" y="35" text-anchor="middle" font-size="22" font-weight="bold">${escapeSvgText(input.title)}</text>
  ${edgeLines}
  ${nodeMarkup}
</svg>`;

  return { svg };
}

function normalizeCoordinatePoints(data: unknown): { x: number; y: number }[] {
  const raw = data as { points?: unknown } | unknown;
  if (Array.isArray((raw as { points?: unknown })?.points)) {
    return normalizeXYSeries((raw as { points: unknown }).points);
  }
  if (Array.isArray(raw)) {
    return normalizeXYSeries(raw);
  }
  return [];
}

function createCoordinateGraph(input: VisualRequest) {
  const width = 800;
  const height = 520;
  const titleBand = 44;
  const pad = { left: 56, right: 36, top: titleBand + 20, bottom: 44 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const points = normalizeCoordinatePoints(input.data);
  if (points.length === 0) {
    return {
      svg: `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><text x="400" y="260" text-anchor="middle">Add at least one coordinate point.</text></svg>`,
    };
  }

  const xs = [0, ...points.map((p) => p.x)];
  const ys = [0, ...points.map((p) => p.y)];
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  if (minX === maxX) {
    minX -= 1;
    maxX += 1;
  }
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }
  const marginX = Math.max((maxX - minX) * 0.12, 0.5);
  const marginY = Math.max((maxY - minY) * 0.12, 0.5);
  minX -= marginX;
  maxX += marginX;
  minY -= marginY;
  maxY += marginY;

  const spanX = maxX - minX;
  const spanY = maxY - minY;

  const toPx = (x: number, y: number) => ({
    px: pad.left + ((x - minX) / spanX) * plotW,
    py: pad.top + plotH - ((y - minY) / spanY) * plotH,
  });

  const gridLines: string[] = [];
  const tickCount = 5;
  for (let i = 0; i <= tickCount; i++) {
    const tx = minX + (spanX * i) / tickCount;
    const ty = minY + (spanY * i) / tickCount;
    const gx = toPx(tx, minY).px;
    const gy = toPx(minX, ty).py;
    gridLines.push(
      `<line x1="${gx}" y1="${pad.top}" x2="${gx}" y2="${height - pad.bottom}" stroke="#e5e7eb" stroke-width="1"/>`,
    );
    gridLines.push(
      `<line x1="${pad.left}" y1="${gy}" x2="${width - pad.right}" y2="${gy}" stroke="#e5e7eb" stroke-width="1"/>`,
    );
    gridLines.push(
      `<text x="${gx}" y="${height - pad.bottom + 18}" text-anchor="middle" font-size="11" fill="#666">${Number(tx.toFixed(2))}</text>`,
    );
    gridLines.push(
      `<text x="${pad.left - 8}" y="${gy + 4}" text-anchor="end" font-size="11" fill="#666">${Number(ty.toFixed(2))}</text>`,
    );
  }

  let axisMarkup = '';
  if (minX <= 0 && maxX >= 0) {
    const o = toPx(0, 0);
    axisMarkup += `<line x1="${o.px}" y1="${pad.top}" x2="${o.px}" y2="${height - pad.bottom}" stroke="#111" stroke-width="2.5"/>`;
  }
  if (minY <= 0 && maxY >= 0) {
    const o = toPx(0, 0);
    axisMarkup += `<line x1="${pad.left}" y1="${o.py}" x2="${width - pad.right}" y2="${o.py}" stroke="#111" stroke-width="2.5"/>`;
  }
  if (!axisMarkup) {
    const midX = toPx((minX + maxX) / 2, 0);
    const midY = toPx(0, (minY + maxY) / 2);
    axisMarkup = `<line x1="${pad.left}" y1="${midY.py}" x2="${width - pad.right}" y2="${midY.py}" stroke="#111" stroke-width="2"/>
      <line x1="${midX.px}" y1="${pad.top}" x2="${midX.px}" y2="${height - pad.bottom}" stroke="#111" stroke-width="2"/>`;
  }

  const plottedPoints = points
    .map((p) => {
      const { px, py } = toPx(p.x, p.y);
      return `
      <circle cx="${px}" cy="${py}" r="7" fill="#dc2626" stroke="#991b1b" stroke-width="2"/>
      <text x="${px + 10}" y="${py - 10}" font-size="13" fill="#1f2937">(${p.x}, ${p.y})</text>
    `;
    })
    .join('');

  const xLabel = toPx(maxX, minY);
  const yLabel = toPx(minX, maxY);

  const svg = `
<svg viewBox="0 0 ${width} ${height}" width="100%" xmlns="http://www.w3.org/2000/svg" style="max-height:420px;background-color:white;font-family:sans-serif;">
  <rect width="100%" height="100%" fill="white"/>
  <text x="${width / 2}" y="28" text-anchor="middle" font-size="22" font-weight="bold" fill="#111">${escapeSvgText(input.title)}</text>
  ${gridLines.join('')}
  ${axisMarkup}
  <text x="${xLabel.px}" y="${height - pad.bottom + 36}" text-anchor="end" font-size="14" fill="#333">x</text>
  <text x="${pad.left - 28}" y="${yLabel.py}" text-anchor="middle" font-size="14" fill="#333" transform="rotate(-90 ${pad.left - 28} ${yLabel.py})">y</text>
  ${plottedPoints}
</svg>`;

  return { svg };
}

function createGeometryDiagram(input: VisualRequest) {
  const shape = (input.data as {shape: string})?.shape ?? "triangle";

  if (shape === "triangle") {
    return {
      svg: `
<svg width="700" height="500" xmlns="http://www.w3.org/2000/svg" style="background-color: white; font-family: sans-serif;">
  <rect width="100%" height="100%" fill="white"/>
  <text x="350" y="40" text-anchor="middle" font-size="26" font-weight="bold">${input.title}</text>
  <polygon points="160,400 540,400 350,110" fill="#dbeafe" stroke="#2563eb" stroke-width="5"/>
  <text x="350" y="430" text-anchor="middle" font-size="18">base</text>
  <text x="250" y="250" font-size="18">side</text>
  <text x="440" y="250" font-size="18">side</text>
  <text x="350" y="100" text-anchor="middle" font-size="18">height</text>
  <line x1="350" y1="110" x2="350" y2="400" stroke="#dc2626" stroke-dasharray="6" stroke-width="3"/>
</svg>`,
    };
  }

  return {
    svg: `
<svg width="700" height="500" xmlns="http://www.w3.org/2000/svg" style="background-color: white; font-family: sans-serif;">
  <rect width="100%" height="100%" fill="white"/>
  <text x="350" y="40" text-anchor="middle" font-size="26" font-weight="bold">${input.title}</text>
  <circle cx="350" cy="250" r="130" fill="#dcfce7" stroke="#16a34a" stroke-width="5"/>
  <line x1="350" y1="250" x2="480" y2="250" stroke="#dc2626" stroke-width="4"/>
  <text x="410" y="240" font-size="18">radius</text>
</svg>`,
  };
}

function evaluateFunction(expression: string, x: number) {
  try {
    // Basic safety eval
    if (/[^x\d\s\+\-\*\/\^\(\)\.]/.test(expression)) {
      console.warn("Invalid characters in function expression.");
      return NaN;
    }
    const safeExpression = expression.replace(/\^/g, '**');
    const func = new Function('x', `return ${safeExpression}`);
    return func(x);
  } catch (e) {
    console.error("Error evaluating function:", e);
    return NaN;
  }
}

function createFunctionGraph(input: VisualRequest) {
  const expression = (input.data as {expression: string})?.expression ?? "x";
  const width = 700;
  const height = 700;
  const center = width / 2;
  const scale = 35;

  const points: string[] = [];
  for (let x = -10; x <= 10; x += 0.2) {
    const y = evaluateFunction(expression, x);
    if (y === null || !isFinite(y)) continue;
    const px = center + x * scale;
    const py = center - y * scale;

    if (Number.isFinite(px) && Number.isFinite(py)) {
      points.push(`${px},${py}`);
    }
  }

  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background-color: white; font-family: sans-serif;">
  <rect width="100%" height="100%" fill="white"/>
  <line x1="0" y1="${center}" x2="${width}" y2="${center}" stroke="black" stroke-width="3"/>
  <line x1="${center}" y1="0" x2="${center}" y2="${height}" stroke="black" stroke-width="3"/>
  <text x="350" y="30" text-anchor="middle" font-size="24" font-weight="bold">${input.title}</text>
  <polyline points="${points.join(" ")}" fill="none" stroke="#2563eb" stroke-width="4"/>
  <text x="350" y="670" text-anchor="middle" font-size="18">y = ${expression}</text>
</svg>`;

  return { svg };
}

function createPieChart(input: VisualRequest) {
  const data = normalizeLabeledSeries(input.data);
  const width = 500;
  const height = 400;
  const pieCx = 155;
  const pieCy = 210;
  const radius = 120;
  const legendX = 300;

  if (data.length === 0) {
      return { svg: `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="250" y="200" text-anchor="middle">No data for pie chart.</text></svg>` };
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  let startAngle = -90;
  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 360;
    const endAngle = startAngle + angle;
    const largeArcFlag = angle > 180 ? 1 : 0;

    const x1 = pieCx + radius * Math.cos(startAngle * Math.PI / 180);
    const y1 = pieCy + radius * Math.sin(startAngle * Math.PI / 180);
    const x2 = pieCx + radius * Math.cos(endAngle * Math.PI / 180);
    const y2 = pieCy + radius * Math.sin(endAngle * Math.PI / 180);

    const path = `M ${pieCx},${pieCy} L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`;
    startAngle = endAngle;

    return `<path d="${path}" fill="${pickColour(i)}" stroke="white" stroke-width="2"/>`;
  }).join("");

  const legend = data.map((d, i) => {
    const percentage = ((d.value / total) * 100).toFixed(0);
    return `
      <g>
        <rect x="${legendX}" y="${60 + i * 25}" width="15" height="15" rx="3" fill="${pickColour(i)}" />
        <text x="${legendX + 25}" y="${73 + i * 25}" font-size="14" fill="#333">${d.label} (${percentage}%)</text>
      </g>
    `;
  }).join("");

  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="background-color: white; font-family: sans-serif;">
  <text x="${width / 2}" y="28" text-anchor="middle" font-size="20" font-weight="bold">${input.title}</text>
  <g>${slices}</g>
  <g>${legend}</g>
</svg>`;

  return { svg };
}


export function generateChartSvg(input: VisualRequest): { svg?: string } {
  let result: { svg?: string };
  switch (input.type) {
    case "BAR_GRAPH":
      result = createBarGraph(input);
      break;
    case "LINE_GRAPH":
      result = createLineGraph(input);
      break;
    case "COORDINATE_GRAPH":
      result = createCoordinateGraph(input);
      break;
    case "GEOMETRY_DIAGRAM":
      result = createGeometryDiagram(input);
      break;
    case "FUNCTION_GRAPH":
      result = createFunctionGraph(input);
      break;
    case "PIE_CHART":
    case "PICTOGRAPH":
      result = createPieChart(input);
      break;
    case "HISTOGRAM":
      result = createHistogram(input);
      break;
    case "SCATTER_PLOT":
      result = createScatterPlot(input);
      break;
    case "GRAPH_THEORY_DIAGRAM":
      result = createGraphTheoryDiagram(input);
      break;
    default:
      throw new Error(`Unsupported visual chart type: ${input.type}`);
  }
  if (result.svg) {
    result.svg = normalizeSvgForDisplay(result.svg);
  }
  return result;
}
