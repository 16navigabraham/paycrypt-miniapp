// hooks/useMiniAppWallet.ts
'use client';

import { useAccount, useConnect, useDisconnect, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { base } from 'wagmi/chains';
import { parseEther, type Address, type Hash } from 'viem';
import { useCallback, useEffect } from 'react';

// Base chain ID
const BASE_CHAIN_ID = 8453;

interface SendTransactionParams {
  to: Address;
  value?: string | bigint;
  data?: `0x${string}`;
  gas?: bigint;
  gasPrice?: bigint;
}

interface TransactionResult {
  hash?: Hash;
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
}

// Simplified wallet interface using proper Wagmi hooks
export function useMiniAppWallet() {
  const { address, isConnected, isConnecting, chainId } = useAccount();
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { context } = useMiniKit();
  
  // Transaction hooks
  const { 
    sendTransaction: wagmiSendTransaction, 
    data: transactionHash,
    isPending: isSendingTransaction,
    isError: isSendTransactionError,
    error: sendTransactionError,
    reset: resetSendTransaction
  } = useSendTransaction();

  // Auto-connect to the first available connector (Farcaster Mini App connector)
  const connectWallet = useCallback(() => {
    if (connectors.length > 0 && !isConnected) {
      connect({ connector: connectors[0] });
    }
  }, [connectors, isConnected, connect]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    disconnect();
  }, [disconnect]);

  // Ensure we're on Base chain
  const ensureBaseChain = useCallback(async (): Promise<boolean> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    if (chainId !== BASE_CHAIN_ID) {
      try {
        // switchChain returns void, so we need to handle it differently
        switchChain({ chainId: BASE_CHAIN_ID });
        // Give it a moment to switch
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      } catch (error) {
        console.error('Failed to switch to Base chain:', error);
        throw new Error('Please switch to Base chain to continue');
      }
    }
    return true;
  }, [chainId, isConnected, switchChain]);

  // Send transaction function with Base chain enforcement
  const sendTransaction = useCallback(async (params: SendTransactionParams): Promise<Hash> => {
    try {
      // Ensure we're on Base chain first
      await ensureBaseChain();

      // Reset any previous transaction state
      resetSendTransaction();

      // Prepare transaction parameters
      const txParams: any = {
        to: params.to,
        chainId: BASE_CHAIN_ID,
      };

      // Add value if provided
      if (params.value) {
        txParams.value = typeof params.value === 'string' ? parseEther(params.value) : params.value;
      }

      // Add data if provided
      if (params.data) {
        txParams.data = params.data;
      }

      // Add gas parameters if provided
      if (params.gas) {
        txParams.gas = params.gas;
      }

      if (params.gasPrice) {
        txParams.gasPrice = params.gasPrice;
      }

      console.log('Sending transaction with params:', txParams);

      // Send the transaction
      return new Promise((resolve, reject) => {
        wagmiSendTransaction(txParams, {
          onSuccess: (hash) => {
            console.log('Transaction sent successfully:', hash);
            resolve(hash);
          },
          onError: (error) => {
            console.error('Transaction failed:', error);
            reject(error);
          }
        });
      });

    } catch (error) {
      console.error('Error in sendTransaction:', error);
      throw error;
    }
  }, [wagmiSendTransaction, ensureBaseChain, resetSendTransaction]);

  // Wait for transaction function
  const waitForTransaction = useCallback((hash: Hash) => {
    // Return the useWaitForTransactionReceipt hook result
    // Note: This needs to be called at component level, not inside a callback
    console.log('Waiting for transaction:', hash);
    return {
      hash,
      chainId: BASE_CHAIN_ID,
    };
  }, []);

  // Hook for waiting for transaction receipt (to be used at component level)
  const useWaitForTransaction = (hash?: Hash) => {
    const result = useWaitForTransactionReceipt({
      hash: hash as Hash,
      chainId: BASE_CHAIN_ID,
    });

    // Only return meaningful data when hash is provided
    if (!hash) {
      return {
        data: undefined,
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
      };
    }

    return result;
  };

  // Detect mini app context
  const getMiniAppContext = useCallback(() => {
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
  }, []);

  // Auto-switch to Base chain when connected
  useEffect(() => {
    if (isConnected && chainId && chainId !== BASE_CHAIN_ID) {
      console.log(`Connected to chain ${chainId}, switching to Base chain (${BASE_CHAIN_ID})`);
      try {
        switchChain({ chainId: BASE_CHAIN_ID });
      } catch (error) {
        console.error('Failed to auto-switch to Base chain:', error);
      }
    }
  }, [isConnected, chainId, switchChain]);

  return {
    // Wallet state
    address: address || null,
    isConnected,
    isLoading: isConnecting || isConnectPending,
    chainId: chainId?.toString() || BASE_CHAIN_ID.toString(),
    isOnBaseChain: chainId === BASE_CHAIN_ID,
    
    // Actions
    connectWallet,
    disconnectWallet,
    
    // Transaction functions
    sendTransaction,
    waitForTransaction,
    useWaitForTransaction, // Hook to be used at component level
    
    // Transaction state
    transactionHash,
    isSendingTransaction,
    isSendTransactionError,
    sendTransactionError,
    resetSendTransaction,
    
    // Base chain utilities
    ensureBaseChain,
    switchToBaseChain: () => switchChain({ chainId: BASE_CHAIN_ID }),
    
    // Context
    miniAppContext: getMiniAppContext(),
    farcasterContext: context,
    
    // Connectors info
    hasConnector: connectors.length > 0,
    connectorName: connectors[0]?.name || 'Unknown',
    
    // Constants
    BASE_CHAIN_ID,
  };
}

// Export transaction types for use in components
export type { SendTransactionParams, TransactionResult };

// Export a helper hook for transaction waiting (component level)
export function useTransactionWait(hash?: Hash) {
  const result = useWaitForTransactionReceipt({
    hash: hash as Hash,
    chainId: BASE_CHAIN_ID,
  });

  // Only return meaningful data when hash is provided
  if (!hash) {
    return {
      data: undefined,
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
    };
  }

  return result;
}