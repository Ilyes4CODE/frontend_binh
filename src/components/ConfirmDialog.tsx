import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleCheckBig, CircleX, Trash2, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

export type ConfirmVariant = 'approve' | 'reject' | 'delete' | 'warning'

export interface ConfirmOptions {
  title?: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
}

const LOOK: Record<ConfirmVariant, {
  icon: typeof Trash2
  tint: string
  button: string
  titleKey: string
  confirmKey: string
}> = {
  approve: {
    icon: CircleCheckBig,
    tint: 'bg-emerald-50 text-emerald-600',
    button: 'bg-emerald-600 text-white hover:bg-emerald-700',
    titleKey: 'confirm.approveTitle',
    confirmKey: 'confirm.approve',
  },
  reject: {
    icon: CircleX,
    tint: 'bg-red-50 text-destructive',
    button: 'bg-destructive text-white hover:bg-destructive/90',
    titleKey: 'confirm.rejectTitle',
    confirmKey: 'confirm.reject',
  },
  delete: {
    icon: Trash2,
    tint: 'bg-red-50 text-destructive',
    button: 'bg-destructive text-white hover:bg-destructive/90',
    titleKey: 'confirm.deleteTitle',
    confirmKey: 'confirm.delete',
  },
  warning: {
    icon: TriangleAlert,
    tint: 'bg-amber-50 text-amber-600',
    button: 'bg-amber-500 text-white hover:bg-amber-600',
    titleKey: 'confirm.warningTitle',
    confirmKey: 'confirm.continue',
  },
}

/**
 * The picture at the top of a confirmation: the generated illustration for
 * this kind of action, or — until it exists, or if it fails to load — the
 * action's icon in a tinted circle, so the dialog never shows a broken image.
 */
export function ConfirmIllustration({ variant, className }: { variant: ConfirmVariant; className?: string }) {
  const [broken, setBroken] = useState(false)
  const look = LOOK[variant]
  const Icon = look.icon
  if (broken) {
    return (
      <div className={cn('mx-auto grid size-24 place-items-center rounded-full', look.tint, className)}>
        <Icon className="size-11" strokeWidth={1.75} />
      </div>
    )
  }
  return (
    <img
      src={`/illustrations/dialog-${variant}.png`}
      alt=""
      onError={() => setBroken(true)}
      className={cn('mx-auto size-36 object-contain', className)}
    />
  )
}

type Ask = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<Ask | null>(null)

/**
 * One confirmation dialog for the whole dashboard, in place of the browser's
 * confirm(): that box cannot be styled, is in the browser's language rather
 * than the page's, and on a phone looks like a system error.
 *
 *   const confirm = useConfirm()
 *   if (await confirm({ variant: 'delete', description: '…' })) remove()
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((answer: boolean) => void) | null>(null)

  const ask = useCallback<Ask>((next) => {
    // A second question while one is open answers the first with "no".
    resolver.current?.(false)
    setOptions(next)
    return new Promise<boolean>((resolve) => { resolver.current = resolve })
  }, [])

  const answer = (value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setOptions(null)
  }

  const variant = options?.variant ?? 'warning'
  const look = LOOK[variant]

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <Dialog open={options !== null} onOpenChange={(open) => { if (!open) answer(false) }}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <ConfirmIllustration key={variant} variant={variant} />
          <DialogHeader className="items-center text-center sm:text-center">
            <DialogTitle className="text-lg">{options?.title ?? t(look.titleKey)}</DialogTitle>
            {options?.description && (
              <DialogDescription className="text-center leading-relaxed">
                {options.description}
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => answer(false)}>
              {options?.cancelLabel ?? t('common.cancel')}
            </Button>
            <Button className={look.button} onClick={() => answer(true)} autoFocus>
              {options?.confirmLabel ?? t(look.confirmKey)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): Ask {
  const ask = useContext(ConfirmContext)
  if (!ask) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return ask
}
