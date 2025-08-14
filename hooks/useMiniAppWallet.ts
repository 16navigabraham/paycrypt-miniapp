// hooks/useMiniAppWallet.ts
'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';

// Simplified wallet interface using proper Wagmi hooks
export function useMiniAppWallet() {
  const { address, isConnected, isConnecting, chainId } = useAccount();
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { context } = useMiniKit();

  // Auto-connect to the first available connector (Farcaster Mini App connector)
  const connectWallet = () => {
    if (connectors.length > 0 && !isConnected) {
      connect({ connector: connectors[0] });
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    disconnect();
  };

  // Detect mini app context
  const getMiniAppContext = () => {
    if (typeof window === 'undefined') return { 
      isMiniApp: false, 
      isWeb: true, 
      client: 'web' 
    };
    
    const hasParent = window.parent && window.parent !== window;
    const referrer = document.referrer || '';
    const userAgent = window.navigator.userAgent || '';
    
    // Detect Base App specifically
    const isBaseApp = userAgent.includes('Base') || 
                      referrer.includes('base.org') || 
                      referrer.includes('coinbase');
    
    // Detect Farcaster clients
    const isFarcaster = userAgent.includes('Farcaster') || 
                        referrer.includes('farcaster') || 
                        referrer.includes('warpcast');
    
    return {
      isMiniApp: hasParent || isFarcaster || isBaseApp,
      isWeb: !hasParent && !isFarcaster && !isBaseApp,
      client: isBaseApp ? 'base' : isFarcaster ? 'farcaster' : 'web'
    };
  };

  return {
    // Wallet state
    address: address || null,
    isConnected,
    isLoading: isConnecting || isConnectPending,
    chainId: chainId?.toString() || '8453',
    
    // Actions
    connectWallet,
    disconnectWallet,
    
    // Context
    miniAppContext: getMiniAppContext(),
    farcasterContext: context,
    
    // Connectors info
    hasConnector: connectors.length > 0,
    connectorName: connectors[0]?.name || 'Unknown'
  };
}