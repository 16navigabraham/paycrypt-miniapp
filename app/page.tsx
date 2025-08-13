'use client';

import { useEffect, useState } from 'react';
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { LandingPage } from "@/components/landing/landing-page";

// 🔧 Client Component that loads hooks dynamically
function HomePageClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // 🔧 Dynamic Hook Loading State
  const [miniKitHook, setMiniKitHook] = useState<any>(null);
  const [wagmiHooks, setWagmiHooks] = useState<any>(null);
  const [hooksLoaded, setHooksLoaded] = useState(false);
  const [readyCalled, setReadyCalled] = useState(false);

  // 🔧 Mount check
  useEffect(() => {
    setMounted(true);
  }, []);

  // 🔧 IMMEDIATE ready call using multiple methods
  useEffect(() => {
    if (!mounted) return;

    // Method 1: Direct postMessage to parent
    const callReadyDirect = () => {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'ready' }, '*');
          window.parent.postMessage({ type: 'frame_ready' }, '*');
          window.parent.postMessage({ type: 'sdk_ready' }, '*');
          console.log('Direct ready messages sent to parent');
        }
      } catch (error) {
        console.warn('Direct ready call failed:', error);
      }
    };

    // Method 2: Try global SDK objects
    const callReadyGlobal = () => {
      try {
        // @ts-ignore
        if (window.sdk?.actions?.ready) {
          // @ts-ignore
          window.sdk.actions.ready();
          console.log('Global sdk.actions.ready() called');
        }
        // @ts-ignore
        if (window.farcasterSDK?.actions?.ready) {
          // @ts-ignore
          window.farcasterSDK.actions.ready();
          console.log('Global farcasterSDK.actions.ready() called');
        }
      } catch (error) {
        console.warn('Global ready call failed:', error);
      }
    };

    // Call immediately
    callReadyDirect();
    callReadyGlobal();

    // Retry after short delays
    setTimeout(callReadyDirect, 100);
    setTimeout(callReadyGlobal, 200);
    setTimeout(callReadyDirect, 500);
    setTimeout(callReadyGlobal, 1000);

  }, [mounted]);

  // 🔧 Load hooks dynamically only after mounting
  useEffect(() => {
    if (!mounted) return;

    async function loadHooks() {
      try {
        console.log('Loading MiniKit and wagmi hooks...');
        
        const [miniKitModule, wagmiModule] = await Promise.all([
          import('@coinbase/onchainkit/minikit'),
          import('wagmi')
        ]);

        console.log('Hooks loaded successfully');

        setMiniKitHook(miniKitModule);
        setWagmiHooks(wagmiModule);
        setHooksLoaded(true);
      } catch (error) {
        console.error('Failed to load hooks:', error);
        setHooksLoaded(true); // Still set to true to prevent infinite loading
      }
    }

    loadHooks();
  }, [mounted]);

  // 🔧 Only call hooks after they're loaded and we're mounted
  const miniKitData = (mounted && hooksLoaded && miniKitHook?.useMiniKit) ? 
    miniKitHook.useMiniKit() : 
    { 
      setFrameReady: () => {}, 
      isFrameReady: false, 
      context: null 
    };

  const accountData = (mounted && hooksLoaded && wagmiHooks?.useAccount) ? 
    wagmiHooks.useAccount() : 
    { 
      address: null, 
      isConnected: false 
    };

  const connectData = (mounted && hooksLoaded && wagmiHooks?.useConnect) ? 
    wagmiHooks.useConnect() : 
    { 
      connect: () => {}, 
      connectors: [] 
    };

  const { setFrameReady, isFrameReady, context } = miniKitData;
  const { address, isConnected } = accountData;
  const { connect, connectors } = connectData;

  // 🔧 MiniKit ready call with multiple attempts
  useEffect(() => {
    if (mounted && hooksLoaded && miniKitHook && setFrameReady && !readyCalled) {
      console.log('Attempting MiniKit setFrameReady() call...');
      
      const attemptReady = () => {
        try {
          setFrameReady();
          setReadyCalled(true);
          console.log('✅ MiniKit setFrameReady() called successfully');
        } catch (error) {
          console.error('❌ setFrameReady() failed:', error);
        }
      };

      // Multiple attempts
      attemptReady();
      setTimeout(attemptReady, 100);
      setTimeout(attemptReady, 500);
      setTimeout(attemptReady, 1000);
    }
  }, [mounted, hooksLoaded, miniKitHook, setFrameReady, readyCalled]);

  // 🔧 Additional ready call when frame is ready
  useEffect(() => {
    if (isFrameReady && !readyCalled) {
      console.log('Frame became ready, ensuring ready call...');
      try {
        setFrameReady();
        setReadyCalled(true);
      } catch (error) {
        console.error('Frame ready call failed:', error);
      }
    }
  }, [isFrameReady, setFrameReady, readyCalled]);

  // Check for existing wallet connection
  useEffect(() => {
    if (!mounted || !hooksLoaded) return;

    const checkAuthentication = async () => {
      try {
        // Check if wallet is already connected
        if (isConnected && address) {
          // Store wallet data for the session
          localStorage.setItem('paycrypt_wallet_address', address);
          
          // If we have Farcaster context, store it too (for display purposes only)
          if (context?.user) {
            localStorage.setItem('paycrypt_fid', context.user.fid?.toString() || '');
            localStorage.setItem('paycrypt_username', context.user.username || '');
            localStorage.setItem('paycrypt_display_name', context.user.displayName || '');
            localStorage.setItem('paycrypt_pfp', context.user.pfpUrl || '');
          }
          
          // Redirect to dashboard
          router.replace("/dashboard");
          return;
        }

        // Check if user was previously authenticated
        const storedWallet = localStorage.getItem('paycrypt_wallet_address');
        if (storedWallet && isConnected) {
          router.replace("/dashboard");
          return;
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsLoading(false);
      }
    };

    // Wait a moment for frame to be ready, then check authentication
    const timer = setTimeout(() => {
      checkAuthentication();
    }, 1500);

    return () => clearTimeout(timer);
  }, [mounted, hooksLoaded, isConnected, address, context, router]);

  const handleWalletAuth = async () => {
    if (!mounted || !hooksLoaded || !wagmiHooks) {
      console.error('Hooks not loaded yet');
      return;
    }

    try {
      console.log('Initiating wallet authentication...');
      setIsLoading(true);
      
      if (isConnected && address) {
        // Already connected, just proceed
        handleAuthSuccess();
      } else {
        // Need to connect wallet
        const farcasterConnector = connectors.find(
          (connector: any) => connector.name === 'Farcaster Wallet' || connector.id === 'farcaster'
        );
        
        if (farcasterConnector) {
          // Use Farcaster wallet connector (preferred in Base App)
          connect({ connector: farcasterConnector });
        } else {
          // Fallback to first available connector
          connect({ connector: connectors[0] });
        }
      }
      
    } catch (error) {
      console.error('Error during wallet authentication:', error);
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    console.log('Wallet authentication successful');
    
    if (address) {
      // Store wallet address as primary authentication
      localStorage.setItem('paycrypt_wallet_address', address);
      
      // Store Farcaster context if available (for UI display only)
      if (context?.user) {
        localStorage.setItem('paycrypt_fid', context.user.fid?.toString() || '');
        localStorage.setItem('paycrypt_username', context.user.username || '');
        localStorage.setItem('paycrypt_display_name', context.user.displayName || '');
        localStorage.setItem('paycrypt_pfp', context.user.pfpUrl || '');
      }
      
      setIsLoading(false);
      router.push("/dashboard");
    }
  };

  // Handle successful wallet connection
  useEffect(() => {
    if (mounted && hooksLoaded && isConnected && address && !localStorage.getItem('paycrypt_wallet_address')) {
      handleAuthSuccess();
    }
  }, [mounted, hooksLoaded, isConnected, address]);

  // Show loading while hooks are loading
  if (!mounted || !hooksLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <img src="/paycrypt.png" alt="Paycrypt" className="h-16 w-16 mx-auto mb-4 rounded-lg shadow-lg" />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading Paycrypt...</p>
          <p className="text-sm text-gray-500 mt-2">Initializing MiniKit</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <img src="/paycrypt.png" alt="Paycrypt" className="h-16 w-16 mx-auto mb-4 rounded-lg shadow-lg" />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">
            {isConnected ? 'Setting up your account...' : 'Connect your wallet to continue...'}
          </p>
        </div>
      </div>
    );
  }

  return <LandingPage onGetStarted={handleWalletAuth} />;
}

// 🔧 Export with dynamic loading to prevent SSR
const HomePage = dynamic(() => Promise.resolve(HomePageClient), {
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

export default HomePage;