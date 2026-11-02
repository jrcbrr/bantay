import { AnimatePresence, motion } from 'motion/react'
import { db } from '@/db/db.ts'
import { useGoals, useMoney } from '@/db/hooks.ts'
import { MILESTONES, newMilestone } from '@/domain/planExtras.ts'
import { Amount } from '@/ui/Amount.tsx'

const messages: Record<number, string> = {
  25: 'A quarter of the way there!',
  50: "Halfway there! Keep going.",
  75: 'Three quarters done, almost there!',
  100: 'Goal reached! 🎉',
}

const bits = ['🎉', '✨', '💸', '🪙', '⭐', '🎊']

/** Pops up once when a savings goal crosses 25%, 50%, 75% or 100%. */
export function GoalCelebration() {
  const goals = useGoals()
  const { balances } = useMoney()

  const hit = goals
    .map((g) => {
      const saved = g.accountId ? Math.max(0, balances.get(g.accountId) ?? 0) : g.saved
      const ratio = g.target > 0 ? saved / g.target : 0
      return { g, saved, ratio, milestone: newMilestone(ratio, g.celebrated) }
    })
    .find((x) => x.milestone !== undefined)

  const dismiss = () => {
    if (!hit) return
    const pct = hit.ratio * 100
    // Mark every milestone reached so far, so we don't celebrate 25% right after 50%.
    void db.goals.update(hit.g.id, { celebrated: MILESTONES.filter((m) => pct >= m) })
  }

  return (
    <AnimatePresence>
      {hit && (
        <motion.div
          key={`${hit.g.id}-${hit.milestone}`}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          {bits.concat(bits).map((b, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="pointer-events-none absolute text-2xl"
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
              animate={{
                x: Math.cos((i / 12) * Math.PI * 2) * (140 + (i % 3) * 30),
                y: Math.sin((i / 12) * Math.PI * 2) * (140 + (i % 3) * 30),
                opacity: 0,
                scale: 1.2,
              }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
            >
              {b}
            </motion.span>
          ))}
          <motion.div
            role="dialog"
            aria-label="Goal milestone"
            className="glass bg-paper/90! dark:bg-ink/90! w-full max-w-sm rounded-3xl p-6 text-center"
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-5xl font-semibold" style={{ color: hit.g.color }}>
              {hit.milestone}%
            </p>
            <p className="mt-2 text-lg font-semibold">{hit.g.name}</p>
            <p className="mt-1 text-sm text-ink/60 dark:text-white/60">{messages[hit.milestone ?? 0]}</p>
            <p className="mt-3 text-sm">
              <Amount value={hit.saved} className="font-semibold" /> of <Amount value={hit.g.target} />
            </p>
            <button onClick={dismiss} className="bg-accent mt-5 w-full rounded-2xl py-3 font-semibold text-white">
              Nice!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
