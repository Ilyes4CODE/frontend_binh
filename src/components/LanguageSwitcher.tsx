import { useTranslation } from 'react-i18next'
import { Check, Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const LANGUAGES = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = LANGUAGES.find((l) => l.code === i18n.resolvedLanguage)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Icon only. The current language is still announced to screen
            readers and shown on hover, and a tick marks it in the menu. */}
        <Button
          variant="ghost"
          size="icon"
          title={current?.label ?? 'Language'}
          aria-label={current?.label ?? 'Language'}
        >
          <Languages className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={() => i18n.changeLanguage(lang.code)}
            className="gap-2"
          >
            <Check
              className={`size-4 ${lang.code === i18n.resolvedLanguage ? 'opacity-100' : 'opacity-0'}`}
            />
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
