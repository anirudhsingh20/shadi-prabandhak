import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
  DecisionDrawerShell,
  DecisionForm,
  formatDecisionDate,
} from '@/components/decisions/shared'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import type { DecisionInput } from '@/lib/validations'
import type { Decision } from '@/lib/types'

export function DecisionsPage() {
  const qc = useQueryClient()
  const location = useLocation()
  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<Decision | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  useEffect(() => {
    if ((location.state as { add?: boolean } | null)?.add) {
      setCreateOpen(true)
    }
  }, [location.state])

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['decisions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decisions')
        .select('*')
        .eq('wedding_id', WEDDING_ID)
        .order('decision_date', { ascending: false })
      if (error) throw error
      return data as Decision[]
    },
  })

  const saveDecision = async (values: DecisionInput, id?: string) => {
    const payload = {
      wedding_id: WEDDING_ID,
      decision_date: values.decision_date,
      text: values.text.trim(),
    }
    const { error } = id
      ? await supabase.from('decisions').update(payload).eq('id', id)
      : await supabase.from('decisions').insert(payload)
    if (error) throw new Error(error.message)
    toast.success(id ? 'Decision updated' : 'Decision added')
    qc.invalidateQueries({ queryKey: ['decisions'] })
    setCreateOpen(false)
    setEditItem(null)
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('decisions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Deleted')
      qc.invalidateQueries({ queryKey: ['decisions'] })
      setDeleteId(null)
      setEditItem(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      <PageHeader
        title="Decisions"
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        }
      />

      {isLoading ? (
        <p className="py-6 text-center text-sm text-white/60">Loading…</p>
      ) : decisions.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/60">No decisions yet.</p>
      ) : (
        <div className="relative pl-3.5">
          <div className="absolute bottom-1 left-[4px] top-1 w-px bg-gold/20" aria-hidden />
          <ul>
            {decisions.map((d, index) => (
              <li key={d.id} className="relative">
                <span
                  className="absolute -left-3.5 top-2 h-2 w-2 rounded-full bg-gold/70 ring-4 ring-gold/15"
                  aria-hidden
                />
                <div
                  className={cn(
                    'flex items-start gap-1 rounded-md py-1.5 pl-1 pr-0.5',
                    index < decisions.length - 1 && 'border-b border-white/[0.04]',
                  )}
                >
                  <span className="w-9 shrink-0 pt-px text-[11px] font-medium tabular-nums leading-snug text-white/40">
                    {formatDecisionDate(d.decision_date)}
                  </span>
                  <p className="min-w-0 flex-1 text-[13px] leading-snug text-white/85">{d.text}</p>
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Edit decision"
                      onClick={() => setEditItem(d)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Delete decision"
                      onClick={() => setDeleteId(d.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <DecisionDrawerShell
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setFormSubmitting(false)
        }}
        title="Add decision"
        footer={
          <Button
            type="submit"
            form="decision-form-create"
            className="h-9 w-full text-sm"
            disabled={formSubmitting}
          >
            {formSubmitting ? 'Saving…' : 'Add decision'}
          </Button>
        }
      >
        <DecisionForm
          key={createOpen ? 'create-open' : 'create-closed'}
          formId="decision-form-create"
          onSubmittingChange={setFormSubmitting}
          onSubmit={async (values) => {
            try {
              await saveDecision(values)
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Failed to save')
              throw e
            }
          }}
        />
      </DecisionDrawerShell>

      <DecisionDrawerShell
        open={!!editItem}
        onOpenChange={(open) => {
          if (!open) {
            setEditItem(null)
            setFormSubmitting(false)
          }
        }}
        title="Edit decision"
        footer={
          editItem ? (
            <div className="flex w-full gap-2">
              <Button
                type="submit"
                form="decision-form-edit"
                className="h-9 flex-1 text-sm"
                disabled={formSubmitting}
              >
                {formSubmitting ? 'Saving…' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 flex-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteId(editItem.id)}
              >
                Delete
              </Button>
            </div>
          ) : null
        }
      >
        {editItem && (
          <DecisionForm
            key={editItem.id}
            formId="decision-form-edit"
            defaultValues={{
              decision_date: editItem.decision_date,
              text: editItem.text,
            }}
            onSubmittingChange={setFormSubmitting}
            onSubmit={async (values) => {
              try {
                await saveDecision(values, editItem.id)
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Failed to save')
                throw e
              }
            }}
          />
        )}
      </DecisionDrawerShell>

      <DeleteConfirm
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete decision?"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
