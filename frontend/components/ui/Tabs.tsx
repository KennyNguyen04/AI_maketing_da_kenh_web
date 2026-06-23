import { clsx } from 'clsx'

export interface TabItem {
  id: string
  label: string
  badge?: string
}

export interface TabsProps {
  items: TabItem[]
  activeId: string
  onChange: (id: string) => void
}

export function Tabs({ items, activeId, onChange }: TabsProps) {
  return (
    <div className="flex flex-wrap gap-1 rounded-card border border-app-line bg-app-bg p-1">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={clsx(
            'flex items-center gap-2 rounded-nav px-3 py-2 text-sm font-medium transition',
            activeId === item.id ? 'bg-pure-canvas text-sky-blue shadow-sm' : 'text-app-muted hover:bg-pure-canvas/70 hover:text-midnight-ink',
          )}
        >
          {item.label}
          {item.badge ? <span className="rounded-badge bg-hint-of-blue px-2 py-0.5 text-xs text-regal-violet">{item.badge}</span> : null}
        </button>
      ))}
    </div>
  )
}
