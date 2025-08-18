"use client";

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import dynamic from 'next/dynamic'
import { useFarcasterMiniApp } from '@/hooks/useFarcasterMiniApp';
import { useMiniKit } from '@coinbase/onchainkit/minikit'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { MainLayout } from "@/components/layout/main-layout"
import { PortfolioOverview } from "@/components/dashboard/portfolio-overview"
import { QuickActions } from "@/components/dashboard/quick-actions"
import RecentTransactions from "@/components/dashboard/recent-transactions"
import { MarketData } from "@/components/dashboard/market-data"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Wallet, 
  Copy, 
  CheckCircle, 
  Wifi, 
  WifiOff, 
  AlertTriangle,
  Eye,
  EyeOff,
  ChevronRight,
  Activity,
  Smartphone,
  Tv,
  Zap,
  ArrowUpDown,
  TrendingUp,
  History
} from "lucide-react"
import sdk from "@farcaster/miniapp-sdk";

interface WalletData {
  address: string;
  chainId: string;
  connectedAt: string;
}

// Mobile-First Dashboard Component
function DashboardClient() {
  const router = useRouter();
  const [miniKitReady, setMiniKitReady] = useState(false);
  const [miniKitError, setMiniKitError] = useState<string | null>(null);
  const [balanceVisible, setBalanceVisible] = useState(true);
  
  // Use Wagmi hooks
  const { address, isConnected, isConnecting, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  
  // Farcaster mini app integration
  const { addMiniApp, isAdded, isLoading: isFarcasterLoading, error: farcasterError } = useFarcasterMiniApp();
  
  // Safe MiniKit usage
  const { context, isFrameReady } = useMiniKit();
  
  const [mounted, setMounted] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<WalletData | null>(null);
  const [copied, setCopied] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'live' | 'cached' | 'connecting'>('connecting');
  const [miniAppContext, setMiniAppContext] = useState<{
    isMiniApp: boolean;
    isWeb: boolean;
    client: string;
  }>({ isMiniApp: false, isWeb: true, client: 'web' });

  // Mount check
  useEffect(() => {
    setMounted(true);
    setMiniKitReady(isFrameReady);
  }, [isFrameReady]);

  // Detect mini app context
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const hasParent = window.parent && window.parent !== window;
    const referrer = document.referrer || '';
    const userAgent = window.navigator.userAgent || '';
    
    const isBaseApp = userAgent.includes('Base') || 
                      referrer.includes('base.org') || 
                      referrer.includes('coinbase');
    
    const isFarcaster = userAgent.includes('Farcaster') || 
                        referrer.includes('farcaster') || 
                        referrer.includes('warpcast');
    
    setMiniAppContext({
      isMiniApp: hasParent || isFarcaster || isBaseApp,
      isWeb: !hasParent && !isFarcaster && !isBaseApp,
      client: isBaseApp ? 'base' : isFarcaster ? 'farcaster' : 'web'
    });
  }, []);

  // Auto-connect wallet in mini app context
  useEffect(() => {
    if (!mounted || isConnecting || isPending || isConnected) return;

    const tryAutoConnect = async () => {
      if (miniAppContext.isMiniApp && connectors.length > 0) {
        try {
          if (miniAppContext.client === 'farcaster') {
            try {
              await sdk.actions.addMiniApp();
            } catch (addError) {
              console.log('Failed to add mini app to Farcaster:', addError);
            }
          }
          connect({ connector: connectors[0] });
        } catch (error) {
          console.log('Auto-connect failed:', error);
        }
      }
    };

    const timer = setTimeout(tryAutoConnect, 1000);
    return () => clearTimeout(timer);
  }, [mounted, miniAppContext.isMiniApp, miniAppContext.client, connectors, connect, isConnecting, isPending, isConnected]);

  // Update wallet state when connection changes
  useEffect(() => {
    if (!mounted) return;

    try {
      if (address && isConnected) {
        setConnectedWallet({
          address,
          chainId: chainId?.toString() || '8453',
          connectedAt: new Date().toISOString()
        });
        
        if (context && miniAppContext.isMiniApp) {
          setConnectionStatus('live');
        } else {
          setConnectionStatus('cached');
        }
      } else {
        setConnectedWallet(null);
        setConnectionStatus('connecting');
      }
    } catch (error) {
      console.error('Error updating wallet state:', error);
    }
  }, [mounted, address, isConnected, isConnecting, chainId, context, miniAppContext]);

  // Auto-redirect for web users without wallet
  useEffect(() => {
    if (!mounted || isConnecting || isPending) return;

    try {
      if (!miniAppContext.isMiniApp && !isConnected) {
        const timer = setTimeout(() => {
          router.replace('/');
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.error('Error in redirect logic:', error);
    }
  }, [mounted, isConnecting, isPending, miniAppContext.isMiniApp, isConnected, router]);

  const handleConnectWallet = async () => {
    try {
      if (connectors.length > 0) {
        if (miniAppContext.client === 'farcaster' && !isAdded && !isFarcasterLoading) {
          await addMiniApp();
        }
        connect({ connector: connectors[0] });
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setMiniKitError(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const copyAddress = async () => {
    if (connectedWallet?.address) {
      try {
        await navigator.clipboard.writeText(connectedWallet.address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
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
    try {
      switch (connectionStatus) {
        case 'live':
          return (
            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs dark:bg-green-900/30 dark:text-green-400">
              <Wifi className="h-3 w-3 mr-1" />
              Live
            </Badge>
          );
        case 'cached':
          return (
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs dark:bg-blue-900/30 dark:text-blue-400">
              <WifiOff className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          );
        default:
          return (
            <Badge variant="outline" className="text-yellow-700 border-yellow-300 text-xs">
              Connecting...
            </Badge>
          );
      }
    } catch (error) {
      return (
        <Badge variant="outline" className="text-red-700 border-red-300 text-xs">
          Error
        </Badge>
      );
    }
  };

  const getClientBadge = () => {
    try {
      switch (miniAppContext.client) {
        case 'base':
          return (
            <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50 text-xs dark:bg-blue-900/30 dark:text-blue-400">
              🔵 Base
            </Badge>
          );
        case 'farcaster':
          return (
            <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50 text-xs dark:bg-purple-900/30 dark:text-purple-400">
              🟣 Farcaster
            </Badge>
          );
        default:
          return (
            <Badge variant="outline" className="text-gray-700 border-gray-300 bg-gray-50 text-xs dark:bg-gray-800 dark:text-gray-400">
              🌐 Web
            </Badge>
          );
      }
    } catch (error) {
      return (
        <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50 text-xs">
          Error
        </Badge>
      );
    }
  };

  // Utility services for quick actions
  const utilityServices = [
    { 
      name: "Airtime", 
      icon: Smartphone, 
      href: "/airtime", 
      gradient: "from-purple-500 to-pink-500",
      description: "Top up mobile"
    },
    { 
      name: "Internet", 
      icon: Wifi, 
      href: "/internet", 
      gradient: "from-blue-500 to-cyan-500",
      description: "Data bundles"
    },
    { 
      name: "TV", 
      icon: Tv, 
      href: "/tv", 
      gradient: "from-orange-500 to-red-500",
      description: "Cable & streaming"
    },
    { 
      name: "Electricity", 
      icon: Zap, 
      href: "/electricity", 
      gradient: "from-yellow-500 to-orange-500",
      description: "Power bills"
    },
  ];

  // Show error if there's a critical error
  if (miniKitError || farcasterError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-4">
        <div className="text-center max-w-sm mx-auto">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Connection Error</h1>
          <p className="text-gray-600 mb-6 text-sm">{miniKitError || farcasterError}</p>
          <div className="space-y-3">
            <Button onClick={() => window.location.reload()} className="w-full">
              Reload Page
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full">
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Initializing Dashboard...</p>
        </div>
      </div>
    );
  }

  // Show loading while checking wallet
  if (isConnecting || isPending || isFarcasterLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {isFarcasterLoading ? 'Adding to Farcaster...' : 'Connecting to wallet...'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {!miniKitReady ? 'Initializing MiniKit...' : 
             isFarcasterLoading ? 'Setting up mini app...' : 'Establishing connection...'}
          </p>
        </div>
      </div>
    );
  }

  // Show wallet connection prompt if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-950 dark:via-gray-900 dark:to-purple-950 p-4">
        <div className="text-center max-w-sm mx-auto">
          <img src="/paycrypt.png" alt="Paycrypt" className="h-20 w-20 mx-auto mb-6 rounded-2xl shadow-lg" />
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Connect Your Wallet</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Connect your wallet to access Paycrypt and start converting crypto to utilities.
          </p>
          
          <div className="flex justify-center flex-wrap gap-2 mb-6">
            {getClientBadge()}
            <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-xs dark:bg-green-900/30 dark:text-green-400">
              ⚡ Base Network
            </Badge>
          </div>

          {connectors.length > 0 ? (
            <Button 
              onClick={handleConnectWallet}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg mb-4 shadow-lg hover:shadow-xl transition-all"
            >
              <Wallet className="h-5 w-5 mr-2" />
              Connect via {connectors[0]?.name || 'Farcaster'}
            </Button>
          ) : (
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500 mb-2">No wallet connector available</p>
              <Badge variant="outline" className="text-red-700 border-red-300">
                Farcaster SDK Required
              </Badge>
            </div>
          )}

          {miniAppContext.isMiniApp ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <p>🔒 Secure connection via {miniAppContext.client}</p>
              <p>Running on Base network</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redirecting to home in a few seconds...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 pb-20 lg:pb-6">
        {/* Mobile Header Card - Balance Overview */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-semibold">Portfolio</h1>
              {getConnectionBadge()}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBalanceVisible(!balanceVisible)}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              {balanceVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <div className="text-xs text-blue-100 uppercase tracking-wide">Total Balance</div>
              {connectedWallet && (
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-blue-100 font-mono">
                    {formatAddress(connectedWallet.address)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyAddress}
                    className="h-5 w-5 p-0 text-blue-200 hover:text-white"
                  >
                    {copied ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex items-baseline space-x-2">
              <PortfolioOverview wallet={connectedWallet} />
            </div>
          </div>
          
          <div className="flex justify-center space-x-1 mt-4">
            {getClientBadge()}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Utilities</h2>
            <Button variant="ghost" size="sm" onClick={() => router.push('/convert')}>
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {utilityServices.map((service) => (
              <Button
                key={service.name}
                variant="ghost"
                className="h-auto p-4 flex flex-col items-center space-y-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-all"
                onClick={() => router.push(service.href)}
              >
                <div className={`p-3 rounded-xl bg-gradient-to-br ${service.gradient} text-white`}>
                  <service.icon className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                    {service.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {service.description}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Quick Actions Component */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
          </div>
          <QuickActions wallet={connectedWallet} />
        </div>

        {/* Market Data - Mobile Optimized */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Market Data</h3>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          <MarketData />
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
            <Button variant="ghost" size="sm" onClick={() => router.push('/history')}>
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <RecentTransactions wallet={connectedWallet} />
        </div>

        {/* Welcome Message */}
        {connectedWallet && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
            <h2 className="text-base font-semibold text-green-900 dark:text-green-100 mb-1">
              Welcome to Paycrypt! 🎉
            </h2>
            <p className="text-green-700 dark:text-green-200 text-sm">
              {connectionStatus === 'live' 
                ? `Your wallet is actively connected via ${miniAppContext.client}. All systems ready!`
                : `Connected via ${miniAppContext.client}. Your wallet is ready for secure transactions.`}
            </p>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-2 z-40">
        <div className="flex justify-around items-center">
          <Button variant="ghost" size="sm" className="flex flex-col items-center space-y-1 p-2" onClick={() => router.push('/')}>
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs">Dashboard</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex flex-col items-center space-y-1 p-2" onClick={() => router.push('/convert')}>
            <ArrowUpDown className="h-5 w-5" />
            <span className="text-xs">Convert</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex flex-col items-center space-y-1 p-2" onClick={() => router.push('/portfolio')}>
            <Wallet className="h-5 w-5" />
            <span className="text-xs">Portfolio</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex flex-col items-center space-y-1 p-2" onClick={() => router.push('/history')}>
            <History className="h-5 w-5" />
            <span className="text-xs">History</span>
          </Button>
        </div>
      </div>
    </MainLayout>
  )
}

// Export dynamic component with no SSR
const DashboardPage = dynamic(() => Promise.resolve(DashboardClient), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Setting up Dashboard...</p>
        <p className="text-sm text-gray-500 mt-2">Loading wallet connection...</p>
      </div>
    </div>
  )
});

export default DashboardPage;