// hooks/useMiniAppWallet.ts
'use client';

import { useState, useEffect } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { Hex } from 'viem';

interface MiniAppWallet {
  address: string | null;
  isConnected: boolean;
  isLoading: boolean;
  chainId: string;
}

// EIP-1193 Provider interface (avoiding conflicts with other libraries)
interface EIP1193Provider {
  request(args: { method: string; params?: any[] }): Promise<any>;
  on?(event: string, callback: (...args: any[]) => void): void;
  removeListener?(event: string, callback: (...args: any[]) => void): void;
}

export function useMiniAppWallet(): MiniAppWallet {
  const [mounted, setMounted] = useState(false);
  const [wallet, setWallet] = useState<MiniAppWallet>({
    address: null,
    isConnected: false,
    isLoading: true,
    chainId: '8453' // Base mainnet
  });

  const { context } = useMiniKit();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const loadWallet = () => {
      // Note: MiniKit context.user doesn't have walletAddress property
      // We'll rely on localStorage and manual wallet connection
      console.log('🔍 Loading wallet from storage...');

      // Load from localStorage
      const address = localStorage.getItem('paycrypt_wallet_address');
      
      setWallet({
        address,
        isConnected: Boolean(address),
        isLoading: false,
        chainId: '8453'
      });

      if (address) {
        console.log('✅ Found stored wallet:', address);
      }
    };

    // Small delay to ensure localStorage is available
    setTimeout(loadWallet, 100);
  }, [mounted, context]);

  return wallet;
}

// Helper to safely get Ethereum provider (avoiding type conflicts)
function getEthereumProvider(): EIP1193Provider | null {
  if (typeof window === 'undefined') return null;
  
  // Use type assertion to avoid conflicts with other library declarations
  const windowAny = window as any;
  
  // Check for window.ethereum (Base App and other providers inject here)
  if (windowAny.ethereum && typeof windowAny.ethereum.request === 'function') {
    return windowAny.ethereum as EIP1193Provider;
  }
  
  // Check for Coinbase Wallet specifically
  if (windowAny.coinbaseWallet?.ethereum && typeof windowAny.coinbaseWallet.ethereum.request === 'function') {
    return windowAny.coinbaseWallet.ethereum as EIP1193Provider;
  }
  
  return null;
}

// Enhanced transaction handler that works with MiniKit and Base App
export async function sendTransaction(transaction: {
  to: string;
  data: string;
  value?: string;
}): Promise<Hex> {
  const provider = getEthereumProvider();
  
  if (!provider) {
    throw new Error('No wallet provider found. Please connect a wallet.');
  }

  try {
    console.log('🔗 Sending transaction...');
    
    const accounts = await provider.request({
      method: 'eth_requestAccounts'
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found');
    }

    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: accounts[0],
        to: transaction.to,
        data: transaction.data,
        value: transaction.value || '0x0'
      }]
    });

    console.log('✅ Transaction sent:', txHash);
    return txHash as Hex;
  } catch (error: any) {
    console.error('❌ Transaction failed:', error);
    throw new Error(error.message || 'Transaction failed');
  }
}

// Wait for transaction receipt
export async function waitForTransaction(txHash: Hex): Promise<any> {
  const provider = getEthereumProvider();
  
  if (!provider) {
    throw new Error('No wallet provider found');
  }

  let receipt = null;
  let attempts = 0;
  const maxAttempts = 60; // 1 minute max

  console.log('⏳ Waiting for transaction receipt...');

  while (!receipt && attempts < maxAttempts) {
    try {
      receipt = await provider.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      });
      
      if (!receipt) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } else {
        console.log('✅ Transaction confirmed:', receipt);
      }
    } catch (error) {
      console.log('⚠️ Receipt check failed, retrying...', error);
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }
  }

  if (!receipt) {
    throw new Error('Transaction receipt not found after 1 minute');
  }

  return receipt;
}

// Helper function to detect miniapp context (Farcaster or Base App)
export function getMiniAppContext() {
  if (typeof window === 'undefined') return { 
    isMiniApp: false, 
    isWeb: true, 
    client: 'web' 
  };
  
  const hasParent = window.parent && window.parent !== window;
  const referrer = document.referrer || '';
  const userAgent = window.navigator.userAgent || '';
  
  // Detect Base App specifically (from Base App docs)
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
}

