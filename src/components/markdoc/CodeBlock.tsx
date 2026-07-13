import type { ReactNode } from 'react';

export function CodeBlock({
  content,
  language,
  children,
}: {
  content?: string;
  language?: string;
  children?: ReactNode;
}) {
  return (
    <pre
      data-language={language}
      style={{
        background: 'var(--ds-code-bg)',
        color: 'var(--ds-code-fg)',
        border: '1px solid var(--ds-border)',
        borderRadius: 8,
        padding: '1rem',
        overflowX: 'auto',
        fontSize: '0.85rem',
        lineHeight: 1.6,
        margin: '1rem 0',
      }}
    >
      <code>{content ?? children}</code>
    </pre>
  );
}
