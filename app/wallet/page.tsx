"use client"

import BackToDashboard from "@/components/BackToDashboard"
import { useMiniAppWallet } from "@/hooks/useMiniAppWallet"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, Wallet as WalletIcon, CheckCircle } from "lucide-react"
import { useState } from "react"

export default function WalletPage() {
  const { 
    address, 
    isConnected, 
    connectWallet, 
    disconnectWallet, 
    miniAppContext, 
    connectorName 
  } = useMiniAppWallet()
  
  const [copied, setCopied] = useState(false)

  const copyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.log('Clipboard not available');
      }
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  return (
    <div className="container py-10">
      <BackToDashboard />
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Wallet</h1>
        <p className="text-muted-foreground mb-8">
          Manage your wallet connection and view wallet details.
        </p>

        {isConnected && address ? (
          <div className="space-y-6">
            {/* Connected Wallet Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <WalletIcon className="h-5 w-5" />
                  <span>Connected Wallet</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                    Connected
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Wallet Address
                  </label>
                  <div className="flex items-center space-x-2 mt-1">
                    <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded break-all flex-1">
                      {address}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyAddress}
                      className="flex-shrink-0"
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Network
                  </label>
                  <div className="mt-1">
                    <Badge variant="outline">Base Mainnet</Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Connection Method
                  </label>
                  <div className="mt-1">
                    <Badge variant="outline">{connectorName}</Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Platform
                  </label>
                  <div className="mt-1">
                    <Badge variant="outline" className="capitalize">
                      {miniAppContext.client}
                    </Badge>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => window.open(`https://basescan.org/address/${address}`, '_blank')}
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on BaseScan
                  </Button>
                  <Button
                    variant="outline"
                    onClick={disconnectWallet}
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Disconnect
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Wallet Info */}
            <Card>
              <CardHeader>
                <CardTitle>Wallet Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>
                    • Your wallet is connected via the {connectorName} connector
                  </p>
                  <p>
                    • You're currently on the Base network (Chain ID: 8453)
                  </p>
                  <p>
                    • This wallet can be used for all Paycrypt transactions
                  </p>
                  <p>
                    • Your transaction history is tied to this wallet address
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <WalletIcon className="h-5 w-5" />
                <span>No Wallet Connected</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Connect your wallet to access Paycrypt features and view your transaction history.
              </p>
              
              <div className="space-y-3">
                {miniAppContext.isMiniApp ? (
                  <Button onClick={connectWallet} className="w-full">
                    <WalletIcon className="h-4 w-4 mr-2" />
                    Connect Wallet via {connectorName}
                  </Button>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-3">
                      Wallet connection is available in the dashboard
                    </p>
                    <Button onClick={() => window.location.href = '/dashboard'}>
                      Go to Dashboard
                    </Button>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Platform Status</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>• Platform: {miniAppContext.client}</p>
                  <p>• Mini App: {miniAppContext.isMiniApp ? 'Yes' : 'No'}</p>
                  <p>• Connector Available: {connectorName}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}