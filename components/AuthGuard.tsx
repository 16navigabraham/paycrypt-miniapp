"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { usePrivy } from "@privy-io/react-auth"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !ready) return

    // Check for mini app wallet data (stored from home page)
    const storedWalletAddress = localStorage.getItem('paycrypt_wallet_address')
    
    // If not authenticated with Privy and no stored wallet data, redirect
    if (!authenticated && !storedWalletAddress) {
      console.log('⚠️ No authentication found (Privy or mini app), redirecting to home')
      router.replace("/")
    }
  }, [ready, authenticated, router, mounted])

  // Don't render until ready and mounted
  if (!mounted || !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Check for mini app wallet data
  const storedWalletAddress = localStorage.getItem('paycrypt_wallet_address')
  
  // Allow access if either authenticated with Privy OR has mini app wallet data
  if (!authenticated && !storedWalletAddress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to authentication...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}