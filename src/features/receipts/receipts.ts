import { db, newId } from '@/db/db.ts'

/** Shrink a photo to at most `maxSide` px and JPEG-compress it so receipts stay small offline. */
export function compressPhoto(file: File, maxSide = 1280, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      URL.revokeObjectURL(url)
      if (!ctx) return reject(new Error('Canvas unavailable'))
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that photo'))
    }
    img.src = url
  })
}

/** Save a photo to the inbox to turn into a transaction later. */
export async function addReceipt(file: File): Promise<void> {
  const image = await compressPhoto(file)
  await db.receipts.add({ id: newId(), image, status: 'pending', createdAt: Date.now() })
}

export async function deleteReceipt(id: string): Promise<void> {
  await db.receipts.delete(id)
}
