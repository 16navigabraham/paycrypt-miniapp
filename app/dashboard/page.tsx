"use client";

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import dynamic from 'next/dynamic'
import { useMiniKit } from '@coinbase/onchainkit/minikit'
import { MainLayout } from "@/components/layout/main-layout"
import { PortfolioOverview } from "@/components/dashboard/portfolio-overview"
import { QuickActions } from "@/components/dashboard/quick-actions"
import RecentTransactions from "@/components/dashboard/recent-transactions"
import { MarketData } from "@/components/dashboard/market-data"
import { Button } from "@/components/ui/button"
import { Menu, Wallet, Copy, CheckCircle, Wifi, WifiOff } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { Badge } from "@/components/ui/badge"
import { useMiniAppWallet } from "@/hooks/useMiniAppWallet"

interface WalletData {
  address: string;
  chainId: string;
  connectedAt: string;
}

// Dashboard Component - Using Proper Farcaster Mini App SDK
function DashboardClient() {
  const router = useRouter();
  const { isFrameReady } = useMiniKit();
  const { 
    address, 
    isConnected, 
    isLoading, 
    connectWallet, 
    disconnectWallet, 
    miniAppContext,
    farcasterContext,
    hasConnector,
    connectorName 
  } = useMiniAppWallet();
  
  const [mounted, setMounted] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<WalletData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'live' | 'cached' | 'connecting'>('connecting');

  // Mount check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update wallet state when connection changes
  useEffect(() => {
    if (!mounted) return;

    console.log('🔍 Wallet state changed:', {
      address,
      isConnected,
      isLoading,
      hasConnector,
      connectorName,
      miniAppContext,
      farcasterContext
    });

    if (address && isConnected) {
      console.log('✅ Wallet connected via Farcaster SDK:', address);
      
      setConnectedWallet({
        address,
        chainId: '8453', // Base chain ID
        connectedAt: new Date().toISOString()
      });
      
      // Determine connection status based on context
      if (farcasterContext && miniAppContext?.isMiniApp) {
        setConnectionStatus('live');
      } else {
        setConnectionStatus('cached');
      }
    } else {
      console.log('⌛ No wallet connected');
      setConnectedWallet(null);
      setConnectionStatus('connecting');
    }

  }, [mounted, address, isConnected, isLoading, farcasterContext, miniAppContext]);

  // Auto-redirect for web users without wallet
  useEffect(() => {
    if (!mounted || isLoading) return;

    // If not in mini app and no wallet after 3 seconds, redirect
    if (!miniAppContext?.isMiniApp && !isConnected) {
      const timer = setTimeout(() => {
        router.replace('/');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [mounted, isLoading, miniAppContext?.isMiniApp, isConnected, router]);

  const copyAddress = async () => {
    if (connectedWallet?.address) {
      try {
        await navigator.clipboard.writeText(connectedWallet.address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.log('Clipboard not available, address:', connectedWallet.address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case 'live':
        return (
          <Badge className="bg-gradient-to-r from-green-500 to-blue-600 text-white border-0">
            <Wifi className="h-3 w-3 mr-1" />
            {connectorName || 'Farcaster'} Connected
          </Badge>
        );
      case 'cached':
        return (
          <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
            <WifiOff className="h-3 w-3 mr-1" />
            {miniAppContext?.client === 'base' ? 'Base App Connected' : 'Mini App Connected'}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-yellow-700 border-yellow-300">
            Connecting...
          </Badge>
        );
    }
  };

  const getClientBadge = () => {
    switch (miniAppContext?.client) {
      case 'base':
        return (
          <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
            🔵 Base App
          </Badge>
        );
      case 'farcaster':
        return (
          <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50">
            🟣 Farcaster
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-gray-700 border-gray-300 bg-gray-50">
            🌐 Web App
          </Badge>
        );
    }
  };

  // Show loading until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Dashboard...</p>
        </div>
      </div>
    );
  }

  // Show loading while checking wallet
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading wallet data...</p>
          <p className="text-sm text-gray-500 mt-2">
            {!isFrameReady ? 'Initializing MiniKit...' : 'Checking wallet connection...'}
          </p>
        </div>
      </div>
    );
  }

  // Show wallet connection prompt if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center max-w-md mx-auto px-4">
          <img src="/paycrypt.png" alt="Paycrypt" className="h-20 w-20 mx-auto mb-6 rounded-2xl shadow-lg" />
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h1>
          <p className="text-gray-600 mb-6">
            Connect your wallet to access Paycrypt and start converting crypto to utilities.
          </p>
          
          <div className="flex justify-center space-x-2 mb-6">
            {getClientBadge()}
            <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
              ⚡ Base Network
            </Badge>
          </div>

          {hasConnector ? (
            <Button 
              onClick={connectWallet}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg mb-4 shadow-lg hover:shadow-xl transition-all"
            >
              <Wallet className="h-5 w-5 mr-2" />
              Connect via {connectorName || 'Wallet'}
            </Button>
          ) : (
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500 mb-2">No wallet connector available</p>
              <Badge variant="outline" className="text-red-700 border-red-300">
                Mini App SDK Required
              </Badge>
            </div>
          )}

          {miniAppContext?.isMiniApp ? (
            <div className="text-sm text-gray-500 space-y-1">
              <p>🔒 Secure connection via {miniAppContext.client}</p>
              <p>Running on Base network</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Redirecting to home in a few seconds...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      {/* Desktop overlay when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 hidden lg:block" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="bg-background border shadow-md hover:bg-accent"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-3 flex-wrap">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                {connectedWallet && getConnectionBadge()}
                {getClientBadge()}
              </div>
              <div className="flex items-center space-x-4">
                <p className="text-muted-foreground">
                  {connectedWallet
                    ? (
                      <span className="flex items-center space-x-2">
                        <span>Base Wallet: {formatAddress(connectedWallet.address)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyAddress}
                          className="h-6 w-6 p-0"
                        >
                          {copied ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </span>
                    )
                    : "Setting up your wallet connection..."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        {connectedWallet && (
          <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Welcome to Paycrypt! 🎉
            </h2>
            <p className="text-blue-700 dark:text-blue-200 text-sm">
              {connectionStatus === 'live' 
                ? `Your wallet is actively connected via ${miniAppContext?.client} using ${connectorName || 'Farcaster SDK'}. All systems ready!`
                : `Connected via ${miniAppContext?.client}. Your wallet is ready for secure transactions on Base network.`}
            </p>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Portfolio Overview */}
          <div className="lg:col-span-3 space-y-6">
            {/* Portfolio Overview Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Portfolio Overview
                </h2>
                <div className="text-sm text-gray-500">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
              <PortfolioOverview wallet={connectedWallet} />
            </div>

            {/* Recent Transactions Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Recent Transactions
                </h2>
              </div>
              <RecentTransactions wallet={connectedWallet} />
            </div>

            {/* Market Data Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Market Data
                </h2>
                <div className="text-sm text-gray-500">
                  Real-time data
                </div>
              </div>
              <MarketData />
            </div>
          </div>

          {/* Right Sidebar - Quick Actions */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Quick Actions Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Quick Actions
                  </h2>
                </div>
                <QuickActions wallet={connectedWallet} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

// Export dynamic component with no SSR
const DashboardPage = dynamic(() => Promise.resolve(DashboardClient), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Setting up Dashboard...</p>
        <p className="text-sm text-gray-500 mt-2">Loading wallet connection...</p>
      </div>
    </div>
  )
});

export default DashboardPage;