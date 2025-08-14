'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { MiniKitProvider } from '@coinbase/onchainkit/minikit';

// Create wagmi config with Farcaster Mini App connector
const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    miniAppConnector(), // This handles both Farcaster and Base App automatically
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: false, // Important for mini apps
});

// Create query client outside component to prevent recreation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 3,
      refetchOnWindowFocus: false, // Important for mini apps
    },
  },
});

export function ClientProviders({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // Only render providers after mounting to prevent SSR issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading state until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <img src="/paycrypt.png" alt="Paycrypt" className="h-16 w-16 mx-auto mb-4 rounded-lg shadow-lg" />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Initializing Paycrypt...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <OnchainKitProvider
          apiKey={undefined} // Bypassing API key requirement
          chain={base}
          config={{
            appearance: {
              name: 'Paycrypt',
              logo: '/paycrypt.png',
              mode: 'auto',
              theme: 'default',
            },
            wallet: {
              display: 'modal',
            },
          }}
        >
          <MiniKitProvider
            apiKey={undefined} // Bypassing API key requirement
            chain={base}
          >
            {children}
          </MiniKitProvider>
        </OnchainKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}