import type { ReactNode } from 'react';

const STYLES: Record<string, { border: string; bg: string; icon: string }> = {
  note: { border: '#3b82f6', bg: 'rgba(59,130,246,0.08)', icon: 'ℹ️' },
  tip: { border: '#22c55e', bg: 'rgba(34,197,94,0.08)', icon: '💡' },
  warning: { border: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: '⚠️' },
  danger: { border: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: '🚫' },
};

export function Callout({
  type = 'note',
  title,
  children,
}: {
  type?: 'note' | 'tip' | 'warning' | 'danger';
  title?: string;
  children?: ReactNode;
}) {
  const style = STYLES[type] ?? STYLES.note;
  return (
    <div
      style={{
        borderLeft: `4px solid ${style.border}`,
        background: style.bg,
        borderRadius: 8,
        padding: '0.9rem 1rem',
        margin: '1rem 0',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: title ? 4 : 0 }}>
        <span style={{ marginRight: 6 }}>{style.icon}</span>
        {title ?? type[0].toUpperCase() + type.slice(1)}
      </div>
      <div>{children}</div>
    </div>
  );
}
