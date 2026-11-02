import { Bike, Gem, House, Laptop, Package, Sparkles, type LucideIcon } from 'lucide-react'
import type { AssetKind } from '@/domain/types.ts'

export const assetKinds: readonly (readonly [AssetKind, string, LucideIcon])[] = [
  ['gadget', 'Gadget', Laptop],
  ['vehicle', 'Vehicle', Bike],
  ['collectible', 'Collectible', Sparkles],
  ['jewelry', 'Jewelry', Gem],
  ['property', 'Property', House],
  ['other', 'Other', Package],
]

export const assetKindIcon = (k: AssetKind): LucideIcon => assetKinds.find(([id]) => id === k)?.[2] ?? Package
