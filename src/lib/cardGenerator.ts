/**
 * Generates a Third Way card as a PNG blob using HTML Canvas.
 */
export async function generateThirdWayCard(
  thirdWay: string,
  domain: string,
  isPro: boolean = true
): Promise<Blob> {
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#0A0E1A";
  ctx.fillRect(0, 0, size, size);

  // Gold border inset 24px
  const inset = 24;
  ctx.strokeStyle = "#C9A84C";
  ctx.lineWidth = 1;
  ctx.strokeRect(inset, inset, size - inset * 2, size - inset * 2);

  // Load fonts (use system fallback + Cormorant Garamond from Google Fonts)
  const fontDisplay = '"Cormorant Garamond", Georgia, serif';
  const fontBody = '"Inter", system-ui, sans-serif';

  // Top: AETHEL MIRROR in gold
  ctx.fillStyle = "#C9A84C";
  ctx.font = `400 28px ${fontDisplay}`;
  ctx.textAlign = "center";
  ctx.letterSpacing = "12px";
  ctx.fillText("A E T H E L   M I R R O R", size / 2, 100);

  // Middle: Third Way text in off-white
  ctx.fillStyle = "#F5F0E8";
  ctx.font = `500 48px ${fontDisplay}`;
  ctx.textAlign = "center";

  // Word wrap the text to fit ~3 lines
  const maxWidth = size - 140;
  const lineHeight = 68;
  const lines = wrapText(ctx, thirdWay, maxWidth);
  const maxLines = Math.min(lines.length, 4);
  const totalHeight = maxLines * lineHeight;
  const startY = (size - totalHeight) / 2 + lineHeight / 2;

  for (let i = 0; i < maxLines; i++) {
    let line = lines[i];
    if (i === maxLines - 1 && lines.length > maxLines) {
      line = line.slice(0, -3) + "...";
    }
    ctx.fillText(line, size / 2, startY + i * lineHeight);
  }

  // Bottom left: domain chip
  ctx.fillStyle = "#C9A84C";
  ctx.font = `500 20px ${fontBody}`;
  ctx.textAlign = "left";
  ctx.letterSpacing = "3px";
  ctx.fillText(domain.toUpperCase(), 60, size - 60);

  // Bottom right: URL
  ctx.fillStyle = "#F5F0E880";
  ctx.font = `400 18px ${fontBody}`;
  ctx.textAlign = "right";
  ctx.letterSpacing = "0px";
  ctx.fillText("aethelmirror.com", size - 60, size - 60);

  // Watermark for free users
  if (!isPro) {
    ctx.fillStyle = "rgba(245, 240, 232, 0.15)";
    ctx.font = `400 36px ${fontBody}`;
    ctx.textAlign = "center";
    ctx.letterSpacing = "6px";
    ctx.fillText("aethelmirror.com", size / 2, size - 120);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, "image/png");
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}
