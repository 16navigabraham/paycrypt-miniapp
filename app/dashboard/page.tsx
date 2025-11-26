"use client";

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import dynamic from 'next/dynamic'
import { useFarcasterMiniApp } from '@/hooks/useFarcasterMiniApp';
import { useMiniKit } from '@coinbase/onchainkit/minikit'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Sidebar } from "@/components/layout/sidebar"
import { PortfolioOverview } from "@/components/dashboard/portfolio-overview"
import { QuickActions } from "@/components/dashboard/quick-actions"
import RecentTransactions from "@/components/dashboard/recent-transactions"
import { MarketData } from "@/components/dashboard/market-data"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  History,
  Plus,
  X,
  Menu
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Link from 'next/link'
import Image from 'next/image'
import sdk from "@farcaster/miniapp-sdk";

interface WalletData {
  address: string;
  chainId: string;
  connectedAt: string;
}

// Mini App Add Component
function MiniAppPrompt() {
  const [showModal, setShowModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addStatus, setAddStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [shouldShow, setShouldShow] = useState(false);

  // Check if app should prompt user to add mini app
  useEffect(() => {
    const checkShouldPrompt = async () => {
      try {
        // Only check when dashboard is ready and connected
        if (typeof window === 'undefined') return;

        // Check if running in Farcaster context
        const context = await sdk.context;
        if (!context) {
          setShouldShow(false);
          return;
        }

        // Check if already added (you can store this in localStorage if needed)
        const isAlreadyAdded = sessionStorage.getItem('paycrypt_mini_app_added') === 'true';
        if (isAlreadyAdded) {
          setShouldShow(false);
          return;
        }

        // Show prompt if in Farcaster but not added yet
        setShouldShow(true);
      } catch (error) {
        console.log('Not in Farcaster context or SDK not available');
        setShouldShow(false);
      }
    };

    // Delay check to ensure dashboard is fully ready
    const timer = setTimeout(checkShouldPrompt, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleAddMiniApp = async () => {
    setIsAdding(true);
    setAddStatus('idle');
    setErrorMessage('');

    try {
      // Check if running in Farcaster context first
      const context = await sdk.context;
      if (!context) {
        throw new Error('Not running in Farcaster Mini App context');
      }
      
      await sdk.actions.addMiniApp();
      setAddStatus('success');
      // Mark as added so we don't prompt again
      sessionStorage.setItem('paycrypt_mini_app_added', 'true');
      console.log('Mini app added successfully!');
      
      // Auto-close modal after success
      setTimeout(() => {
        setShowModal(false);
        setShouldShow(false);
      }, 2000);
    } catch (error: any) {
      setAddStatus('error');
      console.error('Failed to add mini app:', error);
      
      // Handle specific error types
      if (error.name === 'RejectedByUser') {
        setErrorMessage('You rejected the request to add this app.');
        // Mark as rejected so we don't keep prompting
        sessionStorage.setItem('paycrypt_mini_app_rejected', 'true');
      } else if (error.name === 'InvalidDomainManifestJson') {
        setErrorMessage('Invalid domain or manifest configuration. Make sure you\'re on the production domain.');
      } else if (error.message?.includes('Not running in Farcaster')) {
        setErrorMessage('This feature only works when accessed through Farcaster.');
      } else {
        setErrorMessage(error.message || 'Failed to add mini app. Please try again.');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleDismiss = () => {
    setShouldShow(false);
    // Mark as dismissed for this session
    sessionStorage.setItem('paycrypt_mini_app_dismissed', 'true');
  };

  const handleOpenModal = () => {
    setShowModal(true);
    setAddStatus('idle');
    setErrorMessage('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Don't show if not needed
  if (!shouldShow) return null;

  return (
    <>
      {/* Compact Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                Add to Farcaster Apps
              </h3>
              <p className="text-xs text-purple-700 dark:text-purple-200">
                Quick access from your feed
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleOpenModal}
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Overlay */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="w-[90vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 flex items-center justify-center">
                <Smartphone className="h-4 w-4 text-white" />
              </div>
              <span>Add to Farcaster Apps</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Add PayCrypt to your Farcaster apps for quick access to pay bills with crypto directly from your feed.
            </p>
            
            {addStatus === 'success' && (
              <Alert className="border-green-200 bg-green-50 text-green-800 dark:bg-green-950/30 dark:border-green-700 dark:text-green-200">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  App added successfully! You can now find PayCrypt in your Farcaster apps. This dialog will close automatically.
                </AlertDescription>
              </Alert>
            )}
            
            {addStatus === 'error' && (
              <Alert className="border-red-200 bg-red-50 text-red-800 dark:bg-red-950/30 dark:border-red-700 dark:text-red-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            
            <div className="flex space-x-3">
              <Button
                onClick={handleAddMiniApp}
                disabled={isAdding || addStatus === 'success'}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 flex-1"
              >
                {isAdding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : addStatus === 'success' ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Added to Apps
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Apps
                  </>
                )}
              </Button>
              
              {addStatus !== 'success' && (
                <Button
                  variant="outline"
                  onClick={handleCloseModal}
                  className="text-purple-600 border-purple-300 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-600 dark:hover:bg-purple-950/30"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Mobile-First Dashboard Component
function DashboardClient() {
  const router = useRouter();
  const [miniKitReady, setMiniKitReady] = useState(false);
  const [miniKitError, setMiniKitError] = useState<string | null>(null);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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
    <div className="min-h-screen bg-[#f6f8ff]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="max-w-md mx-auto py-0 space-y-0">
        {/* Mini App Add Prompt */}
        {!miniAppContext.isMiniApp && <MiniAppPrompt />}

        {/* Main Dashboard Card (Figma node 90-162) */}
        <div className="relative rounded-[40px] overflow-hidden border-2 border-[#d4ff16] shadow-lg p-0 mt-0">
          {/* Figma grid overlay (local) */}
          <img src="/figma-grid.svg" alt="grid overlay" className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{opacity: 0.10}} />
          {/* Decorative circles */}
          <div className="absolute left-[-40px] top-[-40px] w-[120px] h-[120px] bg-[#d4ff16] opacity-10 rounded-full z-0"></div>
          <div className="absolute right-[-30px] top-[-30px] w-[80px] h-[80px] bg-[#1437ff] opacity-10 rounded-full z-0"></div>
          <div className="absolute right-[-50px] bottom-[-50px] w-[120px] h-[120px] bg-[#d4ff16] opacity-10 rounded-full z-0"></div>
          <div className="relative z-10 p-5">
            <div className="flex justify-end mb-2">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="rounded-full bg-[#d4ff16] text-black shadow">
                <Menu className="h-6 w-6" />
              </Button>
            </div>
            <div className="flex flex-col items-center py-2">
              <span className="text-xs text-gray-500 mb-1">Available Balance</span>
              <div className="flex items-center gap-2">
                {balanceVisible ? (
                  <PortfolioOverview wallet={connectedWallet} />
                ) : (
                  <span className="text-4xl font-bold">••••••</span>
                )}
                <Button variant="ghost" size="sm" onClick={() => setBalanceVisible(!balanceVisible)} className="rounded-full bg-gray-100 text-black">
                  {balanceVisible ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </Button>
              </div>
              {connectedWallet && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400 font-mono">{formatAddress(connectedWallet.address)}</span>
                  <Button variant="ghost" size="sm" onClick={copyAddress} className="rounded-full bg-gray-100 text-black">
                    {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Sheet (white rounded panel overlapping the header - matches Figma) */}
        <div className="relative bg-white rounded-[24px] -mt-8 pt-3 pb-5 px-3 shadow-lg z-20 border border-gray-50">
          {/* subtle top handle (visual) */}
          <div className="absolute left-1/2 -top-2 transform -translate-x-1/2 w-8 h-1 rounded-full bg-gray-200"></div>

          <div className="space-y-3">
            {/* Quick action buttons (3-column grid like Figma) */}
            <QuickActions wallet={connectedWallet} />

            {/* Convert CTA */}
            <div className="mt-1">
              <Link href={connectedWallet ? `/convert?wallet=${connectedWallet.address}` : '/convert'} className="block w-full">
                <div className="w-full rounded-2xl border-2 border-[#d4ff16] px-4 py-3 flex items-center justify-between shadow-md">
                  <span className="text-sm font-semibold text-[#1437ff]">Convert Cryptocurrency to Fiat</span>
                  <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-[#1437ff] text-white overflow-hidden">
                    <Image src="/convert crypto.png" alt="convert" width={18} height={18} className="object-contain" />
                  </div>
                </div>
              </Link>
            </div>

            {/* Recent transactions list */}
            <div>
              <RecentTransactions wallet={connectedWallet} />
            </div>
          </div>
        </div>

      </div>
    </div>
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