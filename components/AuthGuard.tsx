"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMiniAppWallet } from "@/hooks/useMiniAppWallet"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isConnected, isLoading } = useMiniAppWallet()
  const router = useRouter()

  useEffect(() => {
    // Only redirect if we're done loading and not connected
    if (!isLoading && !isConnected) {
      router.replace("/") // Redirect to landing page
    }
  }, [isLoading, isConnected, router])

  // Show loading while checking wallet connection
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking wallet connection...</p>
        </div>
      </div>
    )
  }

  // Don't render if not connected (will redirect)
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to home...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}