// Helper to connect wallet using EIP-1193 provider (Base App compatible)
export async function connectWallet(): Promise<string | null> {
  try {
    const provider = getEthereumProvider();
    
    if (!provider) {
      throw new Error('No wallet provider found');
    }

    // Request account access - this works in Base App and Farcaster
    const accounts = await provider.request({
      method: 'eth_requestAccounts'
    });

    if (accounts && accounts.length > 0) {
      const walletAddress = accounts[0];
      localStorage.setItem('paycrypt_wallet_address', walletAddress);
      console.log('✅ Wallet connected:', walletAddress);
      return walletAddress;
    }

    return null;
  } catch (error: any) {
    console.error('❌ Wallet connection failed:', error);
    throw new Error(error.message || 'Failed to connect wallet');
  }
}

// Helper to get current connected accounts (for auto-connection)
export async function getCurrentWalletAccounts(): Promise<string[]> {
  try {
    const provider = getEthereumProvider();
    
    if (!provider) {
      return [];
    }

    // eth_accounts doesn't prompt user, just returns connected accounts
    const accounts = await provider.request({
      method: 'eth_accounts'
    });

    return accounts || [];
  } catch (error) {
    console.log('No accounts available:', error);
    return [];
  }
}

// Helper to auto-connect if wallet is already connected
export async function autoConnectWallet(): Promise<string | null> {
  try {
    const accounts = await getCurrentWalletAccounts();
    
    if (accounts.length > 0) {
      const walletAddress = accounts[0];
      localStorage.setItem('paycrypt_wallet_address', walletAddress);
      console.log('✅ Auto-connected wallet:', walletAddress);
      return walletAddress;
    }

    return null;
  } catch (error) {
    console.log('Auto-connect failed:', error);
    return null;
  }
}

// EIP-6963 discovery for provider detection (Base App compatible)
export function setupEIP6963Discovery(): Promise<EIP1193Provider | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    let discoveredProvider: EIP1193Provider | null = null;

    // Listen for provider announcements
    const handleAnnouncement = (event: any) => {
      if (event.detail?.provider && typeof event.detail.provider.request === 'function') {
        discoveredProvider = event.detail.provider as EIP1193Provider;
        console.log('✅ EIP-6963 provider discovered:', event.detail.info?.name);
        resolve(discoveredProvider);
      }
    };

    window.addEventListener('eip6963:announceProvider', handleAnnouncement);

    // Request providers
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    // Fallback to direct window.ethereum after short delay
    setTimeout(() => {
      if (!discoveredProvider) {
        const fallbackProvider = getEthereumProvider();
        if (fallbackProvider) {
          console.log('✅ Using fallback ethereum provider');
        }
        resolve(fallbackProvider);
      }
    }, 100);
  });
}

// Helper to get chain ID
export async function getChainId(): Promise<string> {
  try {
    const provider = getEthereumProvider();
    
    if (!provider) {
      return '8453'; // Default to Base
    }

    const chainId = await provider.request({
      method: 'eth_chainId'
    });

    return chainId;
  } catch (error) {
    console.log('Failed to get chain ID, defaulting to Base:', error);
    return '8453'; // Default to Base
  }
}

// Helper to switch to Base network
export async function switchToBaseNetwork(): Promise<boolean> {
  try {
    const provider = getEthereumProvider();
    
    if (!provider) {
      return false;
    }

    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x2105' }], // Base mainnet (8453 in hex)
    });

    console.log('✅ Switched to Base network');
    return true;
  } catch (error: any) {
    // If the chain is not added, add it
    if (error.code === 4902) {
      try {
        const addProvider = getEthereumProvider();
        if (!addProvider) {
          return false;
        }
        
        await addProvider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x2105',
            chainName: 'Base',
            nativeCurrency: {
              name: 'Ether',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://mainnet.base.org'],
            blockExplorerUrls: ['https://basescan.org'],
          }],
        });
        console.log('✅ Added and switched to Base network');
        return true;
      } catch (addError) {
        console.error('❌ Failed to add Base network:', addError);
        return false;
      }
    }
    
    console.error('❌ Failed to switch to Base network:', error);
    return false;
  }
}

// Helper to disconnect wallet
export function disconnectWallet(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('paycrypt_wallet_address');
  console.log('🚪 Wallet disconnected');
}

// Helper to check if wallet is connected
export function isWalletConnected(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem('paycrypt_wallet_address'));
}