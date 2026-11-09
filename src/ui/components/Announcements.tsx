import { X } from 'lucide-react'
import { useState } from 'react'
import { features } from '@/runtime/features/index.ts'
import { useText } from '@/runtime/localization/index.tsx'
import { UI } from '@/runtime/localization/ui-keys.ts'
import { world } from '@/runtime/world-registry/index.ts'
import { Button } from '@/components/ui/button.tsx'

const STORAGE_KEY = 'crisworld.dismissed-announcements'

function readDismissed(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

/** Whether an announcement is on today. Dates are checked in the visitor's browser. */
export function isLive(announcement: { enabled: boolean; startsAt: string | null; endsAt: string | null }, today = new Date()) {
  if (!announcement.enabled) return false
  const day = today.toISOString().slice(0, 10)
  if (announcement.startsAt && day < announcement.startsAt) return false
  if (announcement.endsAt && day > announcement.endsAt) return false
  return true
}

/** Live announcements from messages/announcements.json for one placement, highest priority first. */
export function Announcements({ placement = 'top' }: { placement?: 'top' | 'bottom' }) {
  const { t } = useText()
  const [dismissed, setDismissed] = useState(readDismissed)
  if (!features.announcements) return null
  const live = world.announcements.filter(
    (item) => item.placement === placement && isLive(item) && !dismissed.includes(item.id),
  )
  if (!live.length) return null
  const dismiss = (id: string) => {
    const next = [...dismissed, id]
    setDismissed(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Storage may be unavailable (private windows); the dismissal then lasts for this visit.
    }
  }
  return (
    <div className="flex flex-col items-center gap-1">
      {live.map((item) => (
        <div
          key={item.id}
          role="status"
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-background/85 py-1 pr-1 pl-3 text-xs ring-1 ring-border backdrop-blur"
        >
          <span>{t(item.messageKey)}</span>
          {item.dismissible && (
            <Button type="button" variant="ghost" size="icon" className="size-6 rounded-full" aria-label={t(UI.dismiss)} onClick={() => dismiss(item.id)}>
              <X />
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
