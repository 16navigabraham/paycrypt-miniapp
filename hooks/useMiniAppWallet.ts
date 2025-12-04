// hooks/useMiniAppWallet.ts
'use client';

import { useAccount, useConnect, useDisconnect, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { base, lisk, celo } from 'wagmi/chains';
import { parseEther, type Address, type Hash } from 'viem';
import { useCallback, useEffect } from 'react';

// Supported chain IDs
const BASE_CHAIN_ID = 8453;
const LISK_CHAIN_ID = 1135;
const CELO_CHAIN_ID = 42220;
const SUPPORTED_CHAIN_IDS = [BASE_CHAIN_ID, LISK_CHAIN_ID, CELO_CHAIN_ID];

interface SendTransactionParams {
  to: Address;
  value?: string | bigint;
  data?: `0x${string}`;
  gas?: bigint;
  gasPrice?: bigint;
  chainId?: number; // Optional chainId, defaults to current chain
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

  // Ensure we're on a specific chain (defaults to Base)
  const ensureChain = useCallback(async (targetChainId: number = BASE_CHAIN_ID): Promise<boolean> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    if (!SUPPORTED_CHAIN_IDS.includes(targetChainId)) {
      throw new Error('Unsupported chain ID');
    }

    if (chainId !== targetChainId) {
      try {
        // switchChain returns void, so we need to handle it differently
        switchChain({ chainId: targetChainId });
        // Give it a moment to switch
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      } catch (error) {
        const chainName = targetChainId === BASE_CHAIN_ID ? 'Base' : targetChainId === LISK_CHAIN_ID ? 'Lisk' : 'Celo';
        console.error(`Failed to switch to ${chainName} chain:`, error);
        throw new Error(`Please switch to ${chainName} chain to continue`);
      }
    }
    return true;
  }, [chainId, isConnected, switchChain]);

  // Keep backward compatibility
  const ensureBaseChain = useCallback(() => ensureChain(BASE_CHAIN_ID), [ensureChain]);

  // Send transaction function with chain support
  const sendTransaction = useCallback(async (params: SendTransactionParams): Promise<Hash> => {
    try {
      // Use provided chainId or current chainId
      const targetChainId = params.chainId || chainId || BASE_CHAIN_ID;
      
      // Ensure we're on the target chain first
      await ensureChain(targetChainId);

      // Reset any previous transaction state
      resetSendTransaction();

      // Prepare transaction parameters
      const txParams: any = {
        to: params.to,
        chainId: targetChainId,
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

  // Auto-switch to supported chain when connected (only if on unsupported chain)
  useEffect(() => {
    if (isConnected && chainId && !SUPPORTED_CHAIN_IDS.includes(chainId)) {
      console.log(`Connected to unsupported chain ${chainId}, switching to Base chain (${BASE_CHAIN_ID})`);
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
    chainIdNumber: chainId || BASE_CHAIN_ID,
    isOnBaseChain: chainId === BASE_CHAIN_ID,
    isOnLiskChain: chainId === LISK_CHAIN_ID,
    isOnCeloChain: chainId === CELO_CHAIN_ID,
    isOnSupportedChain: chainId ? SUPPORTED_CHAIN_IDS.includes(chainId) : false,
    
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
    
    // Chain utilities
    ensureChain,
    ensureBaseChain, // Backward compatibility
    switchToBaseChain: () => switchChain({ chainId: BASE_CHAIN_ID }),
    switchToLiskChain: () => switchChain({ chainId: LISK_CHAIN_ID }),
    switchToCeloChain: () => switchChain({ chainId: CELO_CHAIN_ID }),
    switchToChain: (targetChainId: number) => switchChain({ chainId: targetChainId }),
    
    // Context
    miniAppContext: getMiniAppContext(),
    farcasterContext: context,
    
    // Connectors info
    hasConnector: connectors.length > 0,
    connectorName: connectors[0]?.name || 'Unknown',
    
    // Constants
    BASE_CHAIN_ID,
    LISK_CHAIN_ID,
    CELO_CHAIN_ID,
    SUPPORTED_CHAIN_IDS,
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