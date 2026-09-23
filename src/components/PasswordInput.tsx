import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * A password field with a reveal button.
 *
 * Typing a password you cannot read is how passwords get mistyped, and on a
 * phone keyboard it is most of the reason people give up and pick a short one.
 *
 * The button is placed with `end-`, not `right-`, so it stays on the trailing
 * edge in Arabic. The field itself is `dir="ltr"` because a password is a
 * literal sequence of characters and must not be reordered for display.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, 'type'>) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const fallbackId = useId()
  const id = props.id ?? fallbackId
  const Icon = visible ? EyeOff : Eye

  return (
    <div className="relative">
      <Input
        {...props}
        id={id}
        type={visible ? 'text' : 'password'}
        dir="ltr"
        className={cn('pe-9', className)}
      />
      <button
        type="button"
        // Never a submit button: inside a form, a bare <button> submits it.
        onClick={() => setVisible((v) => !v)}
        // Revealing is a view preference, not content — a screen reader user
        // has the value read out either way, and the announcement would leak
        // the password into the accessibility tree.
        tabIndex={-1}
        aria-controls={id}
        aria-label={visible ? t('common.hidePassword') : t('common.showPassword')}
        title={visible ? t('common.hidePassword') : t('common.showPassword')}
        className="absolute inset-y-0 end-0 grid w-9 place-items-center text-muted-foreground transition-colors hover:text-foreground"
      >
        <Icon className="size-4" />
      </button>
    </div>
  )
}
