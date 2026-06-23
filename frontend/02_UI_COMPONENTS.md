# 02 — Shared UI Components Specification

All components live in `components/ui/`. They are the building blocks used by every screen.

---

## Design Principles (apply everywhere)

- **Background default:** `#ffffff` (pure-canvas)  
- **Text default:** `#080331` (midnight-ink)  
- **Primary CTA:** `#4865ff` background, `#ffffff` text  
- **Border radius — buttons/badges:** `1600px`  
- **Border radius — cards:** `16px`  
- **Font — headings:** Lora, weight 400  
- **Font — body/labels/buttons:** Inter, weights 400 and 500  
- **Shadows:** warm-toned, use `shadow-sm` / `shadow-md` / `shadow-lg` CSS vars  
- **No dark mode required**

---

## Button (`components/ui/Button.tsx`)

Variants and their exact styles:

### `variant="primary"` (default)
```
background: #4865ff
color: #ffffff
border: 1px solid #ffffff
border-radius: 1600px
padding: 12px 32px
font: Inter 500 16px
hover: background slightly darker (#3a54e8), shadow-md
cursor: pointer
```

### `variant="ghost"`
```
background: transparent
color: #080331
border: 1px solid #080331
border-radius: 1600px
padding: 12px 24px
font: Inter 500 16px
hover: background rgba(8,3,49,0.05)
```

### `variant="danger"`
```
background: #ff6d39
color: #000000
border: 1px solid #000000
border-radius: 1600px
padding: 12px 24px
font: Inter 500 16px
```

### `variant="green"`
```
background: #328a3b
color: #ffffff
border: 1px solid #ffffff
border-radius: 1600px
padding: 12px 24px
font: Inter 500 16px
```

### Props:
```tsx
interface ButtonProps {
  variant?: 'primary' | 'ghost' | 'danger' | 'green'
  size?: 'sm' | 'md' | 'lg'  // sm: compact padding, md: default, lg: larger padding
  isLoading?: boolean          // show spinner, disable click
  disabled?: boolean
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  children: React.ReactNode
}
```

When `isLoading=true`: show a small spinning circle (SVG) inside the button, text stays visible but slightly dimmed.

---

## Input (`components/ui/Input.tsx`)

### Text/URL Input
```
background: #ffffff
border: 1px solid #cccccc
border-radius: 16px
padding: 12px 16px
font: Inter 400 16px
color: #080331
placeholder color: #cccccc
focus: border-color #4865ff, outline: none, shadow-sm
```

### Textarea
Same as above but:
```
min-height: 120px
resize: vertical
```

### Props:
```tsx
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'url' | 'textarea'
  label?: string               // shown above input
  placeholder?: string
  value: string
  onChange: (val: string) => void
  error?: string               // red text below input
  helper?: string              // gray text below input
  required?: boolean
  disabled?: boolean
  rows?: number                // for textarea
}
```

---

## Card (`components/ui/Card.tsx`)

### `variant="default"`
```
background: #ffffff
border-radius: 16px
padding: 32px
box-shadow: shadow-md
```

### `variant="sand"`
```
background: #f8f3eb
border-radius: 16px
padding: 32px
```

### `variant="orange"`
```
background: #ff6d39
border-radius: 16px
padding: 24px
color: #000000
```

### `variant="green"`
```
background: #328a3b
border-radius: 16px
padding: 24px
color: #ffffff
```

### `variant="blush"`
```
background: #f098d7
border-radius: 16px
padding: 24px
color: #080331
```

### Props:
```tsx
interface CardProps {
  variant?: 'default' | 'sand' | 'orange' | 'green' | 'blush'
  className?: string
  children: React.ReactNode
}
```

---

## StatusBadge (`components/ui/StatusBadge.tsx`)

Small pill badge indicating job status. All badges use `border-radius: 1600px`, `padding: 4px 12px`, `font: Inter 500 12px`.

| Status | Background | Text |
|--------|-----------|------|
| `pending` | `#dce4fb` | `#1b1463` |
| `processing` | `#4865ff` | `#ffffff` — add CSS pulse animation |
| `done` | `#328a3b` | `#ffffff` |
| `failed` | `#ff6d39` | `#000000` |

