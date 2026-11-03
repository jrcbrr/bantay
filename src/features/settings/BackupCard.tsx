import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Download, FileSpreadsheet, RotateCcw, Upload } from 'lucide-react'
import { downloadBackup, downloadCsv, restoreBackup, safetyDb, undoRestore } from '@/db/backup.ts'
import { parseBackup, type ParseResult } from '@/db/backupFormat.ts'
import { useSettings } from '@/db/hooks.ts'
import { GlassCard } from '@/ui/GlassCard.tsx'

const ago = (ms: number) => {
  const days = Math.floor((Date.now() - ms) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

const rowBtn =
  'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition hover:bg-ink/[0.03] dark:hover:bg-white/[0.04]'

export function BackupCard() {
  const settings = useSettings()
  const file = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Extract<ParseResult, { ok: true }> | null>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  // Only the timestamp, not the (large) saved data.
  const safetyAt = useLiveQuery(async () => (await safetyDb.copies.get('last'))?.createdAt, [])

  const last = settings?.lastBackupAt
  const stale = !last || Date.now() - last > 14 * 86_400_000

  const onPick = async (f: File | undefined) => {
    if (!f) return
    setMessage(null)
    try {
      const result = parseBackup(await f.text())
      if (result.ok) setPending(result)
      else setMessage({ tone: 'error', text: result.error })
    } catch {
      setMessage({ tone: 'error', text: "Couldn't open that file. Try saving it to your phone's Files or Downloads first." })
    }
  }

  const confirmRestore = async () => {
    if (!pending) return
    setBusy(true)
    try {
      await restoreBackup(pending.backup)
      setMessage({
        tone: 'ok',
        text: `Restored ${pending.counts.transactions} transactions and ${pending.counts.accounts} accounts.${
          pending.skipped ? ` ${pending.skipped} damaged entr${pending.skipped === 1 ? 'y was' : 'ies were'} skipped.` : ''
        }`,
      })
      setPending(null)
    } catch (e) {
      setMessage({ tone: 'error', text: `Restore failed and nothing was changed. (${e instanceof Error ? e.message : 'unknown error'})` })
    } finally {
      setBusy(false)
    }
  }

  const undo = async () => {
    setBusy(true)
    try {
      if (await undoRestore()) setMessage({ tone: 'ok', text: 'Your data from before the restore is back.' })
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    setMessage(null)
    const saved = await downloadBackup()
    if (saved) setMessage({ tone: 'ok', text: 'Backup saved. Keep it somewhere safe, like Google Drive or your email.' })
  }

  return (
    <GlassCard className="p-2!">
      <div className="px-3 pt-3 pb-1">
        <h2 className="font-semibold">Backup</h2>
        <p className={`mt-0.5 text-xs ${stale ? 'text-amber-600 dark:text-amber-400' : 'text-ink/50 dark:text-white/50'}`}>
          {last ? `Last backup ${ago(last)}` : 'Never backed up'}
          {stale && '. Your data only lives on this device, so back up now and then.'}
        </p>
      </div>

      <button className={rowBtn} onClick={() => void save()}>
        <Download size={18} className="text-accent dark:text-accent-soft" />
        <span className="flex-1">
          Save backup
          <span className="block text-xs font-normal text-ink/50 dark:text-white/50">
            Everything, including receipts. On phones, pick “Save to Files” or Drive.
          </span>
        </span>
      </button>

      <button className={rowBtn} onClick={() => file.current?.click()}>
        <Upload size={18} className="text-accent dark:text-accent-soft" />
        <span className="flex-1">
          Restore from backup
          <span className="block text-xs font-normal text-ink/50 dark:text-white/50">Pick your bantay-backup file. You can undo it after.</span>
        </span>
      </button>
      {/* No file-type filter: some phones hide .json files when one is set. The file is checked after picking. */}
      <input
        ref={file}
        type="file"
        hidden
        onChange={(e) => {
          void onPick(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <button className={rowBtn} onClick={() => void downloadCsv()}>
        <FileSpreadsheet size={18} className="text-accent dark:text-accent-soft" />
        <span className="flex-1">
          Export transactions (CSV)
          <span className="block text-xs font-normal text-ink/50 dark:text-white/50">Opens in Excel or Google Sheets</span>
        </span>
      </button>

      {safetyAt && !pending && (
        <button className={rowBtn} disabled={busy} onClick={() => void undo()}>
          <RotateCcw size={18} className="text-amber-600 dark:text-amber-400" />
          <span className="flex-1">
            Undo last restore
            <span className="block text-xs font-normal text-ink/50 dark:text-white/50">
              Brings back your data from {new Date(safetyAt).toLocaleString('en-PH')}
            </span>
          </span>
        </button>
      )}

      {pending && (
        <div className="m-2 rounded-2xl bg-amber-500/10 p-4 text-sm">
          <p className="font-medium">Replace what's on this device with this backup?</p>
          <p className="mt-1 text-ink/60 dark:text-white/60">
            {pending.backup.exportedAt && <>Backup from {new Date(pending.backup.exportedAt).toLocaleString('en-PH')}: </>}
            {pending.counts.transactions} transactions, {pending.counts.accounts} accounts, {pending.counts.receipts} receipts.
            {pending.skipped > 0 && ` ${pending.skipped} damaged entries will be skipped.`} A safety copy of your current data is kept so you can undo.
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setPending(null)} className="flex-1 rounded-xl bg-ink/[0.06] py-2.5 font-medium dark:bg-white/[0.08]">
              Cancel
            </button>
            <button
              disabled={busy}
              onClick={() => void confirmRestore()}
              className="bg-accent flex-1 rounded-xl py-2.5 font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Restoring…' : 'Restore'}
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className={`mx-3 mb-3 text-sm ${message.tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {message.text}
        </p>
      )}
    </GlassCard>
  )
}
