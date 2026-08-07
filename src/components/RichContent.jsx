import React from 'react';
import { Sparkles } from 'lucide-react';

// Lightweight authoring format for admin-editable text fields (description,
// product details, why it's worth it, product care) — there's no rich-text
// editor in this app, so admins type plain text with 3 line prefixes and get
// the same bullet/heading look on both the storefront and the admin preview:
//   "## text"  -> bold heading
//   "> text"   -> plain paragraph (no icon)
//   anything else -> bullet row with the gold Sparkles icon
// "*text*" anywhere on a line is rendered italic.
function renderInline(text) {
  const parts = text.split(/\*(.+?)\*/g);
  return parts.map((part, i) => (i % 2 === 1 ? <em key={i}>{part}</em> : part));
}

export function parseRichContent(text) {
  if (!text) return [];
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      if (line.startsWith('## ')) return { type: 'heading', text: line.slice(3).trim() };
      if (line.startsWith('> ')) return { type: 'paragraph', text: line.slice(2).trim() };
      return { type: 'bullet', text: line };
    });
}

export default function RichContent({ text }) {
  const lines = parseRichContent(text);
  if (lines.length === 0) return null;

  // Group consecutive bullet lines into one wrapping div (so they share the
  // same gap-10px column), while headings/paragraphs stay standalone nodes.
  let currentGroup = null;
  const nodes = [];
  lines.forEach((line) => {
    if (line.type === 'bullet') {
      if (!currentGroup) {
        currentGroup = [];
        nodes.push(currentGroup);
      }
      currentGroup.push(line);
    } else {
      currentGroup = null;
      nodes.push(line);
    }
  });

  return (
    <>
      {nodes.map((node, i) => {
        if (Array.isArray(node)) {
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '0 0 12px 0' }}>
              {node.map((line, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <Sparkles size={15} strokeWidth={1.5} color="#D4AF37" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{renderInline(line.text)}</span>
                </div>
              ))}
            </div>
          );
        }
        if (node.type === 'heading') {
          return (
            <p key={i} style={{ margin: '16px 0 6px 0', fontWeight: 600, fontSize: '16px', color: '#F5F2EB' }}>
              {renderInline(node.text)}
            </p>
          );
        }
        return (
          <p key={i} style={{ margin: '0 0 12px 0' }}>
            {renderInline(node.text)}
          </p>
        );
      })}
    </>
  );
}
