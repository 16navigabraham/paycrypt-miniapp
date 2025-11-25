
"use client"
import { Pie } from 'react-chartjs-2';
import ChartJS, { ArcElement, Tooltip, Legend } from 'chart.js/auto';
import { useRef } from 'react';

ChartJS.register(ArcElement, Tooltip, Legend);

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
  const [selectedToken, setSelectedToken] = useState<any | null>(null);

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

        // Fetch metadata for each token and filter out NFTs
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
              const decimals = metaData.result?.decimals;
              return {
                ...metaData.result,
                contractAddress: b.contractAddress,
                balance: decimals ? parseInt(b.tokenBalance, 16) / Math.pow(10, decimals) : 0,
                decimals,
              };
            })
        );
        // Only keep ERC-20 tokens (decimals > 0, symbol exists)
        setTokens(tokensWithMeta.filter(t => t.symbol && t.decimals && t.decimals > 0));

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

  // Pie chart data
  const pieData = {
    labels: sortedTokens.map((t: any) => t.symbol),
    datasets: [
      {
        data: sortedTokens.map((t: any) => t.value),
        backgroundColor: [
          '#4ade80', // ETH
          '#f59e42', // USDT
          '#3b82f6', // USDC
          '#a78bfa', // DAI/other
        ],
        borderColor: '#222',
        borderWidth: 2,
      },
    ],
  };

  // Pie chart options
  const pieOptions = {
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const token = sortedTokens[context.dataIndex];
            return `${token.symbol}: $${token.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
          },
        },
      },
    },
    onClick: (evt: any, elements: any) => {
      if (elements.length > 0) {
        const idx = elements[0].index;
        setSelectedToken(sortedTokens[idx]);
      }
    },
    maintainAspectRatio: false,
  };

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
                  <>
                    <div className="flex flex-col items-center">
                      <div style={{ width: 400, height: 400 }}>
                        <Pie data={pieData} options={pieOptions} />
                      </div>
                      {/* Custom legend below pie chart */}
                      <div className="flex flex-wrap justify-center gap-6 mt-6">
                        {sortedTokens.map((token: any, idx: number) => (
                          <div key={token.symbol} className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2 shadow border border-gray-700 min-w-[140px]">
                            <span style={{ backgroundColor: pieData.datasets[0].backgroundColor[idx], width: 16, height: 16, display: 'inline-block', borderRadius: 4, border: '2px solid #222' }}></span>
                            <div className="flex flex-col">
                              <span className="text-white text-sm font-bold">{token.symbol}</span>
                              <span className="text-gray-300 text-xs">{token.name || token.symbol}</span>
                            </div>
                            <span className="text-purple-300 text-sm font-semibold ml-auto">
                              {currency === 'usd' ? `$${token.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `₦${token.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                            </span>
                          </div>
                        ))}
                      </div>
                      {selectedToken && (
                        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
                          <div className="bg-gray-900 rounded-xl p-8 shadow-2xl border border-gray-700 w-full max-w-md">
                            <div className="flex items-center mb-4">
                              <Image src={selectedToken.logoURI || '/placeholder-logo.png'} alt={selectedToken.symbol} width={40} height={40} className="rounded-full bg-white border border-gray-300 mr-3" />
                              <span className="font-bold text-2xl text-white mr-2">{selectedToken.symbol}</span>
                              <span className="text-gray-300 text-lg">{selectedToken.name || selectedToken.symbol}</span>
                            </div>
                            <div className="mb-2 font-mono text-purple-200 text-lg">Balance: {selectedToken.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
                            <div className="mb-2 text-xs text-muted-foreground">Price: {selectedToken.price ? (currency === 'usd' ? `$${selectedToken.price}` : `₦${selectedToken.price}`) : 'N/A'}</div>
                            <div className="mb-2 font-bold text-purple-300 text-lg">Value: {currency === 'usd' ? `$${selectedToken.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `₦${selectedToken.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}</div>
                            <Button className="mt-4 w-full" onClick={() => setSelectedToken(null)}>Close</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
