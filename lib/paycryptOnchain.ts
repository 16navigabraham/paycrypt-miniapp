// lib/paycryptOnchain.ts
import { CONTRACT_ABI, getContractAddress } from "@/config/contract";
import { ERC20_ABI } from "@/config/erc20Abi";
import { createPublicClient, createWalletClient, http, getContract } from "viem";

export async function paycryptOnchain({
  userAddress,
  tokenAddress,
  amount,
  requestId,
  walletClient,
  publicClient,
  chainId,
}: {
  userAddress: string;
  tokenAddress: string;
  amount: bigint;
  requestId: string | number;
  walletClient: any;
  publicClient: any;
  chainId: number;
}) {
  // amount is already typed as bigint, use directly
  const safeAmount: bigint = amount;

  // Get contract address for the current chain
  const contractAddress = getContractAddress(chainId);

  // 1. Get contract instances using viem
  const contract = getContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    client: publicClient,
  });
  const erc20 = getContract({ address: tokenAddress as `0x${string}`, abi: ERC20_ABI, client: walletClient });

  // 2. Check if token is supported
  const isSupported = await (contract as any).isTokenSupported([tokenAddress]);
  if (!isSupported) throw new Error("Unsupported token");

  // 3. Check if user is blacklisted
  const blacklisted = await (contract as any).isBlacklisted([userAddress]);
  if (blacklisted) throw new Error("User is blacklisted");

  // 4. Check user balance
  const balance = await (erc20 as any).balanceOf([userAddress]);
  if (balance < safeAmount) throw new Error("Insufficient balance");

  // 5. Check allowance
  const allowance = await (erc20 as any).allowance([userAddress, contractAddress]);
  if (allowance < safeAmount) {
    const approveTx = await (erc20 as any).approve([contractAddress, safeAmount]);
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
  }

  // 6. Check order limit
  const orderLimit = await (contract as any).getOrderLimit([tokenAddress]);
  if (safeAmount > orderLimit) throw new Error("Order exceeds limit");

  // 7. Create order
  const createOrderTx = await (contract as any).createOrder([requestId, tokenAddress, safeAmount]);
  await publicClient.waitForTransactionReceipt({ hash: createOrderTx });
}
