// hooks/useMiniAppWallet.ts
'use client';

import { useState, useEffect } from 'react';
import { Hex } from 'viem';

interface MiniAppWallet {
  address: string | null;
  isConnected: boolean;
  isLoading: boolean;
}

export function useMiniAppWallet(): MiniAppWallet {
  const [mounted, setMounted] = useState(false);
  const [wallet, setWallet] = useState<MiniAppWallet>({
    address: null,
    isConnected: false,
    isLoading: true
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Simple wallet loading with single retry for reliability
    const loadWallet = () => {
      const address = localStorage.getItem('paycrypt_wallet_address');
      
      setWallet({
        address,
        isConnected: Boolean(address),
        isLoading: false
      });
    };

    // Small delay to ensure localStorage is available
    setTimeout(loadWallet, 100);
  }, [mounted]);

  return wallet;
}

export function useMiniAppUser() {
  const [mounted, setMounted] = useState(false);
  const [userData, setUserData] = useState<{
    fid: string;
    username: string;
    displayName: string;
    walletAddress: string;
    pfpUrl: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const loadUserData = () => {
      const walletAddress = localStorage.getItem('paycrypt_wallet_address');
      const fid = localStorage.getItem('paycrypt_fid');
      const username = localStorage.getItem('paycrypt_username');
      const displayName = localStorage.getItem('paycrypt_display_name');
      const pfpUrl = localStorage.getItem('paycrypt_pfp');

      if (walletAddress) {
        setUserData({
          fid: fid || '',
          username: username || '',
          displayName: displayName || username || 'User',
          walletAddress,
          pfpUrl: pfpUrl || ''
        });
      } else {
        setUserData(null);
      }
      
      setIsLoading(false);
    };

    // Small delay to ensure localStorage is available
    setTimeout(loadUserData, 100);
  }, [mounted]);

  return { userData, isLoading };
}

// Enhanced transaction handler that works with multiple wallet providers
export async function sendTransaction(transaction: {
  to: string;
  data: string;
  value?: string;
}): Promise<Hex> {
  // Try to get ethereum provider from various sources
  const getProvider = () => {
    // Check for MiniKit/OnchainKit provider first
    if ((window as any).ethereum) return (window as any).ethereum;
    
    // Check for Coinbase Wallet
    if ((window as any).coinbaseWallet?.ethereum) return (window as any).coinbaseWallet.ethereum;
    
    // Check for injected provider
    if (window.ethereum) return window.ethereum;
    
    return null;
  };

  const provider = getProvider();
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
  const getProvider = () => {
    if ((window as any).ethereum) return (window as any).ethereum;
    if ((window as any).coinbaseWallet?.ethereum) return (window as any).coinbaseWallet.ethereum;
    if (window.ethereum) return window.ethereum;
    return null;
  };

  const provider = getProvider();
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

// Helper function to detect miniapp context
export function getMiniAppContext() {
  if (typeof window === 'undefined') return { isMiniApp: false, isWeb: true };
  
  const hasParent = window.parent && window.parent !== window;
  const referrer = document.referrer || '';
  const userAgent = window.navigator.userAgent || '';
  
  return {
    isMiniApp: hasParent || 
              referrer.includes('farcaster') || 
              referrer.includes('warpcast') || 
              referrer.includes('base.org') || 
              referrer.includes('coinbase') ||
              userAgent.includes('Farcaster') ||
              userAgent.includes('Base') ||
              userAgent.includes('Coinbase'),
    isWeb: !hasParent
  };
}

// Helper to check if user data exists
export function hasUserData(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem('paycrypt_wallet_address'));
}

// Helper to clear user data
export function clearUserData(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('paycrypt_wallet_address');
  localStorage.removeItem('paycrypt_fid');
  localStorage.removeItem('paycrypt_username');
  localStorage.removeItem('paycrypt_display_name');
  localStorage.removeItem('paycrypt_pfp');
}

// Helper to set user data
export function setUserData(data: {
  walletAddress: string;
  fid?: string;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('paycrypt_wallet_address', data.walletAddress);
  if (data.fid) localStorage.setItem('paycrypt_fid', data.fid);
  if (data.username) localStorage.setItem('paycrypt_username', data.username);
  if (data.displayName) localStorage.setItem('paycrypt_display_name', data.displayName);
  if (data.pfpUrl) localStorage.setItem('paycrypt_pfp', data.pfpUrl);
}