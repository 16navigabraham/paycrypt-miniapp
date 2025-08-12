"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useAccount, useConnect } from 'wagmi';
import { LandingPage } from "@/components/landing/landing-page";

export default function HomePage() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Initialize MiniKit frame
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Check for existing wallet connection
  useEffect(() => {
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
  }, [isFrameReady, isConnected, address, context, router]);

  const handleWalletAuth = async () => {
    try {
      console.log('Initiating wallet authentication...');
      setIsLoading(true);
      
      if (isConnected && address) {
        // Already connected, just proceed
        handleAuthSuccess();
      } else {
        // Need to connect wallet
        const farcasterConnector = connectors.find(
          connector => connector.name === 'Farcaster Wallet' || connector.id === 'farcaster'
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
    if (isConnected && address && !localStorage.getItem('paycrypt_wallet_address')) {
      handleAuthSuccess();
    }
  }, [isConnected, address]);

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