Labels (bilingual, show both):
- pending: "Chờ xử lý · Pending"
- processing: "Đang tạo · Processing"
- done: "Hoàn thành · Done"
- failed: "Thất bại · Failed"

For `processing`, add a pulsing dot before the label:
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

```tsx
interface StatusBadgeProps {
  status: 'pending' | 'processing' | 'done' | 'failed'
}
```

---

## Tag/Chip (`components/ui/Tag.tsx`)

Used in Voice Profile Preview for editable tags.

```
border-radius: 1600px
padding: 6px 12px
font: Inter 400 14px
display: inline-flex
align-items: center
gap: 6px
```

Color variants (controlled by `color` prop):
| Color | Background | Text |
|-------|-----------|------|
| `blue` (default) | `#dce4fb` | `#1b1463` |
| `green` | `rgba(50,138,59,0.1)` | `#0d5238` |
| `orange` | `rgba(255,109,57,0.15)` | `#f65300` |
| `pink` | `rgba(240,152,215,0.2)` | `#080331` |

When `editable=true`, show an × button (Lucide `X` icon, 12px) after the label. Clicking × removes the tag (calls `onRemove`).

```tsx
interface TagProps {
  label: string
  color?: 'blue' | 'green' | 'orange' | 'pink'
  editable?: boolean
  onRemove?: () => void
}
```

---

## Tabs (`components/ui/Tabs.tsx`)

Horizontal tabs with underline active indicator.

```
tab item: Inter 500 14px, color #333333
active tab: color #4865ff, border-bottom 2px solid #4865ff
tab bar: border-bottom 1px solid #cccccc
tab padding: 12px 16px
gap between tabs: 0 (they're side by side)
transition: border-bottom, color 200ms ease
```

```tsx
interface TabItem {
  id: string
  label: string
}

interface TabsProps {
  items: TabItem[]
  activeId: string
  onChange: (id: string) => void
}
```

---

## Modal/Dialog (`components/ui/Modal.tsx`)

Confirm dialog for destructive actions (e.g., Regenerate).

```
Overlay: rgba(0,0,0,0.4) covering full screen
Dialog box:
  background: #ffffff
  border-radius: 16px
  padding: 32px
  max-width: 480px
  centered in screen
  shadow-lg
```

Structure:
1. Title — Lora 24px, #080331
2. Body text — Inter 16px, #333333
3. Button row (right-aligned): Cancel (ghost) + Confirm (primary or danger)

```tsx
interface ModalProps {
  isOpen: boolean
  title: string
  body: string
  confirmLabel: string
  confirmVariant?: 'primary' | 'danger'
  onConfirm: () => void
  onClose: () => void
}
```

---

## Toast (`components/ui/Toast.tsx`)

Brief notification appearing at bottom-right of screen. Auto-dismisses after 3s.

```
position: fixed, bottom: 24px, right: 24px
border-radius: 16px
padding: 16px 24px
font: Inter 500 14px
shadow-lg
z-index: 9999
animation: slide up from bottom + fade in on appear; fade out on dismiss
max-width: 360px
```

Variants:
| Type | Background | Text | Icon |
|------|-----------|------|------|
| `success` | `#328a3b` | `#ffffff` | Lucide `CheckCircle2` |
| `error` | `#ff6d39` | `#000000` | Lucide `AlertCircle` |
| `info` | `#4865ff` | `#ffffff` | Lucide `Info` |

```tsx
interface ToastProps {
  type: 'success' | 'error' | 'info'
  message: string
  isVisible: boolean
  onClose: () => void
}
```

---

## Skeleton (`components/ui/Skeleton.tsx`)

Placeholder loading state with a shimmer animation.

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

```
background: linear-gradient(90deg, #f8f3eb 25%, #eae4d9 50%, #f8f3eb 75%)
background-size: 200% 100%
animation: shimmer 1.5s infinite
border-radius: varies (match the real element's radius)
```

Variants:
- `text` — height 16px, border-radius 4px, width controlled by className
- `card` — height 120px, border-radius 16px, full width
- `avatar` — 40x40px, border-radius 100%

```tsx
interface SkeletonProps {
  variant?: 'text' | 'card' | 'avatar'
  className?: string
}
```
