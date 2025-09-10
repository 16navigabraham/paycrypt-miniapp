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
// Cache for token metadata
let tokenMetadataCache: TokenConfig[] | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let lastFetchTime = 0;

async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // Exponential backoff
    }
  }
  throw lastError;
}

export async function fetchActiveTokensWithMetadata(): Promise<TokenConfig[]> {
  try {
    // Check cache first
    const now = Date.now();
    if (tokenMetadataCache && (now - lastFetchTime) < CACHE_DURATION) {
      return tokenMetadataCache;
    }

    // Get supported tokens directly from contract with retry
    const tokenAddresses = await retryOperation(async () => {
      const addresses = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getSupportedTokens'
      }) as Address[];
      
      if (!addresses || addresses.length === 0) {
        throw new Error('No token addresses returned from contract');
      }
      return addresses;
    });

    // Process tokens in smaller batches to prevent RPC overload
    const batchSize = 3;
    const tokenBatches = [];
    for (let i = 0; i < tokenAddresses.length; i += batchSize) {
      const batch = tokenAddresses.slice(i, i + batchSize);
      tokenBatches.push(batch);
    }

    let allTokens = [];
    for (const batch of tokenBatches) {
      try {
        const batchResults = await Promise.all(
          batch.map(async (address) => {
            try {
              // Get token details from contract with retry
              const details = await retryOperation(async () => {
                return await publicClient.readContract({
                  address: CONTRACT_ADDRESS,
                  abi: CONTRACT_ABI,
                  functionName: 'getTokenDetails',
                  args: [address]
                });
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
        allTokens.push(batchResults);
      } catch (error) {
        console.error(`Error processing batch:`, error);
        continue;
      }
    }

    const tokens = allTokens.flat().filter((token): token is TokenConfig => token !== null);
    const activeTokens = tokens.filter(token => token.tokenType > 0);
    console.log(`Loaded ${activeTokens.length} active tokens from contract`);
    
    if (activeTokens.length > 0) {
      // Only update cache if we got some tokens
      tokenMetadataCache = activeTokens;
      lastFetchTime = Date.now();
    }
    
    return activeTokens;
  } catch (error) {
    console.error("Error fetching tokens from contract:", error);
    // Return cached tokens if available, otherwise empty array
    return tokenMetadataCache || [];
  }
}