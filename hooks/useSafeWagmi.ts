// hooks/useSafeWagmi.ts
'use client';

import { useState, useEffect } from 'react';

interface SafeWagmiData {
  address: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useSafeWagmi(): SafeWagmiData {
  const [mounted, setMounted] = useState(false);
  const [wagmiData, setWagmiData] = useState<SafeWagmiData>({
    address: null,
    isConnected: false,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const loadWagmiData = async () => {
      try {
        // First try to get stored wallet data (mini app flow)
        const storedAddress = localStorage.getItem('paycrypt_wallet_address');
        
        if (storedAddress) {
          console.log('📱 Using stored wallet data:', storedAddress);
          setWagmiData({
            address: storedAddress,
            isConnected: true,
            isLoading: false,
            error: null
          });
          return;
        }

        // Try to load wagmi if no stored data
        try {
          const { useAccount } = await import('wagmi');
          console.log('🔗 Wagmi loaded, but using stored data for mini app compatibility');
          
          // For mini apps, we still prefer stored data over live wagmi
          setWagmiData({
            address: null,
            isConnected: false,
            isLoading: false,
            error: null
          });
        } catch (wagmiError) {
          console.log('⚠️ Wagmi not available, using stored data only');
          setWagmiData({
            address: null,
            isConnected: false,
            isLoading: false,
            error: 'Wagmi not available'
          });
        }
      } catch (error) {
        console.error('❌ Error loading wallet data:', error);
        setWagmiData({
          address: null,
          isConnected: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    loadWagmiData();
  }, [mounted]);

  return wagmiData;
}

// Helper hook for getting user data
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

    const storedWalletAddress = localStorage.getItem('paycrypt_wallet_address');
    const fid = localStorage.getItem('paycrypt_fid');
    const username = localStorage.getItem('paycrypt_username');
    const displayName = localStorage.getItem('paycrypt_display_name');
    const pfpUrl = localStorage.getItem('paycrypt_pfp');

    if (storedWalletAddress) {
      setUserData({
        fid: fid || '',
        username: username || '',
        displayName: displayName || username || 'User',
        walletAddress: storedWalletAddress,
        pfpUrl: pfpUrl || ''
      });
    }
  }, [mounted]);

  return { userData, isLoading: !mounted };
}

// Safe wagmi contract hooks for mini apps
export function useSafeWriteContract() {
  const [mounted, setMounted] = useState(false);
  const [contractHook, setContractHook] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const loadContract = async () => {
      try {
        const { useWriteContract } = await import('wagmi');
        setContractHook({ useWriteContract });
      } catch (error) {
        console.warn('⚠️ Wagmi contract hooks not available');
        setContractHook({
          useWriteContract: () => ({
            writeContract: () => console.warn('Contract write not available'),
            data: null,
            isError: false,
            error: null,
            isPending: false,
            reset: () => {}
          })
        });
      }
    };

    loadContract();
  }, [mounted]);

  return contractHook?.useWriteContract() || {
    writeContract: () => console.warn('Contract write not available'),
    data: null,
    isError: false,
    error: null,
    isPending: false,
    reset: () => {}
  };
}

export function useSafeReadContract(config: any) {
  const [mounted, setMounted] = useState(false);
  const [contractHook, setContractHook] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const loadContract = async () => {
      try {
        const { useReadContract } = await import('wagmi');
        setContractHook({ useReadContract });
      } catch (error) {
        console.warn('⚠️ Wagmi read contract not available');
        setContractHook({
          useReadContract: () => ({
            data: null,
            isError: false,
            error: null,
            isLoading: false
          })
        });
      }
    };

    loadContract();
  }, [mounted]);

  return contractHook?.useReadContract(config) || {
    data: null,
    isError: false,
    error: null,
    isLoading: false
  };
}

export function useSafeWaitForTransaction(config: any) {
  const [mounted, setMounted] = useState(false);
  const [contractHook, setContractHook] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const loadContract = async () => {
      try {
        const { useWaitForTransactionReceipt } = await import('wagmi');
        setContractHook({ useWaitForTransactionReceipt });
      } catch (error) {
        console.warn('⚠️ Wagmi wait for transaction not available');
        setContractHook({
          useWaitForTransactionReceipt: () => ({
            data: null,
            isError: false,
            error: null,
            isLoading: false,
            isSuccess: false
          })
        });
      }
    };

    loadContract();
  }, [mounted]);

  return contractHook?.useWaitForTransactionReceipt(config) || {
    data: null,
    isError: false,
    error: null,
    isLoading: false,
    isSuccess: false
  };
}