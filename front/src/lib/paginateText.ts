const MAX_CHARS_PER_PAGE = 144;

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
      let breakAt = remaining.lastIndexOf(" ", MAX_CHARS_PER_PAGE);
      if (breakAt <= 0) breakAt = MAX_CHARS_PER_PAGE;
      pages.push(remaining.slice(0, breakAt));
      remaining = remaining.slice(breakAt).trimStart();
    }
    if (remaining.length > 0) current = remaining;
  }

  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [text];
}
