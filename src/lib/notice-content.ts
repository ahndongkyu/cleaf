import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = ["p", "h2", "h3", "strong", "b", "ul", "ol", "li", "blockquote", "br"];

export function sanitizeNoticeContent(value: string) {
  return sanitizeHtml(value, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {},
    disallowedTagsMode: "discard",
    transformTags: { div: "p" },
  }).trim();
}

export function noticeContentHtml(value: string | null) {
  if (!value) return "";
  const hasRichMarkup = /<\/?(?:p|h2|h3|strong|b|ul|ol|li|blockquote|br)\b/i.test(value);
  if (hasRichMarkup) return sanitizeNoticeContent(value);
  const escaped = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
  return escaped.replace(/\r?\n/g, "<br>");
}

export function noticePlainText(value: string | null) {
  if (!value) return "";
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
