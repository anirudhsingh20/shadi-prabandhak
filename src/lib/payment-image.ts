import { supabase, WEDDING_ID } from '@/lib/supabase'

export const PAYMENT_RECEIPTS_BUCKET = 'payment-receipts'
const MAX_BYTES = 8 * 1024 * 1024 // 8 MB

export function assertPaymentImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image must be 8 MB or smaller')
  }
}

function extFromFile(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/heic' || file.type === 'image/heif') return 'heic'
  return 'jpg'
}

/** Path segment inside the public bucket URL, if this app uploaded it. */
export function paymentImageStoragePath(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/object/public/${PAYMENT_RECEIPTS_BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length).split('?')[0] ?? '')
}

export async function uploadPaymentImage(file: File): Promise<string> {
  assertPaymentImageFile(file)
  const path = `${WEDDING_ID}/${crypto.randomUUID()}.${extFromFile(file)}`
  const { error } = await supabase.storage.from(PAYMENT_RECEIPTS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg',
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(PAYMENT_RECEIPTS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function uploadPaymentImages(files: File[]): Promise<string[]> {
  const urls: string[] = []
  try {
    for (const file of files) {
      urls.push(await uploadPaymentImage(file))
    }
    return urls
  } catch (e) {
    await deletePaymentImages(urls)
    throw e
  }
}

export async function deletePaymentImage(url: string | null | undefined) {
  const path = paymentImageStoragePath(url)
  if (!path) return
  const { error } = await supabase.storage.from(PAYMENT_RECEIPTS_BUCKET).remove([path])
  if (error) console.warn('Failed to delete payment image:', error.message)
}

export async function deletePaymentImages(urls: (string | null | undefined)[]) {
  const paths = urls
    .map(paymentImageStoragePath)
    .filter((p): p is string => Boolean(p))
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(PAYMENT_RECEIPTS_BUCKET).remove(paths)
  if (error) console.warn('Failed to delete payment images:', error.message)
}
