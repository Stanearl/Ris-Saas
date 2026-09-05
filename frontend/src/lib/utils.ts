import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

// Formats a weight value in kilograms with up to 3 decimal places, WITHOUT
// rounding to the nearest whole number. Unlike formatNumber() (which sets
// minimumFractionDigits === maximumFractionDigits and rounds to that), this
// only caps fraction digits, so trailing zeros are trimmed and small values
// stay precise: 0.168 -> "0.168", 168.2 -> "168.2", 5000 -> "5000".
export function formatWeightKg(weightKg: number): string {
  return `${parseFloat(weightKg.toFixed(3))}`
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateString))
}
