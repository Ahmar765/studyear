/** Makes inline SVGs scale fully inside responsive containers (fixes clipped/half charts). */
export function normalizeSvgForDisplay(svg: string): string {
  const trimmed = svg?.trim() ?? '';
  if (!trimmed.startsWith('<svg')) return svg;

  const openTagMatch = trimmed.match(/^<svg[^>]*>/i);
  if (!openTagMatch) return svg;

  const openTag = openTagMatch[0];
  const widthMatch = openTag.match(/\bwidth="(\d+(?:\.\d+)?)"/);
  const heightMatch = openTag.match(/\bheight="(\d+(?:\.\d+)?)"/);
  const viewBoxMatch = openTag.match(/\bviewBox="([^"]+)"/);

  let w = widthMatch ? Number(widthMatch[1]) : 800;
  let h = heightMatch ? Number(heightMatch[1]) : 500;

  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].split(/\s+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      w = parts[2]!;
      h = parts[3]!;
    }
  }

  let nextOpen = openTag;
  if (!viewBoxMatch) {
    nextOpen = nextOpen.replace(/^<svg/i, `<svg viewBox="0 0 ${w} ${h}"`);
  }
  if (/\bwidth="/i.test(nextOpen)) {
    nextOpen = nextOpen.replace(/\bwidth="[^"]*"/i, 'width="100%"');
  } else {
    nextOpen = nextOpen.replace(/^<svg/i, '<svg width="100%"');
  }
  if (/\bheight="/i.test(nextOpen)) {
    nextOpen = nextOpen.replace(/\bheight="[^"]*"/i, 'height="auto"');
  }
  if (!/preserveAspectRatio=/i.test(nextOpen)) {
    nextOpen = nextOpen.replace(/^<svg/i, '<svg preserveAspectRatio="xMidYMid meet"');
  }
  nextOpen = nextOpen.replace(/\sstyle="[^"]*max-height:[^;"]*;?[^"]*"/i, (styleAttr) => {
    const cleaned = styleAttr
      .replace(/max-height:\s*[^;"]+;?/gi, '')
      .replace(/style="\s*"/, '');
    return cleaned.includes('style=""') ? '' : cleaned;
  });

  return trimmed.replace(openTag, nextOpen);
}
