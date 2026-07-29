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
    { value: pad(time.minutes), label: 'Mins' },
    { value: pad(time.seconds), label: 'Secs' },
  ]

  return (
    <div className="grid grid-cols-4 gap-1.5" aria-live="polite">
      {units.map((u) => (
        <div key={u.label} className="rounded-md border border-gold/35 bg-white/[0.04] px-1.5 py-0.5 text-center">
          <span className="font-display block text-base font-semibold leading-tight tabular-nums text-gold">{u.value}</span>
          <span className="block text-[7px] font-semibold uppercase leading-tight tracking-wide text-white/60">
            {u.label}
          </span>
        </div>
      ))}
    </div>
  )
}
