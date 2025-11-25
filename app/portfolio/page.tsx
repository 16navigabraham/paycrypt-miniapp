
"use client"

import BackToDashboard from "@/components/BackToDashboard";
import { useMiniAppWallet } from "@/hooks/useMiniAppWallet";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function PortfolioPage() {
  const { address, isConnected } = useMiniAppWallet();
  const [tokens, setTokens] = useState<any[]>([]);
  const [ethBalance, setEthBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<any>({});
  const [currency, setCurrency] = useState<'usd' | 'ngn'>('usd');

  useEffect(() => {
    async function fetchPortfolio() {
      if (!address) return;
      setLoading(true);
      setError(null);
      try {
        const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
        const url = `https://base-mainnet.g.alchemy.com/v2/${apiKey}`;
        // Fetch ETH balance
        const ethRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getBalance',
            params: [address, 'latest'],
          }),
        });
        const ethData = await ethRes.json();
        setEthBalance(ethData.result ? parseInt(ethData.result, 16) / 1e18 : 0);

        // Fetch all token balances
        const tokenRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'alchemy_getTokenBalances',
            params: [address],
          }),
        });
        const tokenData = await tokenRes.json();
        const balances = tokenData.result?.tokenBalances || [];

        // Fetch metadata for each token
        const tokensWithMeta = await Promise.all(
          balances
            .filter((b: any) => b.tokenBalance && b.tokenBalance !== "0x0")
            .map(async (b: any) => {
              const metaRes = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  id: 3,
                  method: 'alchemy_getTokenMetadata',
                  params: [b.contractAddress],
                }),
              });
              const metaData = await metaRes.json();
              const decimals = metaData.result?.decimals || 18;
              return {
                ...metaData.result,
                contractAddress: b.contractAddress,
                balance: parseInt(b.tokenBalance, 16) / Math.pow(10, decimals),
              };
            })
        );
        setTokens(tokensWithMeta);

        // Fetch prices from Coingecko
        // Build list of coingecko IDs (ETH and tokens)
        const coingeckoIds: string[] = [];
        // ETH
        coingeckoIds.push('ethereum');
        // Try to get coingeckoId from token metadata
        tokensWithMeta.forEach((token) => {
          if (token.symbol === 'USDT') coingeckoIds.push('tether');
          else if (token.symbol === 'USDC') coingeckoIds.push('usd-coin');
          else if (token.symbol === 'DAI') coingeckoIds.push('dai');
          // Add more mappings as needed
        });
        // Remove duplicates
        const uniqueIds = Array.from(new Set(coingeckoIds));
        const priceRes = await fetch(
          `https://paycrypt-margin-price.onrender.com/api/v3/simple/price?ids=${uniqueIds.join(",")}&vs_currencies=usd,ngn`
        );
        const priceData = await priceRes.json();
        setPrices(priceData);
      } catch (err: any) {
        setError('Failed to load portfolio.');
      } finally {
        setLoading(false);
      }
    }
    if (isConnected && address) fetchPortfolio();
  }, [isConnected, address]);

  // Helper to get price for a token
  function getTokenPrice(token: any) {
    if (token.symbol === 'ETH') return prices['ethereum']?.[currency] || 0;
    if (token.symbol === 'USDT') return prices['tether']?.[currency] || 0;
    if (token.symbol === 'USDC') return prices['usd-coin']?.[currency] || 0;
    if (token.symbol === 'DAI') return prices['dai']?.[currency] || 0;
    return 0;
  }

  // Build full token list (ETH + tokens)
  const fullTokens = [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      logoURI: '/paycrypt.png',
      balance: ethBalance,
      contractAddress: 'native',
    },
    ...tokens,
  ];

  // Calculate per-token value and total value
  const tokensWithValue = fullTokens.map((token) => {
    const price = getTokenPrice(token);
    return {
      ...token,
      price,
      value: token.balance * price,
    };
  });
  const totalValue = tokensWithValue.reduce((sum, t) => sum + t.value, 0);

  // Sort tokens by value descending
  const sortedTokens = tokensWithValue.sort((a, b) => b.value - a.value);

  return (
    <div className="container py-10">
      <BackToDashboard />
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Portfolio</h1>
        <p className="text-muted-foreground">
          View your real-time crypto balances, token prices, and total value on Base chain.
        </p>
      </div>
      {!isConnected ? (
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold mb-4">Portfolio</h1>
          <p className="text-muted-foreground mb-6">
            Please connect your wallet to view your portfolio.
          </p>
          <Button onClick={() => window.location.href = '/dashboard'}>
            Go to Dashboard
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-8 flex flex-col items-center">
            <span className="text-4xl font-bold text-white tracking-tight">
              {currency === 'usd' ? `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `₦${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrency(currency === 'usd' ? 'ngn' : 'usd')}
              className="text-sm text-purple-200 hover:text-white hover:bg-white/10 px-3 py-1 h-auto rounded-full mt-2"
            >
              {currency === 'usd' ? 'Switch to ₦ NGN' : 'Switch to $ USD'}
            </Button>
            <span className="text-xs text-muted-foreground mt-2">Total Portfolio Value</span>
          </div>
          {loading ? (
            <div className="text-center py-8">
              <span className="text-lg text-muted-foreground">Loading portfolio...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <span className="text-lg text-red-400">{error}</span>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold mb-4">Tokens</h2>
                {sortedTokens.length === 0 ? (
                  <div className="text-muted-foreground">No tokens found.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedTokens.map((token) => (
                      <div key={token.contractAddress + token.symbol} className="bg-white/5 rounded-lg p-4 flex items-center gap-4">
                        <Image
                          src={token.logoURI || "/placeholder-logo.png"}
                          alt={token.symbol}
                          width={32}
                          height={32}
                          className="rounded-full bg-white"
                        />
                        <div>
                          <div className="font-bold text-base text-white">{token.name || token.symbol}</div>
                          <div className="text-xs text-muted-foreground">{token.symbol}</div>
                          <div className="font-mono text-lg text-white">{token.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
                          <div className="text-xs text-muted-foreground">
                            Price: {token.price ? (currency === 'usd' ? `$${token.price}` : `₦${token.price}`) : 'N/A'}
                          </div>
                          <div className="font-bold text-purple-300 text-sm">
                            Value: {currency === 'usd' ? `$${token.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `₦${token.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

