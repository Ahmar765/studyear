import type { VisualRequest } from '@/server/schemas/visual-request';

function pickColour(index: number) {
  const colours = ["#2563eb", "#16a34a", "#f97316", "#dc2626", "#9333ea", "#0891b2"];
  return colours[index % colours.length];
}

function createBarGraph(input: VisualRequest) {
  const data = (input.data as { label: string; value: number }[]) ?? [];
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

function createLineGraph(input: VisualRequest) {
  const data = (input.data as {x: number; y: number}[]) ?? [];
  const width = 800;
  const height = 500;
  const padding = 70;
  const maxY = Math.max(...data.map(d => d.y), 1);
  const maxX = Math.max(...data.map(d => d.x), 1);

  const points = data.map(d => {
    const x = padding + (d.x / maxX) * (width - padding * 2);
    const y = height - padding - (d.y / maxY) * (height - padding * 2);
    return `${x},${y}`;
  });

  const circles = data.map(d => {
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

function createCoordinateGraph(input: VisualRequest) {
  const width = 700;
  const height = 700;
  const center = width / 2;
  const scale = 35;
  const points = (input.data as {points: {x:number, y:number}[]})?.points ?? [];

  const plottedPoints = points.map((p: any) => {
    const cx = center + p.x * scale;
    const cy = center - p.y * scale;

    return `
      <circle cx="${cx}" cy="${cy}" r="6" fill="#dc2626"/>
      <text x="${cx + 8}" y="${cy - 8}" font-size="14">(${p.x}, ${p.y})</text>
    `;
  }).join("");

  const gridLines = Array.from({ length: 21 }, (_, i) => {
    const pos = i * scale;
    return `
      <line x1="${pos}" y1="0" x2="${pos}" y2="${height}" stroke="#e5e7eb"/>
      <line x1="0" y1="${pos}" x2="${width}" y2="${pos}" stroke="#e5e7eb"/>
    `;
  }).join("");

  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background-color: white; font-family: sans-serif;">
  <rect width="100%" height="100%" fill="white"/>
  ${gridLines}
  <line x1="0" y1="${center}" x2="${width}" y2="${center}" stroke="black" stroke-width="3"/>
  <line x1="${center}" y1="0" x2="${center}" y2="${height}" stroke="black" stroke-width="3"/>
  <text x="${width / 2}" y="30" text-anchor="middle" font-size="24" font-weight="bold">${input.title}</text>
  <text x="${width - 30}" y="${center - 10}" font-size="18">x</text>
  <text x="${center + 10}" y="30" font-size="18">y</text>
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
  const data = (input.data as { label: string; value: number }[]) ?? [];
  const width = 500;
  const height = 500;
  const radius = Math.min(width, height) / 2 - 40;
  const cx = width / 2;
  const cy = height / 2;

  if (data.length === 0) {
      return { svg: `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="250" y="250" text-anchor="middle">No data for pie chart.</text></svg>` };
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  let startAngle = -90; // Start at the top
  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 360;
    const endAngle = startAngle + angle;
    const largeArcFlag = angle > 180 ? 1 : 0;

    const x1 = cx + radius * Math.cos(startAngle * Math.PI / 180);
    const y1 = cy + radius * Math.sin(startAngle * Math.PI / 180);
    const x2 = cx + radius * Math.cos(endAngle * Math.PI / 180);
    const y2 = cy + radius * Math.sin(endAngle * Math.PI / 180);

    const path = `M ${cx},${cy} L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`;
    startAngle = endAngle;

    return `<path d="${path}" fill="${pickColour(i)}" stroke="white" stroke-width="2"/>`;
  }).join("");

  const legend = data.map((d, i) => {
    const percentage = ((d.value / total) * 100).toFixed(0);
    return `
      <g>
        <rect x="20" y="${40 + i * 25}" width="15" height="15" rx="3" fill="${pickColour(i)}" />
        <text x="45" y="${53 + i * 25}" font-size="14" fill="#333">${d.label} (${percentage}%)</text>
      </g>
    `;
  }).join("");


  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} 500" xmlns="http://www.w3.org/2000/svg" style="background-color: white; font-family: sans-serif;">
  <text x="${width / 2}" y="25" text-anchor="middle" font-size="20" font-weight="bold">${input.title}</text>
  <g transform="translate(0, 50)">
    <g transform="translate(${cx - 100}, ${cy})">
      ${slices}
    </g>
    <g transform="translate(350, 80)">
      ${legend}
    </g>
  </g>
</svg>`;

  return { svg };
}


export function generateChartSvg(input: VisualRequest): { svg?: string } {
  switch (input.type) {
    case "BAR_GRAPH":
      return createBarGraph(input);
    case "LINE_GRAPH":
      return createLineGraph(input);
    case "COORDINATE_GRAPH":
      return createCoordinateGraph(input);
    case "GEOMETRY_DIAGRAM":
      return createGeometryDiagram(input);
    case "FUNCTION_GRAPH":
      return createFunctionGraph(input);
    case "PIE_CHART":
      return createPieChart(input);
    // Cases for other chart types would go here
    // case "SCATTER_PLOT":
    //   return createScatterPlot(input);
    // case "HISTOGRAM":
    //   return createHistogram(input);
    default:
      throw new Error(`Unsupported visual chart type: ${input.type}`);
  }
}
