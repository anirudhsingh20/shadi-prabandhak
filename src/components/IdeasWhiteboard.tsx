import { useEffect, useState } from 'react'
import {
  Tldraw,
  createTLStore,
  defaultShapeUtils,
  getSnapshot,
  loadSnapshot,
  type TLStore,
} from 'tldraw'
import 'tldraw/tldraw.css'

type BoardDocument = ReturnType<typeof getSnapshot>['document']

function createStore(document: BoardDocument | null | undefined): TLStore {
  const store = createTLStore({ shapeUtils: defaultShapeUtils })
  if (document && typeof document === 'object') {
    try {
      loadSnapshot(store, { document })
    } catch {
      // Ignore invalid / outdated snapshots — start blank
    }
  }
  return store
}

export function IdeasWhiteboard({
  initialDocument,
  onDocumentChange,
}: {
  initialDocument: BoardDocument | null | undefined
  onDocumentChange: (document: BoardDocument) => void
}) {
  const [store] = useState(() => createStore(initialDocument))

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const unlisten = store.listen(
      () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          const { document } = getSnapshot(store)
          onDocumentChange(document)
        }, 700)
      },
      { scope: 'document', source: 'user' },
    )
    return () => {
      unlisten()
      if (timer) clearTimeout(timer)
    }
  }, [store, onDocumentChange])

  return (
    <div className="ideas-tldraw h-[min(72dvh,640px)] overflow-hidden rounded-lg border-2 border-gold/40 bg-white shadow-inner">
      <Tldraw store={store} />
    </div>
  )
}
