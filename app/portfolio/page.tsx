"use client"

import BackToDashboard from "@/components/BackToDashboard"
import { PortfolioOverview } from "@/components/dashboard/portfolio-overview"
import { useMiniAppWallet } from "@/hooks/useMiniAppWallet"
import { Button } from "@/components/ui/button"

export default function PortfolioPage() {
  const { address, isConnected } = useMiniAppWallet()

  // Create wallet object compatible with PortfolioOverview component
  const connectedWallet = address ? {
    address,
    chainId: '8453',
    connectedAt: new Date().toISOString()
  } : null

  // Show wallet connection prompt if not connected
  if (!isConnected) {
    return (
      <div className="container py-10">
        <BackToDashboard />
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold mb-4">Portfolio</h1>
          <p className="text-muted-foreground mb-6">
            Please connect your wallet to view your portfolio.
          </p>
          <Button onClick={() => window.location.href = '/dashboard'}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <BackToDashboard />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Portfolio</h1>
          <p className="text-muted-foreground">
            View your real-time crypto balances and value on Base chain.
          </p>
        </div>
        {address && (
          <div className="text-sm text-muted-foreground">
            <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
              {address}
            </div>
          </div>
        )}
      </div>
      
      <PortfolioOverview wallet={connectedWallet} />
    </div>
  )
}