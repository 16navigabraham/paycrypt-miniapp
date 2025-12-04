import { getExplorerUrl as getExplorerUrlFromContract } from "@/config/contract";

export function getExplorerConfig(chain: string) {
  switch (chain) {
    case "ethereum":
      return {
        apiUrl: process.env.NEXT_PUBLIC_ETHERSCAN_API_URL || "https://api.etherscan.io/api",
        apiKey: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY,
        explorer: "https://etherscan.io",
      }
    case "base":
      return {
        apiUrl: process.env.NEXT_PUBLIC_BASESCAN_API_URL || "https://api.basescan.org/api",
        apiKey: process.env.NEXT_PUBLIC_BASESCAN_API_KEY,
        explorer: "https://basescan.org",
      }
    case "lisk":
      return {
        apiUrl: process.env.NEXT_PUBLIC_LISK_API_URL || "https://blockscout.lisk.com/api",
        apiKey: process.env.NEXT_PUBLIC_LISK_API_KEY,
        explorer: "https://blockscout.lisk.com",
      }
    case "celo":
      return {
        apiUrl: process.env.NEXT_PUBLIC_CELO_API_URL || "https://api.celoscan.io/api",
        apiKey: process.env.NEXT_PUBLIC_CELO_API_KEY,
        explorer: "https://celoscan.io",
      }
    // Add more chains as needed
    default:
      throw new Error("Unsupported chain")
  }
}

// Get explorer config by chain ID
export function getExplorerConfigByChainId(chainId: number) {
  switch (chainId) {
    case 1:
      return getExplorerConfig("ethereum");
    case 8453:
      return getExplorerConfig("base");
    case 1135:
      return getExplorerConfig("lisk");
    case 42220:
      return getExplorerConfig("celo");
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`)
  }
}

// Get explorer URL for a transaction by chain ID
export function getExplorerTxUrl(chainId: number, txHash: string): string {
  const explorerBaseUrl = getExplorerUrlFromContract(chainId);
  return `${explorerBaseUrl}/tx/${txHash}`;
}

// Get explorer URL for an address by chain ID
export function getExplorerAddressUrl(chainId: number, address: string): string {
  const explorerBaseUrl = getExplorerUrlFromContract(chainId);
  return `${explorerBaseUrl}/address/${address}`;
}
