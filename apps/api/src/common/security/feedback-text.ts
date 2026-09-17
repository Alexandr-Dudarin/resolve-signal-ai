import { decodeHTML } from "entities";
import sanitizeHtml from "sanitize-html";

const blockTags = new Set([
  "p", "div", "br", "li", "ul", "ol", "blockquote", "pre",
  "h1", "h2", "h3", "h4", "h5", "h6", "table", "tr", "td", "hr",
]);

function normalizeWhitespace(text: string): string {
  return Array.from(text.replace(/\r\n?/g, "\n"))
    .filter((character) => {
      const code = character.codePointAt(0)!;
      return code === 9 || code === 10 || (code >= 32 && (code < 127 || code > 159));
    })
    .join("");
}

/** Возвращает только текст. Результат нельзя использовать как HTML. */
export function normalizeFeedbackText(input: string): string {
  let needsLineBreak = false;
  const sanitized = sanitizeHtml(normalizeWhitespace(input), {
    allowedTags: [],
    allowedAttributes: {},
    nonTextTags: ["script", "style", "noscript"],
    onOpenTag: (tag) => {
      if (blockTags.has(tag)) needsLineBreak = true;
    },
    onCloseTag: (tag) => {
      if (blockTags.has(tag)) needsLineBreak = true;
    },
    textFilter: (text) => {
      const prefix = needsLineBreak ? "\n" : "";
      needsLineBreak = false;
      return prefix + text;
    },
  });

  // Sanitize-html экранирует текст для HTML. Здесь нужен текст, а не HTML-разметка.
  return normalizeWhitespace(decodeHTML(sanitized)).trim();
}

export function normalizeCreateFeedbackInput(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  if (!("text" in input) || typeof input.text !== "string") return input;
  return { ...input, text: normalizeFeedbackText(input.text) };
}
