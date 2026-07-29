import { useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export type LightboxImage = {
  src: string
  alt?: string
}

type ImageLightboxProps = {
  images: LightboxImage[]
  open: boolean
  index: number
  onOpenChange: (open: boolean) => void
  onIndexChange: (index: number) => void
}

export function ImageLightbox({
  images,
  open,
  index,
  onOpenChange,
  onIndexChange,
}: ImageLightboxProps) {
  const current = images[index]
  const hasMultiple = images.length > 1
  const canPrev = index > 0
  const canNext = index < images.length - 1

  useEffect(() => {
    if (!open || !hasMultiple) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && canPrev) onIndexChange(index - 1)
      if (e.key === 'ArrowRight' && canNext) onIndexChange(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, index, hasMultiple, canPrev, canNext, onIndexChange])

  if (!current) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/90"
        className="max-h-[95vh] w-[95vw] max-w-[95vw] gap-0 border-0 bg-transparent p-0 shadow-none sm:rounded-lg"
      >
        <DialogTitle className="sr-only">
          Receipt image {hasMultiple ? `${index + 1} of ${images.length}` : ''}
        </DialogTitle>
        <div className="relative flex min-h-[50vh] items-center justify-center px-10 py-8">
          <img
            src={current.src}
            alt={current.alt ?? 'Image preview'}
            className="max-h-[85vh] w-auto max-w-full object-contain"
          />

          {hasMultiple && (
            <>
              <button
                type="button"
                disabled={!canPrev}
                onClick={() => onIndexChange(index - 1)}
                className={cn(
                  'absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white/90 transition-colors hover:bg-black/75',
                  !canPrev && 'pointer-events-none opacity-30',
                )}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                disabled={!canNext}
                onClick={() => onIndexChange(index + 1)}
                className={cn(
                  'absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white/90 transition-colors hover:bg-black/75',
                  !canNext && 'pointer-events-none opacity-30',
                )}
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-0.5 text-xs font-medium text-white/85">
                {index + 1} / {images.length}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
