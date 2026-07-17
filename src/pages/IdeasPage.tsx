import { useCallback, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { IdeasWhiteboard } from '@/components/IdeasWhiteboard'
import { PageHeader } from '@/components/PageHeader'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import type { IdeaBoard } from '@/lib/types'

type StoredBoardState = {
  document?: unknown
}

function extractDocument(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as StoredBoardState
  return s.document ?? null
}

export function IdeasPage() {
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: board, isLoading, error } = useQuery({
    queryKey: ['idea-board'],
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from('idea_boards')
        .select('*')
        .eq('wedding_id', WEDDING_ID)
        .maybeSingle()
      if (qErr) throw qErr
      return data as IdeaBoard | null
    },
  })

  const persist = useCallback(
    async (document: unknown) => {
      setSaving(true)
      const payload = {
        wedding_id: WEDDING_ID,
        state: { document } satisfies StoredBoardState,
        updated_at: new Date().toISOString(),
      }
      const { error: upErr } = await supabase
        .from('idea_boards')
        .upsert(payload, { onConflict: 'wedding_id' })
      setSaving(false)
      if (upErr) {
        toast.error(upErr.message)
        return
      }
      qc.setQueryData(['idea-board'], payload)
    },
    [qc],
  )

  const onDocumentChange = useCallback(
    (document: unknown) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        void persist(document)
      }, 100)
    },
    [persist],
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ideas"
        action={
          <span className="text-sm text-white/65">
            {isLoading ? 'Loading…' : saving ? 'Saving…' : 'Saved'}
          </span>
        }
      />

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-white">
          {(error as Error).message}. Run migration{' '}
          <code className="text-gold">007_ideas_whiteboard.sql</code>.
        </p>
      )}

      {!isLoading && !error && (
        <IdeasWhiteboard
          key={board?.wedding_id ?? 'new-board'}
          initialDocument={extractDocument(board?.state) as never}
          onDocumentChange={onDocumentChange}
        />
      )}

      <p className="text-sm text-white/65">
        Use the toolbar for notes, shapes, arrows, draw, and erase. Changes save automatically.
      </p>
    </div>
  )
}
