// lib/tokenlist.ts
export interface TokenConfig {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  coingeckoId: string;
  tokenType: number; // 0 for ETH, 1+ for ERC20 tokens
  contract?: string; // ERC20 contract address (undefined for ETH)
}

import { createPublicClient, http, getContract, Address, PublicClient } from 'viem';
import { base } from 'viem/chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/config/contract';

interface ContractTokenDetails {
  tokenAddress: `0x${string}`;
  orderLimit: bigint;
  totalVolume: bigint;
  successfulOrders: bigint;
  failedOrders: bigint;
  name: string;
  decimals: number;
  isActive: boolean;
}

// Initialize public client
const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

// Get contract instance
const contract = getContract({
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
  client: publicClient,
});

// Dynamic token list that will be populated from contract
export let TOKEN_LIST: TokenConfig[] = [];

// Function to fetch tokens from contract
export async function initializeTokenList(): Promise<TokenConfig[]> {
  try {
    // Get supported tokens from contract
    const tokenAddresses = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'getSupportedTokens'
    }) as Address[];
    
    // Fetch details for each token
    const tokenPromises = tokenAddresses.map(async (address: Address) => {
      const details = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getTokenDetails',
        args: [address]
      }) as ContractTokenDetails;
      
      return {
        address: details.tokenAddress,
        symbol: '', // Will be fetched from token contract
        name: details.name,
        decimals: details.decimals,
        coingeckoId: '', // Can be mapped separately if needed
        tokenType: details.isActive ? 1 : 0,
        contract: details.tokenAddress,
      };
    });

    TOKEN_LIST = await Promise.all(tokenPromises);
    console.log('Tokens loaded from contract:', TOKEN_LIST.length);
    return TOKEN_LIST;
  } catch (error) {
    console.error('Error loading tokens from contract:', error);
    return [];
  }
}

// Helper function to get token by address
export function getTokenByAddress(address: string): TokenConfig | undefined {
  return TOKEN_LIST.find(token => 
    token.address.toLowerCase() === address.toLowerCase()
  );
}

// Helper function to get token by symbol
export function getTokenBySymbol(symbol: string): TokenConfig | undefined {
  return TOKEN_LIST.find(token => 
    token.symbol.toLowerCase() === symbol.toLowerCase()
  );
}

// Helper function to get active tokens from contract addresses
export function getActiveTokensFromAddresses(contractAddresses: string[]): TokenConfig[] {
  return TOKEN_LIST.filter(token => 
    contractAddresses.some(addr => 
      addr.toLowerCase() === token.address.toLowerCase()
    )
  );
}

// Validate token addresses match your contract's expectations
export function validateTokenList(): boolean {
  const addresses = TOKEN_LIST.map(t => t.address.toLowerCase());
  const uniqueAddresses = new Set(addresses);
  
  if (addresses.length !== uniqueAddresses.size) {
    console.error("Duplicate token addresses found in TOKEN_LIST");
    return false;
  }
  
  return true;
}