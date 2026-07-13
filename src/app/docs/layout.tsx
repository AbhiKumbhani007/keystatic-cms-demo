import Link from 'next/link';
import type { ReactNode } from 'react';
import { buildDocTree } from '@/lib/docs';
import { Sidebar } from '@/components/Sidebar';

export default async function DocsLayout({ children }: { children: ReactNode }) {
  const tree = await buildDocTree();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 280px) 1fr',
        minHeight: '100dvh',
        color: 'var(--ds-fg)',
        background: 'var(--ds-bg)',
      }}
    >
      <aside
        style={{
          borderRight: '1px solid var(--ds-border)',
          background: 'var(--ds-surface)',
          padding: '1.25rem 1rem',
          position: 'sticky',
          top: 0,
          alignSelf: 'start',
          height: '100dvh',
          overflowY: 'auto',
        }}
      >
        <Link
          href="/docs"
          style={{
            display: 'block',
            fontWeight: 700,
            marginBottom: '1rem',
            textDecoration: 'none',
            color: 'var(--ds-fg)',
          }}
        >
          Docs Platform
        </Link>
        <Sidebar tree={tree} />
      </aside>

      <main style={{ padding: '2rem clamp(1rem, 4vw, 3rem)', maxWidth: 900 }}>
        {children}
      </main>
    </div>
  );
}
