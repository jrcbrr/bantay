import { useRef, useState, type RefObject } from 'react'
import { Camera, ImagePlus, Trash2 } from 'lucide-react'
import { useSheets } from '@/app/sheets.ts'
import { usePendingReceipts } from '@/db/hooks.ts'
import { GlassCard } from '@/ui/GlassCard.tsx'
import { addReceipt, deleteReceipt } from './receipts.ts'

const timeFmt = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export function ReceiptsInbox() {
  const receipts = usePendingReceipts()
  const openAdd = useSheets((s) => s.openAdd)
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const [armed, setArmed] = useState<string | null>(null)
  const [error, setError] = useState('')

  const onFiles = async (files: FileList | null) => {
    if (!files) return
    setError('')
    try {
      for (const f of Array.from(files)) await addReceipt(f)
    } catch {
      setError('One of those photos could not be read.')
    }
  }

  const fileInput = (ref: RefObject<HTMLInputElement | null>, capture: boolean) => (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      multiple={!capture}
      capture={capture ? 'environment' : undefined}
      hidden
      onChange={(e) => {
        void onFiles(e.target.files)
        e.target.value = ''
      }}
    />
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => camera.current?.click()}
          className="bg-accent shadow-accent/30 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white shadow-lg"
        >
          <Camera size={18} /> Snap receipt
        </button>
        <button
          onClick={() => gallery.current?.click()}
          className="glass flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold"
        >
          <ImagePlus size={18} /> From photos
        </button>
        {fileInput(camera, true)}
        {fileInput(gallery, false)}
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {receipts.length === 0 ? (
        <GlassCard>
          <p className="py-4 text-center text-sm text-ink/50 dark:text-white/50">
            No receipts waiting. Snap one when you pay, then log it here when you have time.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {receipts.map((r) => (
            <div key={r.id} className="glass overflow-hidden rounded-3xl">
              <button onClick={() => openAdd({ receipt: r })} className="block w-full text-left">
                <img src={r.image} alt="Receipt" className="aspect-[3/4] w-full object-cover" />
              </button>
              <div className="flex items-center gap-1 p-2">
                <button
                  onClick={() => openAdd({ receipt: r })}
                  className="text-accent dark:text-accent-soft flex-1 truncate rounded-xl px-2 py-1.5 text-left text-xs font-semibold"
                >
                  Log it
                  <span className="block font-normal text-ink/45 dark:text-white/45">{timeFmt.format(r.createdAt)}</span>
                </button>
                <button
                  aria-label="Delete receipt"
                  onClick={() => {
                    if (armed === r.id) void deleteReceipt(r.id)
                    else setArmed(r.id)
                  }}
                  className={`rounded-xl p-2 transition ${armed === r.id ? 'bg-red-600 text-white' : 'text-ink/40 dark:text-white/40'}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
