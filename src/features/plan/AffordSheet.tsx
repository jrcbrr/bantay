import { useEffect, useState } from 'react'
import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react'
import { useMoney } from '@/db/hooks.ts'
import { parseAmount } from '@/domain/money.ts'
import { affordCheck, type AffordVerdict } from '@/domain/planExtras.ts'
import { Amount } from '@/ui/Amount.tsx'
import { AmountInput, Field } from '@/ui/form.tsx'
import { Sheet } from '@/ui/Sheet.tsx'

const look: Record<AffordVerdict, { title: string; tone: string; Icon: typeof CircleCheck }> = {
  easy: { title: 'Yes, go for it', tone: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300', Icon: CircleCheck },
  tight: { title: 'You can, but it gets tight', tone: 'bg-amber-500/12 text-amber-700 dark:text-amber-300', Icon: TriangleAlert },
  short: { title: 'Better wait', tone: 'bg-red-500/12 text-red-700 dark:text-red-300', Icon: CircleX },
  no: { title: "Not enough money yet", tone: 'bg-red-500/12 text-red-700 dark:text-red-300', Icon: CircleX },
}

/** "Can I afford it?" — what a purchase does to safe-to-spend until the next baon. */
export function AffordSheet({ open, initialPrice, label, onClose }: { open: boolean; initialPrice?: number; label?: string; onClose: () => void }) {
  const { available, upcomingBills, spentToday, cycle } = useMoney()
  const [priceText, setPriceText] = useState('')

  useEffect(() => {
    if (open) setPriceText(initialPrice ? String(initialPrice / 100) : '')
  }, [open, initialPrice])

  const price = parseAmount(priceText)
  const r = price !== null ? affordCheck({ price, available, upcomingBills, spentToday, daysLeft: cycle.daysLeft }) : null
  const days = cycle.daysLeft

  return (
    <Sheet open={open} onClose={onClose} title={label ? `Can I afford ${label}?` : 'Can I afford it?'}>
      <div className="space-y-5">
        <Field label="Price">
          <AmountInput value={priceText} onChange={setPriceText} autoFocus={!initialPrice} />
        </Field>

        {r && price !== null && (
          <>
            <div className={`flex items-center gap-3 rounded-2xl p-4 ${look[r.verdict].tone}`}>
              {(() => {
                const Icon = look[r.verdict].Icon
                return <Icon size={24} className="shrink-0" />
              })()}
              <div>
                <p className="font-semibold">{look[r.verdict].title}</p>
                <p className="text-sm opacity-90">
                  {r.verdict === 'easy' && 'It fits in what you can spend today.'}
                  {r.verdict === 'tight' && (
                    <>
                      You'd have <Amount value={r.safeAfter} /> a day left for the next {days} day{days === 1 ? '' : 's'}.
                    </>
                  )}
                  {r.verdict === 'short' && `It would use money you need before your next baon${upcomingBills ? ', bills included' : ''}.`}
                  {r.verdict === 'no' && (
                    <>
                      You have <Amount value={available} /> to spend right now.
                    </>
                  )}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-ink/[0.03] p-3 dark:bg-white/[0.04]">
                <dt className="text-xs text-ink/50 dark:text-white/50">Safe to spend today</dt>
                <dd>
                  <Amount value={r.safeBefore} className="font-semibold" />
                </dd>
              </div>
              <div className="rounded-2xl bg-ink/[0.03] p-3 dark:bg-white/[0.04]">
                <dt className="text-xs text-ink/50 dark:text-white/50">Per day after buying</dt>
                <dd>
                  <Amount value={r.safeAfter} className="font-semibold" />
                </dd>
              </div>
              <div className="rounded-2xl bg-ink/[0.03] p-3 dark:bg-white/[0.04]">
                <dt className="text-xs text-ink/50 dark:text-white/50">Spendable now</dt>
                <dd>
                  <Amount value={available} className="font-semibold" />
                </dd>
              </div>
              <div className="rounded-2xl bg-ink/[0.03] p-3 dark:bg-white/[0.04]">
                <dt className="text-xs text-ink/50 dark:text-white/50">Left after buying</dt>
                <dd>
                  <Amount value={r.leftAfter} className="font-semibold" />
                </dd>
              </div>
            </dl>
            <p className="text-xs text-ink/50 dark:text-white/50">
              Based on your spendable accounts, {days} day{days === 1 ? '' : 's'} until your next baon
              {upcomingBills > 0 && (
                <>
                  , and <Amount value={upcomingBills} /> in bills due before then
                </>
              )}
              . Savings accounts aren't counted.
            </p>
          </>
        )}
      </div>
    </Sheet>
  )
}
