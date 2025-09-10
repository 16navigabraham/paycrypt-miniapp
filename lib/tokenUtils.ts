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
    const tokensWithNull = await Promise.all(
      tokenAddresses.map(async (address) => {
        try {
          // Get token details from contract
          const details = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'getTokenDetails',
            args: [address]
          });

          // Get ERC20 token details directly from token contract
          const erc20Abi = [
            { "inputs": [], "name": "symbol", "outputs": [{ "type": "string" }], "stateMutability": "view", "type": "function" },
            { "inputs": [], "name": "name", "outputs": [{ "type": "string" }], "stateMutability": "view", "type": "function" },
            { "inputs": [], "name": "decimals", "outputs": [{ "type": "uint8" }], "stateMutability": "view", "type": "function" }
          ] as const;

          const [symbol, name, decimals] = await Promise.all([
            publicClient.readContract({ address, abi: erc20Abi, functionName: 'symbol' }),
            publicClient.readContract({ address, abi: erc20Abi, functionName: 'name' }),
            publicClient.readContract({ address, abi: erc20Abi, functionName: 'decimals' })
          ]);

          const coingeckoMap: Record<string, string> = {
            'USDC': 'usd-coin',
            'USDT': 'tether',
            'DAI': 'dai',
            // Add more mappings as needed
          };

          return {
            address,
            symbol,
            name,
            decimals: Number(decimals),
            coingeckoId: coingeckoMap[symbol] || '',
            tokenType: details.isActive ? 1 : 0,
            contract: address
          } as TokenConfig;
        } catch (error) {
          console.error(`Error fetching details for token ${address}:`, error);
          return null;
        }
      })
    );

    const tokens = tokensWithNull.filter((token): token is TokenConfig => token !== null);
    const activeTokens = tokens.filter(token => token.tokenType > 0);
    console.log(`Loaded ${activeTokens.length} active tokens from contract`);
    return activeTokens;

  } catch (error) {
    console.error("Error fetching tokens from contract:", error);
    return [];
  }
}