import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

/**
 * Contrast regression guard.
 *
 * On a near-black background (HSL 0 0% 2%), text using foreground/20
 * or lower has a contrast ratio of ~1.6:1 — far below WCAG AA (4.5:1).
 * This test scans every production component for dangerously low text
 * opacity classes so legibility regressions are caught automatically in CI.
 *
 * Rules:
 *   - text-foreground/{5–29}  → BANNED for text (invisible on dark bg)
 *   - text-foreground/30       → allowed only for decorative/icon text
 *   - text-foreground/35+      → OK
 *   - border-foreground/*, bg-foreground/*, hover:text-*, placeholder:text-*
 *     → exempt (borders, backgrounds, and interactive states are not body text)
 */

const COMPONENTS_DIR = join(__dirname, "..", "components");
const MIN_TEXT_OPACITY = 30; // minimum allowed: text-foreground/30

// Regex matches text-foreground/NN where NN < MIN_TEXT_OPACITY
// Excludes: hover:, focus:, active:, group-hover:, peer-hover:, placeholder:, border-, bg-
const BANNED_PATTERN = new RegExp(
  // negative lookbehind: skip if preceded by hover:|focus:|active:|group-hover:|peer-hover:|placeholder:
  `(?<!hover:|focus:|active:|group-hover:|peer-hover:|placeholder:)` +
  // match text-foreground/ followed by a number below threshold
  `text-foreground\\/(?:${Array.from({ length: MIN_TEXT_OPACITY }, (_, i) => i).join("|")})` +
  // word boundary so /20 doesn't match /200
  `(?!\\d)`,
  "g"
);

function getComponentFiles(): string[] {
  return readdirSync(COMPONENTS_DIR)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => join(COMPONENTS_DIR, f));
}

function findViolations(filePath: string): { line: number; text: string; match: string }[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const violations: { line: number; text: string; match: string }[] = [];

  lines.forEach((lineText, idx) => {
    // Skip lines that are only border or bg usage
    // We check each match individually
    const matches = lineText.match(BANNED_PATTERN);
    if (!matches) return;

    for (const match of matches) {
      // Extra safety: skip if this specific match is inside a border-* or bg-* context
      // by checking the surrounding text
      const matchIdx = lineText.indexOf(match);
      const before = lineText.slice(Math.max(0, matchIdx - 30), matchIdx);
      if (
        before.includes("border-") ||
        before.includes("bg-") ||
        before.includes("placeholder:")
      ) {
        continue;
      }

      violations.push({
        line: idx + 1,
        text: lineText.trim(),
        match,
      });
    }
  });

  return violations;
}

// ─── Tests ─────────────────────────────────────────────────────────

describe("Contrast regression guard", () => {
  const componentFiles = getComponentFiles();

  it("found component files to scan", () => {
    expect(componentFiles.length).toBeGreaterThan(20);
  });

  it(`no text-foreground/ below ${MIN_TEXT_OPACITY} opacity in any component`, () => {
    const allViolations: { file: string; line: number; text: string; match: string }[] = [];

    for (const filePath of componentFiles) {
      const fileName = filePath.split("/").pop()!;
      const violations = findViolations(filePath);
      for (const v of violations) {
        allViolations.push({ file: fileName, ...v });
      }
    }

    if (allViolations.length > 0) {
      const report = allViolations
        .map((v) => `  ${v.file}:${v.line} → ${v.match}\n    ${v.text}`)
        .join("\n\n");

      expect.fail(
        `Found ${allViolations.length} low-contrast text class(es) below /${MIN_TEXT_OPACITY}:\n\n${report}\n\n` +
        `Fix: bump these to at least text-foreground/${MIN_TEXT_OPACITY}. ` +
        `On a near-black background, anything below /${MIN_TEXT_OPACITY} is nearly invisible.`
      );
    }
  });

  it("muted-foreground CSS variable has adequate lightness for WCAG AA", () => {
    const indexCss = readFileSync(join(__dirname, "..", "index.css"), "utf-8");
    const match = indexCss.match(/--muted-foreground:\s*0\s+0%\s+(\d+)%/);
    expect(match).not.toBeNull();
    const lightness = parseInt(match![1], 10);
    // On a 6% card background, text needs ≥55% lightness for 4.5:1 contrast
    expect(lightness).toBeGreaterThanOrEqual(55);
  });

  it("no hardcoded gold/terracotta/amber colour classes in components", () => {
    const bannedColours = [
      "text-gold",
      "bg-gold",
      "border-gold",
      "text-terracotta",
      "bg-terracotta",
      "border-terracotta",
      "text-amber-",
      // bg-amber is exempt: transit traffic dots use it intentionally
      // border-amber is exempt: warning borders are acceptable
    ];

    const violations: { file: string; line: number; text: string }[] = [];

    for (const filePath of componentFiles) {
      const fileName = filePath.split("/").pop()!;
      const lines = readFileSync(filePath, "utf-8").split("\n");
      lines.forEach((lineText, idx) => {
        for (const banned of bannedColours) {
          if (lineText.includes(banned)) {
            violations.push({ file: fileName, line: idx + 1, text: lineText.trim() });
          }
        }
      });
    }

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}:${v.line} → ${v.text}`)
        .join("\n");
      expect.fail(
        `Found ${violations.length} banned colour class(es) — the palette is monochrome:\n\n${report}`
      );
    }
  });
});
