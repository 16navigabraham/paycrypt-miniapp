
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

        // Supported tokens: USDT, USDC, SEND
        const supported = [
          { symbol: 'USDT', name: 'Tether USD', contract: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6 },
          { symbol: 'USDC', name: 'USD Coin', contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
          { symbol: 'SEND', name: 'SEND', contract: '0xeab49138ba2ea6dd776220fe26b7b8e446638956', decimals: 18 },
        ];

        // Fetch all supported token balances in one call
        const tokenRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'alchemy_getTokenBalances',
            params: [address, supported.map(t => t.contract)],
          }),
        });
        const tokenData = await tokenRes.json();
        const balances = tokenData.result?.tokenBalances || [];

        // Fetch metadata for each supported token
        const tokensWithMeta = await Promise.all(
          supported.map(async (t, i) => {
            const b = balances[i];
            const metaRes = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 3,
                method: 'alchemy_getTokenMetadata',
                params: [t.contract],
              }),
            });
            const metaData = await metaRes.json();
            const decimals = metaData.result?.decimals ?? t.decimals;
            // Only keep ERC-20 tokens (decimals > 0, symbol exists)
            if (!metaData.result?.symbol || !decimals || decimals <= 0) return null;
            return {
              ...metaData.result,
              contractAddress: t.contract,
              balance: b?.tokenBalance ? parseInt(b.tokenBalance, 16) / Math.pow(10, decimals) : 0,
              decimals,
              name: t.name,
              symbol: t.symbol,
              logoURI: metaData.result?.logo || metaData.result?.logoURI || '/placeholder-logo.png',
            };
          })
        );
        setTokens(tokensWithMeta.filter(Boolean));

        // Fetch prices from Coingecko
        const coingeckoIds: string[] = ['ethereum'];
        tokensWithMeta.forEach((token) => {
          if (!token) return;
          if (token.symbol === 'USDT') coingeckoIds.push('tether');
          else if (token.symbol === 'USDC') coingeckoIds.push('usd-coin');
          else if (token.symbol === 'SEND') coingeckoIds.push('send-token-2');
        });
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
    if (token.symbol === 'SEND') return prices['send-token-2']?.[currency] || 0;
    return 0;
  }

  // Build full token list (ETH + tokens)
  const fullTokens = [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      logoURI: '/ETH.png',
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedTokens.map((token) => (
                      <div key={token.contractAddress + token.symbol} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 flex items-center gap-5 shadow-lg border border-gray-700">
                        <Image
                          src={token.logoURI || "/placeholder-logo.png"}
                          alt={token.symbol}
                          width={40}
                          height={40}
                          className="rounded-full bg-white border border-gray-300"
                        />
                        <div className="flex-1">
                          <div className="font-bold text-lg text-white mb-1">{token.name || token.symbol}</div>
                          <div className="text-xs text-purple-200 mb-1">{token.symbol}</div>
                          <div className="font-mono text-xl text-white mb-1">{token.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
                          <div className="text-xs text-muted-foreground mb-1">
                            Price: {token.price ? (currency === 'usd' ? `$${token.price}` : `₦${token.price}`) : 'N/A'}
                          </div>
                          <div className="font-bold text-purple-300 text-base">
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

