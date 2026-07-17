import { useEffect, useState } from 'react'

const WEDDING_DATE = new Date('2026-11-20T00:00:00+05:30')

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function Countdown() {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const tick = () => {
      const diff = WEDDING_DATE.getTime() - Date.now()
      if (diff <= 0) {
        setTime({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }
      setTime({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const units = [
    { value: time.days, label: 'Days' },
    { value: pad(time.hours), label: 'Hours' },
    { value: pad(time.minutes), label: 'Min' },
    { value: pad(time.seconds), label: 'Sec' },
  ]

  return (
    <div className="grid grid-cols-4 gap-2 max-w-xs" aria-live="polite">
      {units.map((u) => (
        <div key={u.label} className="rounded-md border bg-muted p-3 text-center">
          <span className="block text-lg font-semibold tabular-nums">{u.value}</span>
          <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {u.label}
          </span>
        </div>
      ))}
    </div>
  )
}
