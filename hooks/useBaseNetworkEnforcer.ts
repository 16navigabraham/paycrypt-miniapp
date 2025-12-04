// hooks/useBaseNetworkEnforcer.ts
import { useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { base, lisk, celo } from 'wagmi/chains'; // Import supported chains
import { usePrivy } from '';
import { toast } from 'sonner';

// Supported chain IDs
const SUPPORTED_CHAINS = [base.id, lisk.id, celo.id];

/**
 * Custom hook to ensure the user's wallet is connected to a supported network (Base, Lisk, or Celo).
 * Prompts the user to switch if they are authenticated, connected, and on an unsupported chain.
 *
 * @returns {object} An object containing:
 * - `isOnSupportedChain`: boolean indicating if the wallet is currently on a supported chain.
 * - `currentChainId`: number of the current chain.
 * - `isSwitchingChain`: boolean indicating if a chain switch is currently in progress.
 * - `promptSwitchToChain`: A function to manually prompt the user to switch to a specific chain.
 */
export function useBaseNetworkEnforcer() {
  const { authenticated, user } = usePrivy();
  const { isConnected, address } = useAccount();
  const currentChainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

  const isOnSupportedChain = SUPPORTED_CHAINS.includes(currentChainId);
  const isOnBaseChain = currentChainId === base.id; // Keep for backward compatibility

  // Effect to automatically prompt for chain switch if on unsupported chain
  useEffect(() => {
    if (authenticated && address && !isOnSupportedChain && !isSwitchingChain) {
      toast.info("Please switch to a supported network (Base, Lisk, or Celo).", { id: 'switch-chain', duration: 5000 });
      // Auto-switch to Base as default
      switchChain({ chainId: base.id });
    }
    // If user logs out or disconnects wallet, dismiss any lingering toast about switching
    if (authenticated === false || isConnected === false) {
        toast.dismiss('switch-chain');
    }
  }, [authenticated, address, isOnSupportedChain, isSwitchingChain, switchChain, isConnected]);

  // Function to manually trigger a switch to a specific chain
  const promptSwitchToChain = (chainId: number = base.id) => {
    if (!authenticated) {
      toast.error("Please log in to proceed.");
      return false;
    }
    if (!address) {
      toast.error("No wallet found. Please ensure a wallet is connected.");
      return false;
    }
    if (!SUPPORTED_CHAINS.includes(chainId)) {
      toast.error("Unsupported chain selected.");
      return false;
    }
    if (currentChainId !== chainId && !isSwitchingChain) {
      const chainName = chainId === base.id ? 'Base' : chainId === lisk.id ? 'Lisk' : 'Celo';
      toast.info(`Switching to ${chainName} network...`, { id: 'switch-chain-manual' });
      switchChain({ chainId });
      return false; // Indicate that a switch was prompted
    }
    return currentChainId === chainId; // Indicate if already on requested chain
  };

  // Keep backward compatible function
  const promptSwitchToBase = () => promptSwitchToChain(base.id);

  return {
    isOnBaseChain, // Backward compatibility
    isOnSupportedChain,
    currentChainId,
    isSwitchingChain,
    promptSwitchToBase, // Backward compatibility
    promptSwitchToChain,
    supportedChains: SUPPORTED_CHAINS,
  };
}
