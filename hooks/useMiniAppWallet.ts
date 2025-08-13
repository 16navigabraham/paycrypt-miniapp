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

    // Enhanced loading with retry for mobile
    let attempts = 0;
    const maxAttempts = 3;
    
    const tryLoadWallet = () => {
      const address = localStorage.getItem('paycrypt_wallet_address');
      
      if (address) {
        setWallet({
          address,
          isConnected: Boolean(address),
          isLoading: false
        });
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(tryLoadWallet, 300);
        } else {
          setWallet({
            address: null,
            isConnected: false,
            isLoading: false
          });
        }
      }
    };
    
    tryLoadWallet();
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

    // Enhanced loading with retry for mobile
    let attempts = 0;
    const maxAttempts = 3;
    
    const tryLoadUserData = () => {
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
        setIsLoading(false);
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(tryLoadUserData, 300);
        } else {
          setUserData(null);
          setIsLoading(false);
        }
      }
    };
    
    tryLoadUserData();
  }, [mounted]);

  return { userData, isLoading };
}

// Enhanced transaction handler with better mobile support
export async function sendTransaction(transaction: {
  to: string;
  data: string;
  value?: string;
}): Promise<Hex> {
  // Try different wallet providers based on context
  const providers = [
    window.ethereum,
    (window as any).coinbaseWallet?.ethereum,
    (window as any).ethereum,
  ].filter(Boolean);

  if (providers.length === 0) {
    throw new Error('No wallet found - please connect a wallet');
  }

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      console.log('🔗 Attempting transaction with provider...');
      
      const accounts = await provider.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      console.log('📝 Sending transaction...');
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
      console.log('❌ Provider failed:', error.message);
      lastError = error;
      continue;
    }
  }

  throw new Error(lastError?.message || 'All wallet providers failed');
}

// Wait for transaction receipt with enhanced mobile support
export async function waitForTransaction(txHash: Hex): Promise<any> {
  const providers = [
    window.ethereum,
    (window as any).coinbaseWallet?.ethereum,
  ].filter(Boolean);

  if (providers.length === 0) {
    throw new Error('No wallet provider found');
  }

  const provider = providers[0]; // Use first available provider

  let receipt = null;
  let attempts = 0;
  const maxAttempts = 120; // 2 minutes max for mobile

  console.log('⏳ Waiting for transaction receipt...');

  while (!receipt && attempts < maxAttempts) {
    try {
      receipt = await provider.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      });
      
      if (!receipt) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        attempts++;
      } else {
        console.log('✅ Transaction confirmed:', receipt);
      }
    } catch (error) {
      console.log('⚠️ Receipt check failed, retrying...', error);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait longer on error
      attempts++;
    }
  }

  if (!receipt) {
    throw new Error('Transaction receipt not found after 2 minutes');
  }

  return receipt;
}

// Helper function to detect miniapp context
export function getMiniAppContext() {
  const hasParent = window.parent && window.parent !== window;
  const referrer = document.referrer || '';
  const userAgent = window.navigator.userAgent || '';
  
  return {
    isMiniApp: hasParent,
    isFarcaster: referrer.includes('farcaster') || referrer.includes('warpcast') || userAgent.includes('Farcaster'),
    isBase: referrer.includes('base.org') || referrer.includes('coinbase') || userAgent.includes('Base'),
    isWeb: !hasParent
  };
}

// Helper function to setup demo data for miniapp testing
export function setupDemoData() {
  const context = getMiniAppContext();
  
  if (context.isMiniApp && !localStorage.getItem('paycrypt_wallet_address')) {
    console.log('🎭 Setting up demo data for miniapp...');
    
    const demoData = {
      address: '0x742d35Cc6634C0532925a3b8D2C9D48C1c7b1db1',
      fid: '12345',
      username: 'demo_user',
      displayName: 'Demo User',
      pfpUrl: ''
    };
    
    localStorage.setItem('paycrypt_wallet_address', demoData.address);
    localStorage.setItem('paycrypt_fid', demoData.fid);
    localStorage.setItem('paycrypt_username', demoData.username);
    localStorage.setItem('paycrypt_display_name', demoData.displayName);
    localStorage.setItem('paycrypt_pfp', demoData.pfpUrl);
    
    return demoData;
  }
  
  return null;
}