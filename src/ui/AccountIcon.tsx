import {
  Banknote,
  Coins,
  CreditCard,
  HandCoins,
  Landmark,
  PiggyBank,
  Smartphone,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { Account, AccountKind } from '@/domain/types.ts'

export const accountIcons: Record<string, LucideIcon> = {
  banknote: Banknote,
  wallet: Wallet,
  smartphone: Smartphone,
  landmark: Landmark,
  'credit-card': CreditCard,
  'piggy-bank': PiggyBank,
  coins: Coins,
  'hand-coins': HandCoins,
}

export const accountColors = [
  '#16a34a', // green
  '#0a5cff', // e-wallet blue
  '#2f6bff', // bantay blue
  '#0ea5e9', // sky
  '#7c3aed', // violet
  '#db2777', // pink
  '#f59e0b', // amber
  '#27272a', // graphite
]

const kindDefault: Record<AccountKind, string> = {
  cash: 'banknote',
  ewallet: 'smartphone',
  bank: 'landmark',
  credit: 'credit-card',
}

interface Props {
  account: Pick<Account, 'kind' | 'icon' | 'color' | 'iconImage' | 'name'>
  size?: number
  className?: string
}

/** Rounded app-style tile: the account's uploaded image, or a white icon on its color. */
export function AccountIcon({ account, size = 40, className = '' }: Props) {
  const radius = Math.round(size * 0.3)

  if (account.iconImage) {
    return (
      <img
        src={account.iconImage}
        alt=""
        className={`shrink-0 object-cover ${className}`}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    )
  }

  const Icon = accountIcons[account.icon ?? ''] ?? accountIcons[kindDefault[account.kind]] ?? Wallet
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center text-white shadow-sm ${className}`}
      style={{ width: size, height: size, borderRadius: radius, background: account.color ?? '#2f6bff' }}
    >
      <Icon size={Math.round(size * 0.52)} strokeWidth={2.2} />
    </span>
  )
}

/** Downscale an uploaded image to a square PNG data URL, small enough to keep in IndexedDB. */
export function imageFileToIcon(file: File, px = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = px
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas unavailable'))
      const side = Math.min(img.width, img.height)
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, px, px)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image'))
    }
    img.src = url
  })
}
