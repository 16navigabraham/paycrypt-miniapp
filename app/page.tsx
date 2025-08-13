'use client';

import { useEffect, useState } from 'react';
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// 🔧 Client Component that handles mini app direct flow
function HomePageClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // 🔧 Dynamic Hook Loading State
  const [miniKitHook, setMiniKitHook] = useState<any>(null);
  const [wagmiHooks, setWagmiHooks] = useState<any>(null);
  const [hooksLoaded, setHooksLoaded] = useState(false);
  const [readyCalled, setReadyCalled] = useState(false);

  // 🔧 Mini app flow state - directly proceed to dashboard
  const [dashboardReady, setDashboardReady] = useState(false);

  // 🔧 Mount check
  useEffect(() => {
    setMounted(true);
  }, []);

  // 🔧 IMMEDIATE ready call using multiple methods
  useEffect(() => {
    if (!mounted) return;

    console.log('🚀 Starting immediate ready calls for mini app...');

    // Method 1: Direct postMessage to parent
    const callReadyDirect = () => {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'ready' }, '*');
          window.parent.postMessage({ type: 'frame_ready' }, '*');
          window.parent.postMessage({ type: 'sdk_ready' }, '*');
          console.log('📤 Direct ready messages sent to parent');
        }
      } catch (error) {
        console.warn('⚠️ Direct ready call failed:', error);
      }
    };

    // Method 2: Try global SDK objects
    const callReadyGlobal = () => {
      try {
        // @ts-ignore
        if (window.sdk?.actions?.ready) {
          // @ts-ignore
          window.sdk.actions.ready();
          console.log('📤 Global sdk.actions.ready() called');
        }
        // @ts-ignore
        if (window.farcasterSDK?.actions?.ready) {
          // @ts-ignore
          window.farcasterSDK.actions.ready();
          console.log('📤 Global farcasterSDK.actions.ready() called');
        }
      } catch (error) {
        console.warn('⚠️ Global ready call failed:', error);
      }
    };

    // Call immediately
    callReadyDirect();
    callReadyGlobal();

    // Retry after short delays
    setTimeout(() => {
      callReadyDirect();
      callReadyGlobal();
    }, 100);
    
    setTimeout(() => {
      callReadyDirect();
      callReadyGlobal();
    }, 500);

  }, [mounted]);

  // 🔧 Load hooks dynamically only after mounting
  useEffect(() => {
    if (!mounted) return;

    async function loadHooks() {
      try {
        console.log('📦 Loading MiniKit and wagmi hooks...');
        
        const [miniKitModule, wagmiModule] = await Promise.all([
          import('@coinbase/onchainkit/minikit'),
          import('wagmi')
        ]);

        console.log('✅ Hooks loaded successfully');

        setMiniKitHook(miniKitModule);
        setWagmiHooks(wagmiModule);
        setHooksLoaded(true);
      } catch (error) {
        console.error('❌ Failed to load hooks:', error);
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

  const { setFrameReady, isFrameReady, context } = miniKitData;
  const { address, isConnected } = accountData;

  // 🔧 MiniKit ready call with multiple attempts
  useEffect(() => {
    if (mounted && hooksLoaded && miniKitHook && setFrameReady && !readyCalled) {
      console.log('🎯 Attempting MiniKit setFrameReady() call...');
      
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
    }
  }, [mounted, hooksLoaded, miniKitHook, setFrameReady, readyCalled]);

  // 🔧 Auto setup wallet connection and proceed to dashboard
  useEffect(() => {
    if (!mounted || !hooksLoaded) return;

    const setupWalletAndProceed = async () => {
      try {
        console.log('🔗 Setting up wallet connection for mini app...');
        
        // Check if wallet is already connected
        if (isConnected && address) {
          console.log('✅ Wallet already connected:', address);
          // Store wallet data immediately
          localStorage.setItem('paycrypt_wallet_address', address);
          
          // Store Farcaster context if available
          if (context?.user) {
            localStorage.setItem('paycrypt_fid', context.user.fid?.toString() || '');
            localStorage.setItem('paycrypt_username', context.user.username || '');
            localStorage.setItem('paycrypt_display_name', context.user.displayName || '');
            localStorage.setItem('paycrypt_pfp', context.user.pfpUrl || '');
            console.log('📱 Farcaster context stored:', context.user);
          }
          
          setDashboardReady(true);
          return;
        }

        // If we have Farcaster context but no wallet yet, still prepare for connection
        if (context?.user && !address) {
          console.log('📱 Farcaster context available, preparing wallet connection...');
          localStorage.setItem('paycrypt_fid', context.user.fid?.toString() || '');
          localStorage.setItem('paycrypt_username', context.user.username || '');
          localStorage.setItem('paycrypt_display_name', context.user.displayName || '');
          localStorage.setItem('paycrypt_pfp', context.user.pfpUrl || '');
        }

        // For mini app, assume connection will happen automatically
        // Set a fallback timer to proceed to dashboard
        setTimeout(() => {
          if (!dashboardReady) {
            console.log('⏰ Proceeding to dashboard (mini app auto-flow)');
            setDashboardReady(true);
          }
        }, 2000);
        
      } catch (error) {
        console.error('❌ Error setting up wallet:', error);
        // Still proceed to dashboard even if setup fails
        setTimeout(() => setDashboardReady(true), 1000);
      }
    };

    // Start setup after hooks are loaded and ready is called
    if (readyCalled || hooksLoaded) {
      const timer = setTimeout(setupWalletAndProceed, 500);
      return () => clearTimeout(timer);
    }
  }, [mounted, hooksLoaded, readyCalled, isConnected, address, context, dashboardReady]);

  // 🔧 Handle wallet connection changes
  useEffect(() => {
    if (mounted && hooksLoaded && isConnected && address) {
      console.log('🔄 Wallet connection detected:', address);
      localStorage.setItem('paycrypt_wallet_address', address);
      
      if (context?.user) {
        localStorage.setItem('paycrypt_fid', context.user.fid?.toString() || '');
        localStorage.setItem('paycrypt_username', context.user.username || '');
        localStorage.setItem('paycrypt_display_name', context.user.displayName || '');
        localStorage.setItem('paycrypt_pfp', context.user.pfpUrl || '');
      }
      
      if (!dashboardReady) {
        setDashboardReady(true);
      }
    }
  }, [mounted, hooksLoaded, isConnected, address, context, dashboardReady]);

  // 🔧 Redirect to dashboard when ready
  useEffect(() => {
    if (dashboardReady && mounted) {
      console.log('🚀 Redirecting to dashboard...');
      router.replace("/dashboard");
    }
  }, [dashboardReady, mounted, router]);

  // 🔧 Show loading until dashboard is ready
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <img src="/paycrypt.png" alt="Paycrypt" className="h-16 w-16 mx-auto mb-4 rounded-lg shadow-lg" />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Connecting to Paycrypt...</p>
        <p className="text-sm text-gray-500 mt-2">
          {!mounted ? 'Initializing...' : 
           !hooksLoaded ? 'Loading MiniKit...' : 
           !readyCalled ? 'Calling ready...' : 
           !dashboardReady ? 'Setting up wallet...' : 'Opening dashboard...'}
        </p>
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