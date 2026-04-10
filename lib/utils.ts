import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

export function formatDate(timestamp: Timestamp): string {
  return format(timestamp.toDate(), "MMMM d, yyyy 'at' h:mm a")
}

export function getExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)
}

export function isExpired(expiresAt: Timestamp): boolean {
  return Date.now() >= expiresAt.toMillis()
}

export function getCountdownText(expiresAt: Timestamp): string {
  const now = Date.now()
  const diff = expiresAt.toMillis() - now

  if (diff <= 0) {
    const daysPast = Math.floor(Math.abs(diff) / (24 * 60 * 60 * 1000))
    return daysPast === 0 ? 'Expired today' : `Expired ${daysPast} day${daysPast > 1 ? 's' : ''} ago`
  }

  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (diff < 60 * 60 * 1000) {
    return `Expires in ${minutes}m`
  } else if (diff < 24 * 60 * 60 * 1000) {
    const remainingMinutes = minutes % 60
    return `Expires in ${hours}h ${remainingMinutes}m`
  } else {
    return `Expires in ${days} day${days > 1 ? 's' : ''}`
  }
}

export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '')
  const parsed = parseFloat(cleaned)
  if (isNaN(parsed)) return 0
  return Math.round(parsed * 100)
}
