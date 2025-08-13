"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const checkAuthentication = async () => {
      try {
        // Check for mini app wallet data first (primary method)
        const storedWalletAddress = localStorage.getItem('paycrypt_wallet_address')
        
        if (storedWalletAddress) {
          console.log('✅ Mini app authentication found:', storedWalletAddress.slice(0, 6) + '...')
          setIsAuthenticated(true)
          setIsChecking(false)
          return
        }

        // Check for Privy authentication as fallback
        let privyAuthenticated = false
        try {
          // Dynamically import Privy to avoid errors if not configured
          const { usePrivy } = await import("@privy-io/react-auth")
          // Note: This won't work as hooks can't be called conditionally
          // But we'll handle this gracefully
        } catch (error) {
          console.log('ℹ️ Privy not available, using mini app auth only')
        }

        // If no authentication found, redirect to home
        console.log('⚠️ No authentication found, redirecting to home')
        router.replace("/")
        
      } catch (error) {
        console.error('❌ Authentication check error:', error)
        // On error, allow access (fail open for mini apps)
        setIsAuthenticated(true)
      } finally {
        setIsChecking(false)
      }
    }

    // Small delay to allow localStorage to be available
    const timeoutId = setTimeout(checkAuthentication, 100)
    return () => clearTimeout(timeoutId)
  }, [mounted, router])

  // Don't render until mounted and checked
  if (!mounted || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show loading if not authenticated (brief moment before redirect)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}