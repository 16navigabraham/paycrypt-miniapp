// lib/tokenUtils.ts
import { createPublicClient, http, Address } from 'viem';
import { base } from 'viem/chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/config/contract';
import { TokenConfig } from "./tokenlist";

const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

/**
 * Reusable utility to fetch active tokens from contract
 */
export async function fetchActiveTokensWithMetadata(): Promise<TokenConfig[]> {
  try {
    // Get supported tokens directly from contract
    const tokenAddresses = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'getSupportedTokens'
    }) as Address[];

    // Get details for each token
    const tokens = await Promise.all(
      tokenAddresses.map(async (address) => {
        const details = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'getTokenDetails',
          args: [address]
        });

        return {
          address,
          symbol: details.name.slice(0, 6), // Use abbreviated name as symbol
          name: details.name,
          decimals: Number(details.decimals),
          coingeckoId: '', // Optional
          tokenType: details.isActive ? 1 : 0,
          contract: address
        } as TokenConfig;
      })
    );

    const activeTokens = tokens.filter(token => token.tokenType > 0);
    console.log(`Loaded ${activeTokens.length} active tokens from contract`);
    return activeTokens;

  } catch (error) {
    console.error("Error fetching tokens from contract:", error);
    return [];
  }
}