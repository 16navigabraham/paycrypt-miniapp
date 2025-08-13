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

  // 🔧 Mount check
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // 🔧 CRITICAL: Call setFrameReady() when app is ready
  useEffect(() => {
    if (mounted && hooksLoaded && miniKitHook && setFrameReady && !isFrameReady) {
      console.log('Calling setFrameReady() - splash screen should dismiss');
      setFrameReady();
    }
  }, [mounted, hooksLoaded, miniKitHook, setFrameReady, isFrameReady]);

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
    }, 1000);

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
          (          connector: { name: string; id: string; }) => connector.name === 'Farcaster Wallet' || connector.id === 'farcaster'
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading MiniKit...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
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
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading Paycrypt...</p>
      </div>
    </div>
  )
});

export default HomePage;