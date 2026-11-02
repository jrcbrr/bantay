import { useState } from 'react'
import { Archive } from 'lucide-react'
import { archiveBefore } from '@/db/actions.ts'
import { downloadBackup } from '@/db/backup.ts'
import { useArchives, useTransactions } from '@/db/hooks.ts'
import { keepWhenArchiving } from '@/domain/archive.ts'
import { Amount } from '@/ui/Amount.tsx'
import { GlassCard } from '@/ui/GlassCard.tsx'

/** Fold past years into summaries so the app stays fast after years of records. */
export function ArchiveCard() {
  const transactions = useTransactions()
  const archives = useArchives()
  const [step, setStep] = useState<'idle' | 'backed-up' | 'working'>('idle')
  const [done, setDone] = useState('')

  const thisYear = new Date().getFullYear()
  const cutoff = `${thisYear}-01-01`
  const old = transactions.filter((t) => t.date < cutoff && !keepWhenArchiving(t))
  const years = [...new Set(old.map((t) => t.date.slice(0, 4)))].sort()

  const backup = async () => {
    await downloadBackup()
    setStep('backed-up')
  }

  const run = async () => {
    setStep('working')
    const n = await archiveBefore(thisYear)
    setStep('idle')
    setDone(`Archived ${n} transactions. Your balances didn't change.`)
  }

  return (
    <GlassCard className="space-y-3">
      <div className="flex items-center gap-3">
        <Archive size={20} className="text-accent dark:text-accent-soft" />
        <div className="flex-1">
          <h2 className="font-semibold">Archive old years</h2>
          <p className="text-xs text-ink/50 dark:text-white/50">
            Keeps Bantay fast. Past years become a yearly summary; full details stay in your backup file.
          </p>
        </div>
      </div>

      {years.length === 0 ? (
        <p className="text-sm text-ink/55 dark:text-white/55">Nothing to archive. Only years before {thisYear} can be archived.</p>
      ) : (
        <>
          <p className="text-sm">
            {old.length} transactions from {years.join(', ')} can be archived.
          </p>
          {step === 'idle' && (
            <button onClick={() => void backup()} className="bg-accent w-full rounded-xl py-2.5 text-sm font-semibold text-white">
              1. Download a backup first
            </button>
          )}
          {step !== 'idle' && (
            <button
              disabled={step === 'working'}
              onClick={() => void run()}
              className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {step === 'working' ? 'Archiving…' : `2. Archive everything before ${thisYear}`}
            </button>
          )}
        </>
      )}
      {done && <p className="text-sm text-emerald-600 dark:text-emerald-400">{done}</p>}

      {archives.length > 0 && (
        <ul className="space-y-1 border-t border-ink/5 pt-3 text-sm dark:border-white/5">
          {archives.map((a) => (
            <li key={a.id} className="flex justify-between gap-2">
              <span className="font-medium">{a.year}</span>
              <span className="text-ink/55 dark:text-white/55">
                {a.count} archived · in <Amount value={a.income} /> · out <Amount value={a.expense} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  )
}
