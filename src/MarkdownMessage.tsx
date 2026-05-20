import * as React from 'react';
import { marked } from 'marked';
import * as DOMPurify from 'dompurify';
import hljs from 'highlight.js';

marked.setOptions({
  highlight: function (code: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch { }
    }
    try {
      return hljs.highlightAuto(code).value;
    } catch {
      return code;
    }
  },
  breaks: true,
  gfm: true
});

function renderMarkdown(content: string): string {
  const raw = marked.parse(content) as string;
  const clean = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'a', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'class', 'style']
  });
  return clean;
}

export function MarkdownMessage({ content }: { content: string }) {
  const html = React.useMemo(() => renderMarkdown(content), [content]);
  return React.createElement('div', {
    className: 'markdown-body',
    dangerouslySetInnerHTML: { __html: html }
  });
}
