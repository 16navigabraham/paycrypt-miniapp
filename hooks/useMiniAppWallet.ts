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

    const address = localStorage.getItem('paycrypt_wallet_address');
    
    setWallet({
      address,
      isConnected: Boolean(address),
      isLoading: false
    });
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

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
    }
  }, [mounted]);

  return { userData, isLoading: !mounted };
}

// Simple transaction handler using window.ethereum directly
export async function sendTransaction(transaction: {
  to: string;
  data: string;
  value?: string;
}): Promise<Hex> {
  if (!window.ethereum) {
    throw new Error('No wallet found');
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: accounts[0],
        to: transaction.to,
        data: transaction.data,
        value: transaction.value || '0x0'
      }]
    });

    return txHash as Hex;
  } catch (error: any) {
    throw new Error(error.message || 'Transaction failed');
  }
}

// Wait for transaction receipt
export async function waitForTransaction(txHash: Hex): Promise<any> {
  if (!window.ethereum) {
    throw new Error('No wallet found');
  }

  let receipt = null;
  let attempts = 0;
  const maxAttempts = 60; // 60 seconds max

  while (!receipt && attempts < maxAttempts) {
    try {
      receipt = await window.ethereum.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      });
      
      if (!receipt) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        attempts++;
      }
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
  }

  if (!receipt) {
    throw new Error('Transaction receipt not found after 60 seconds');
  }

  return receipt;
}