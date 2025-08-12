"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { LandingPage } from "@/components/landing/landing-page";

// 🔧 Client Component with Dynamic Wagmi Hooks
function HomePageClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // 🔧 Dynamic Hook Loading
  const [miniKitHook, setMiniKitHook] = useState<any>(null);
  const [wagmiHooks, setWagmiHooks] = useState<any>(null);
  const [hooksLoading, setHooksLoading] = useState(true);

  // Load hooks dynamically
  useEffect(() => {
    async function loadHooks() {
      try {
        const [miniKitModule, wagmiModule] = await Promise.all([
          import('@coinbase/onchainkit/minikit'),
          import('wagmi')
        ]);

        setMiniKitHook({
          useMiniKit: miniKitModule.useMiniKit
        });

        setWagmiHooks({
          useAccount: wagmiModule.useAccount,
          useConnect: wagmiModule.useConnect,
        });

        setHooksLoading(false);
      } catch (error) {
        console.error('Failed to load hooks:', error);
        setHooksLoading(false);
      }
    }

    loadHooks();
  }, []);

  // 🔧 Conditional Hook Usage - Only call hooks after they're loaded
  const miniKitData = miniKitHook?.useMiniKit?.() || { 
    setFrameReady: () => {}, 
    isFrameReady: false, 
    context: null 
  };
  
  const accountData = wagmiHooks?.useAccount?.() || { 
    address: null, 
    isConnected: false 
  };
  
  const connectData = wagmiHooks?.useConnect?.() || { 
    connect: () => {}, 
    connectors: [] 
  };

  const { setFrameReady, isFrameReady, context } = miniKitData;
  const { address, isConnected } = accountData;
  const { connect, connectors } = connectData;

  // Initialize MiniKit frame
  useEffect(() => {
    if (!hooksLoading && miniKitHook && !isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady, hooksLoading, miniKitHook]);

  // Check for existing wallet connection
  useEffect(() => {
    if (hooksLoading || !wagmiHooks) return;

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

    if (isFrameReady) {
      checkAuthentication();
    }
  }, [isFrameReady, isConnected, address, context, router, hooksLoading, wagmiHooks]);

  const handleWalletAuth = async () => {
    if (!wagmiHooks) {
      console.error('Wallet functionality not loaded yet');
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
    if (!hooksLoading && wagmiHooks && isConnected && address && !localStorage.getItem('paycrypt_wallet_address')) {
      handleAuthSuccess();
    }
  }, [isConnected, address, hooksLoading, wagmiHooks]);

  // 🔧 Show loading state while hooks are loading
  if (hooksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading wallet functionality...</p>
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

// 🔧 Main component with dynamic loading to prevent SSR issues
const HomePage = dynamic(() => Promise.resolve(HomePageClient), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading application...</p>
      </div>
    </div>
  )
});

export default HomePage;