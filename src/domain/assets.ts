import type { Asset, Centavos } from './types.ts'

export function assetGain(a: Pick<Asset, 'purchasePrice' | 'currentValue'>): Centavos {
  return a.currentValue - a.purchasePrice
}

/** Gain as a fraction of purchase price (0.25 = +25%). 0 when bought for free. */
export function assetGainRatio(a: Pick<Asset, 'purchasePrice' | 'currentValue'>): number {
  return a.purchasePrice > 0 ? assetGain(a) / a.purchasePrice : 0
}

export function assetTotals(assets: readonly Asset[]) {
  const value = assets.reduce((s, a) => s + a.currentValue, 0)
  const cost = assets.reduce((s, a) => s + a.purchasePrice, 0)
  return { value, cost, gain: value - cost }
}
