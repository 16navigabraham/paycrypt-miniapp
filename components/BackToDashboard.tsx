'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export default function BackToDashboard() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/dashboard')}
      className="mb-6 inline-flex items-center justify-center px-4 py-2 bg-[#304FFE] hover:bg-[#2640E0] active:bg-[#1E35C4] disabled:bg-gray-300 text-white font-semibold text-sm tracking-wide uppercase rounded-lg shadow-sm hover:shadow-md active:shadow-sm transition-all duration-150 disabled:cursor-not-allowed"
    >
      <ChevronLeft className="h-4 w-4 mr-1" />
      Back
    </button>
  )
}
