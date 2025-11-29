'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export default function BackToDashboard() {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.push('/dashboard')}
      aria-label="Back to dashboard"
      title="Back to dashboard"
      className="p-1 rounded-full inline-flex items-center justify-center text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      <span aria-hidden="true" className="text-2xl font-mono leading-none select-none">
        {'<'}
      </span>
    </button>
  )
}
