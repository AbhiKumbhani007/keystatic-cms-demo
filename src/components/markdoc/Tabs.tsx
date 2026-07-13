'use client';

import { Children, isValidElement, useState, type ReactNode } from 'react';

export function Tab({ children }: { label: string; children?: ReactNode }) {
  return <div>{children}</div>;
}

export function Tabs({ children }: { labels?: string[]; children?: ReactNode }) {
  const tabs = Children.toArray(children).filter(isValidElement) as Array<
    React.ReactElement<{ label: string }>
  >;
  const [active, setActive] = useState(0);

  return (
    <div style={{ margin: '1rem 0' }}>
      <div
        style={{
          display: 'flex',
          gap: 4,
          borderBottom: '1px solid var(--ds-border)',
        }}
      >
        {tabs.map((tab, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            style={{
              padding: '0.5rem 0.9rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: active === i ? 'var(--ds-accent)' : 'var(--ds-muted)',
              fontWeight: active === i ? 600 : 400,
              borderBottom:
                active === i
                  ? '2px solid var(--ds-accent)'
                  : '2px solid transparent',
            }}
          >
            {tab.props.label ?? `Tab ${i + 1}`}
          </button>
        ))}
      </div>
      <div style={{ paddingTop: '0.75rem' }}>{tabs[active]}</div>
    </div>
  );
}
