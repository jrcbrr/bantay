import { AnimatePresence, motion } from 'motion/react'
import { Undo2 } from 'lucide-react'
import { useToast } from './toast.ts'

export function Toaster() {
  const toast = useToast((s) => s.toast)
  const dismiss = useToast((s) => s.dismiss)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(7rem+env(safe-area-inset-bottom))] z-[70] flex justify-center px-4 md:bottom-8">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-ink/90 py-2.5 pr-2 pl-4 text-sm text-white shadow-xl backdrop-blur dark:bg-white/90 dark:text-ink"
          >
            <span className="min-w-0">{toast.message}</span>
            {toast.undo && (
              <button
                onClick={async () => {
                  const undo = toast.undo
                  dismiss()
                  await undo?.()
                }}
                className="text-accent-soft dark:text-accent flex items-center gap-1 rounded-xl px-2.5 py-1 font-semibold"
              >
                <Undo2 size={15} /> Undo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
