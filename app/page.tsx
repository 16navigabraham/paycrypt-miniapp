'use client';

import { useEffect, useState } from 'react';
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// 🔧 Client Component that handles both Farcaster MiniApp and regular web app
function HomePageClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // 🔧 SDK Loading State
  const [farcasterSDK, setFarcasterSDK] = useState<any>(null);
  const [wagmiHooks, setWagmiHooks] = useState<any>(null);
  const [sdkLoaded, setSDKLoaded] = useState(false);
  const [readyCalled, setReadyCalled] = useState(false);

  // 🔧 App flow state
  const [dashboardReady, setDashboardReady] = useState(false);
  const [isMiniApp, setIsMiniApp] = useState(false);

  // 🔧 Mount check
  useEffect(() => {
    setMounted(true);
    
    // Check if we're in a MiniApp environment
    const checkMiniApp = () => {
      // Check for parent window (iframe indicator)
      const hasParent = window.parent && window.parent !== window;
      // Check for Farcaster-specific indicators
      const hasFarcasterContext = window.location.href.includes('farcaster') || 
                                 document.referrer.includes('farcaster') ||
                                 window.navigator.userAgent.includes('Farcaster');
      
      const miniAppDetected = hasParent || hasFarcasterContext;
      setIsMiniApp(miniAppDetected);
      console.log('🔍 MiniApp detected:', miniAppDetected);
      return miniAppDetected;
    };

    checkMiniApp();
  }, []);

  // 🔧 Load SDKs dynamically based on environment
  useEffect(() => {
    if (!mounted) return;

    async function loadSDKs() {
      try {
        console.log('📦 Loading SDKs...');
        
        // Always load wagmi for wallet functionality
        const wagmiModule = await import('wagmi');
        setWagmiHooks(wagmiModule);

        // Load Farcaster MiniApp SDK if in MiniApp environment
        if (isMiniApp) {
          try {
            // Try to load Farcaster MiniApp SDK
            const farcasterModule = await import('@farcaster/miniapp-sdk');
            setFarcasterSDK(farcasterModule);
            console.log('✅ Farcaster MiniApp SDK loaded');
          } catch (error) {
            console.warn('⚠️ Farcaster MiniApp SDK not available, falling back to manual ready calls');
            // Fallback for manual ready calls
            setFarcasterSDK({ sdk: null });
          }
        }

        setSDKLoaded(true);
        console.log('✅ SDKs loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load SDKs:', error);
        setSDKLoaded(true); // Still set to true to prevent infinite loading
      }
    }

    loadSDKs();
  }, [mounted, isMiniApp]);

  // 🔧 Handle ready calls for MiniApp
  useEffect(() => {
    if (!mounted || !sdkLoaded || readyCalled) return;

    const callReady = async () => {
      if (!isMiniApp) {
        // Not a MiniApp, proceed directly
        setReadyCalled(true);
        setDashboardReady(true);
        return;
      }

      console.log('🎯 Calling ready for MiniApp...');

      try {
        // Method 1: Use Farcaster MiniApp SDK if available
        if (farcasterSDK?.sdk) {
          await farcasterSDK.sdk.actions.ready();
          console.log('✅ Farcaster SDK ready() called successfully');
          setReadyCalled(true);
          return;
        }

        // Method 2: Fallback to manual postMessage calls
        if (window.parent && window.parent !== window) {
          const readyMessages = [
            { type: 'ready' },
            { type: 'frame_ready' },
            { type: 'sdk_ready' },
            { type: 'miniapp_ready' },
            { action: 'ready' },
            { event: 'ready' }
          ];

          readyMessages.forEach(message => {
            try {
              window.parent.postMessage(message, '*');
              console.log('📤 Sent ready message:', message);
            } catch (error) {
              console.warn('⚠️ Failed to send message:', message, error);
            }
          });

          // Also try global SDK objects
          const globalReadyAttempts = [
            () => (window as any).sdk?.actions?.ready?.(),
            () => (window as any).farcasterSDK?.actions?.ready?.(),
            () => (window as any).miniAppSDK?.actions?.ready?.(),
            () => (window as any).parent?.postMessage?.({ type: 'ready' }, '*')
          ];

          globalReadyAttempts.forEach((attempt, index) => {
            try {
              attempt();
              console.log(`📤 Global ready attempt ${index + 1} executed`);
            } catch (error) {
              console.warn(`⚠️ Global ready attempt ${index + 1} failed:`, error);
            }
          });
        }

        setReadyCalled(true);
        console.log('✅ Ready calls completed');
      } catch (error) {
        console.error('❌ Ready call failed:', error);
        setReadyCalled(true); // Still set to prevent infinite loop
      }
    };

    // Call ready immediately and with retries
    callReady();
    
    // Retry after delays
    const retryTimeouts = [100, 300, 500, 1000];
    retryTimeouts.forEach(delay => {
      setTimeout(callReady, delay);
    });

  }, [mounted, sdkLoaded, isMiniApp, farcasterSDK, readyCalled]);

  // 🔧 Use wagmi hooks safely
  const accountData = (mounted && sdkLoaded && wagmiHooks?.useAccount) ? 
    wagmiHooks.useAccount() : 
    { address: null, isConnected: false };

  const { address, isConnected } = accountData;

  // 🔧 Handle wallet connection and user data
  useEffect(() => {
    if (!mounted || !sdkLoaded) return;

    const setupWalletAndProceed = async () => {
      try {
        console.log('🔗 Setting up wallet connection...');
        
        // Check if wallet is already connected
        if (isConnected && address) {
          console.log('✅ Wallet connected:', address);
          localStorage.setItem('paycrypt_wallet_address', address);
          
          // For MiniApp, try to get Farcaster context
          if (isMiniApp && farcasterSDK?.sdk) {
            try {
              const context = await farcasterSDK.sdk.context;
              if (context?.user) {
                localStorage.setItem('paycrypt_fid', context.user.fid?.toString() || '');
                localStorage.setItem('paycrypt_username', context.user.username || '');
                localStorage.setItem('paycrypt_display_name', context.user.displayName || '');
                localStorage.setItem('paycrypt_pfp', context.user.pfpUrl || '');
                console.log('📱 Farcaster context stored:', context.user);
              }
            } catch (error) {
              console.warn('⚠️ Failed to get Farcaster context:', error);
            }
          }
          
          setDashboardReady(true);
          return;
        }

        // For MiniApp without active wallet connection, still proceed after delay
        if (isMiniApp && readyCalled) {
          setTimeout(() => {
            console.log('⏰ MiniApp proceeding to dashboard without active wallet');
            setDashboardReady(true);
          }, 2000);
        } else if (!isMiniApp) {
          // Regular web app - redirect to connect wallet
          setTimeout(() => {
            console.log('🌐 Regular web app - need wallet connection');
            setDashboardReady(true);
          }, 1000);
        }
        
      } catch (error) {
        console.error('❌ Error setting up wallet:', error);
        setTimeout(() => setDashboardReady(true), 1000);
      }
    };

    if (readyCalled || !isMiniApp) {
      const timer = setTimeout(setupWalletAndProceed, 300);
      return () => clearTimeout(timer);
    }
  }, [mounted, sdkLoaded, readyCalled, isConnected, address, isMiniApp, farcasterSDK]);

  // 🔧 Handle wallet connection changes
  useEffect(() => {
    if (mounted && sdkLoaded && isConnected && address) {
      console.log('🔄 Wallet connection detected:', address);
      localStorage.setItem('paycrypt_wallet_address', address);
      
      if (!dashboardReady) {
        setDashboardReady(true);
      }
    }
  }, [mounted, sdkLoaded, isConnected, address, dashboardReady]);

  // 🔧 Redirect to dashboard when ready
  useEffect(() => {
    if (dashboardReady && mounted) {
      console.log('🚀 Redirecting to dashboard...');
      router.replace("/dashboard");
    }
  }, [dashboardReady, mounted, router]);

  // 🔧 Get loading message based on state
  const getLoadingMessage = () => {
    if (!mounted) return 'Initializing...';
    if (!sdkLoaded) return isMiniApp ? 'Loading MiniApp SDK...' : 'Loading app...';
    if (isMiniApp && !readyCalled) return 'Calling MiniApp ready...';
    if (!dashboardReady) return 'Setting up wallet...';
    return 'Opening dashboard...';
  };

  // 🔧 Show loading until dashboard is ready
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <img src="/paycrypt.png" alt="Paycrypt" className="h-16 w-16 mx-auto mb-4 rounded-lg shadow-lg" />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">
          {isMiniApp ? 'Connecting to Paycrypt MiniApp...' : 'Connecting to Paycrypt...'}
        </p>
        <p className="text-sm text-gray-500 mt-2">{getLoadingMessage()}</p>
        {isMiniApp && (
          <p className="text-xs text-blue-600 mt-2">🔗 MiniApp Mode Detected</p>
        )}
      </div>
    </div>
  );
}

// 🔧 Export with dynamic loading to prevent SSR
export default dynamic(() => Promise.resolve(HomePageClient), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <img src="/paycrypt.png" alt="Paycrypt" className="h-16 w-16 mx-auto mb-4 rounded-lg shadow-lg" />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Loading Paycrypt...</p>
      </div>
    </div>
  )
});