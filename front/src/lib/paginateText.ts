const MAX_CHARS_PER_PAGE = 144;

const SENTENCE_CHARS = ".!?";
const CLAUSE_CHARS = ";,:";

function findBreakPoint(text: string, maxChars: number): number {
  // 1. Sentence end (.!?) — best, preserves complete thought
  for (let i = Math.min(text.length, maxChars) - 1; i > 0; i--) {
    if (SENTENCE_CHARS.includes(text[i])) return i + 1;
  }

  // 2. Clause break (;,:) — natural pause
  for (let i = Math.min(text.length, maxChars) - 1; i > 0; i--) {
    if (CLAUSE_CHARS.includes(text[i])) return i + 1;
  }

  // 3. Word boundary (space) — fallback
  const space = text.lastIndexOf(" ", maxChars);
  if (space > 0) return space;

  // 4. Hard break at maxChars — last resort
  return maxChars;
}

export function paginateText(text: string): string[] {
  if (!text || text.length <= MAX_CHARS_PER_PAGE) return [text];

  const paragraphs = text.split("\n");
  const pages: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (para.length === 0) {
      if (current.length > 0) current += "\n";
      continue;
    }

    if (
      current.length + para.length + (current.length > 0 ? 1 : 0) <=
      MAX_CHARS_PER_PAGE
    ) {
      current += (current.length > 0 ? "\n" : "") + para;
      continue;
    }

    if (current.length > 0) {
      pages.push(current);
      current = "";
    }

    if (para.length <= MAX_CHARS_PER_PAGE) {
      current = para;
      continue;
    }

    let remaining = para;
    while (remaining.length > MAX_CHARS_PER_PAGE) {
      const breakAt = findBreakPoint(remaining, MAX_CHARS_PER_PAGE);
      pages.push(remaining.slice(0, breakAt));
      remaining = remaining.slice(breakAt).trimStart();
    }
    if (remaining.length > 0) current = remaining;
  }

  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [text];
}
