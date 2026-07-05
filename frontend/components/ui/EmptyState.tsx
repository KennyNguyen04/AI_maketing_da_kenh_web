'use client'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { LucideIcon } from 'lucide-react'

export interface EmptyStateAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'white' | 'ghost'
  icon?: LucideIcon
}

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  /** When provided, render a structured 3-step block under the description */
  steps?: Array<{
    icon: LucideIcon
    title: string
    description: string
  }>
  className?: string
  /** Use `bento` to render a wider hero layout (e.g. on dashboard empty state) */
  variant?: 'default' | 'bento'
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  steps,
  className,
  variant = 'default',
}: EmptyStateProps) {
  const isBento = variant === 'bento'

  return (
    <Card className={`${isBento ? 'p-8 text-left md:p-10' : 'text-center'} ${className ?? ''}`}>
      <div
        className={
          isBento
            ? 'flex flex-col gap-6 md:flex-row md:items-center md:justify-between'
            : ''
        }
      >
        <div className={isBento ? 'max-w-2xl' : ''}>
          <div
            className={
              isBento
                ? 'mb-3 inline-flex h-12 w-12 items-center justify-center rounded-card bg-hint-of-blue text-sky-blue'
                : 'mx-auto flex h-12 w-12 items-center justify-center rounded-card bg-hint-of-blue text-sky-blue'
            }
          >
            <Icon className="h-6 w-6" />
          </div>
          <h2
            className={
              isBento
                ? 'text-xl text-midnight-ink md:text-2xl'
                : 'mt-4 text-lg text-midnight-ink'
            }
          >
            {title}
          </h2>
          {description ? (
            <p className={isBento ? 'mt-2 text-sm text-app-muted' : 'mt-2 text-sm text-app-muted'}>
              {description}
            </p>
          ) : null}
        </div>

        {(action || secondaryAction) && (
          <div
            className={
              isBento
                ? 'flex flex-wrap gap-2'
                : 'mt-6 flex flex-wrap items-center justify-center gap-2'
            }
          >
            {action && (
              <Button onClick={action.onClick} variant={action.variant ?? 'primary'}>
                {action.icon ? <action.icon className="h-4 w-4" /> : null}
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                variant={secondaryAction.variant ?? 'white'}
              >
                {secondaryAction.icon ? <secondaryAction.icon className="h-4 w-4" /> : null}
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>

      {steps && steps.length > 0 ? (
        <div
          className={
            isBento
              ? 'mt-8 grid gap-3 sm:grid-cols-3'
              : 'mx-auto mt-6 grid max-w-3xl gap-3 text-left md:grid-cols-3'
          }
        >
          {steps.map((step) => {
            const StepIcon = step.icon
            return (
              <div
                key={step.title}
                className="rounded-card border border-app-line bg-app-bg p-4"
              >
                <StepIcon className="h-5 w-5 text-sky-blue" />
                <h3 className="mt-3 text-sm font-semibold text-midnight-ink">
                  {step.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-app-muted">{step.description}</p>
              </div>
            )
          })}
        </div>
      ) : null}
    </Card>
  )
}
