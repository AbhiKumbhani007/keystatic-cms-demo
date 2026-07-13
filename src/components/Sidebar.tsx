'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { DocTreeNode } from '@/lib/docs';

function NodeItem({ node, depth }: { node: DocTreeNode; depth: number }) {
  const pathname = usePathname();
  const href = node.slug ? `/docs/${node.slug}` : undefined;
  const isActive = href === pathname;
  const hasChildren = node.children.length > 0;

  // Expand branches that contain the active page by default.
  const containsActive =
    !!node.slug && pathname.startsWith(`/docs/${node.slug}`);
  const [open, setOpen] = useState(depth === 0 || containsActive);

  return (
    <li style={{ listStyle: 'none' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          paddingLeft: depth * 12,
        }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={open ? 'Collapse' : 'Expand'}
            onClick={() => setOpen((v) => !v)}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              width: 16,
              color: 'var(--ds-muted)',
            }}
          >
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span style={{ width: 16 }} />
        )}

        {href ? (
          <Link
            href={href}
            style={{
              display: 'block',
              padding: '0.25rem 0.4rem',
              borderRadius: 6,
              textDecoration: 'none',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--ds-accent)' : 'var(--ds-fg)',
              background: isActive ? 'var(--ds-active-bg)' : 'transparent',
              flex: 1,
            }}
          >
            {node.label}
          </Link>
        ) : (
          <span
            style={{
              padding: '0.25rem 0.4rem',
              fontWeight: 600,
              color: 'var(--ds-muted)',
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            {node.label}
          </span>
        )}
      </div>

      {hasChildren && open && (
        <ul style={{ margin: 0, padding: 0 }}>
          {node.children.map((child) => (
            <NodeItem key={child.segment} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function Sidebar({ tree }: { tree: DocTreeNode[] }) {
  return (
    <nav aria-label="Docs navigation" style={{ fontSize: '0.9rem' }}>
      <ul style={{ margin: 0, padding: 0 }}>
        {tree.map((node) => (
          <NodeItem key={node.segment} node={node} depth={0} />
        ))}
      </ul>
    </nav>
  );
}
