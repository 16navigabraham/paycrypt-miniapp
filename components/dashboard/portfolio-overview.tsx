"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Eye, EyeOff, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMiniAppWallet } from "@/hooks/useMiniAppWallet"

// Base chain contract addresses (update if needed)
const USDT_CONTRACT = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"
const USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

const supportedTokens = [
	{ symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", color: "from-blue-500 to-purple-600" },
	{ symbol: "USDT", name: "Tether", coingeckoId: "tether", color: "from-green-500 to-emerald-600", contract: USDT_CONTRACT, decimals: 6 },
	{ symbol: "USDC", name: "USD Coin", coingeckoId: "usd-coin", color: "from-blue-400 to-cyan-600", contract: USDC_CONTRACT, decimals: 6 },
]

// Use Alchemy for Base chain (chainId 8453)
async function fetchEthBalance(address: string) {
	try {
		const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
		if (!apiKey) {
			console.warn('No Alchemy API key found, using fallback data');
			return 0;
		}
		// Alchemy Base mainnet endpoint
		const url = `https://base-mainnet.g.alchemy.com/v2/${apiKey}`;
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: 1,
				method: 'eth_getBalance',
				params: [address, 'latest'],
			}),
		});
		if (!res.ok) {
			console.error('Alchemy API error:', res.status, res.statusText);
			return 0;
		}
		const data = await res.json();
		if (data.result) {
			return parseInt(data.result, 16) / 1e18;
		}
		console.warn('Invalid ETH balance response:', data);
		return 0;
	} catch (error) {
		console.error('Error fetching ETH balance:', error);
		return 0;
	}
}

async function fetchErc20Balance(address: string, contract: string, decimals: number) {
	try {
		const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
		if (!apiKey) {
			console.warn('No Alchemy API key found, using fallback data');
			return 0;
		}
		// Alchemy Base mainnet endpoint
		const url = `https://base-mainnet.g.alchemy.com/v2/${apiKey}`;
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: 1,
				method: 'alchemy_getTokenBalances',
				params: [address, [contract]],
			}),
		});
		if (!res.ok) {
			console.error('Alchemy token API error:', res.status, res.statusText);
			return 0;
		}
		const data = await res.json();
		// Alchemy returns balances in hex string
		if (data.result && data.result.tokenBalances && data.result.tokenBalances.length > 0) {
			const hexBalance = data.result.tokenBalances[0].tokenBalance;
			if (hexBalance) {
				return parseInt(hexBalance, 16) / Math.pow(10, decimals);
			}
		}
		console.warn('Invalid token balance response:', data);
		return 0;
	} catch (error) {
		console.error('Error fetching token balance:', error);
		return 0;
	}
}

async function fetchPrices() {
	try {
		const ids = supportedTokens.map((t) => t.coingeckoId).join(",")
		const res = await fetch(
			`https://paycrypt-margin-price.onrender.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,ngn`,
			{
				method: 'GET',
				headers: {
					'Accept': 'application/json',
				},
			}
		)
		
		if (!res.ok) {
			console.error('Price API error:', res.status, res.statusText)
			return {}
		}
		
		const data = await res.json()
		console.log('Price data response:', data)
		return data
	} catch (error) {
		console.error('Error fetching prices:', error)
		return {}
	}
}

const imgPngtreeWhiteGridCartoonPngMaterial46759121 = "https://www.figma.com/api/mcp/asset/0cd7906c-bcfd-4b4f-8a51-de6de026a2fc";

export function PortfolioOverview({ wallet, className }: { wallet: any; className?: string }) {
	const [mounted, setMounted] = useState(false);
	const [balances, setBalances] = useState<any[]>([]);
	const [prices, setPrices] = useState<any>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showBalance, setShowBalance] = useState(true);
	const [currencyDisplay, setCurrencyDisplay] = useState<'usd' | 'ngn'>('usd');

	// Use simple mini app wallet hook
	const { address } = useMiniAppWallet();

	// Set mounted
	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!mounted) return;

		// Use address from mini app hook or wallet prop
		const walletAddress = address || wallet?.address;

		if (!walletAddress) {
			console.log('No wallet address available');
			return;
		}

		console.log('Loading portfolio for address:', walletAddress);
		setLoading(true);
		setError(null);

		// Fetch all ERC-20 balances in one call
		const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
		const url = `https://base-mainnet.g.alchemy.com/v2/${apiKey}`;

		Promise.all([
			fetchEthBalance(walletAddress),
			fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method: 'alchemy_getTokenBalances',
					params: [walletAddress, [USDT_CONTRACT, USDC_CONTRACT]],
				}),
			}).then(res => res.json()),
			fetchPrices(),
		]).then(([eth, tokenData, priceData]) => {
			// tokenData.result.tokenBalances is an array
			let usdtBalance = 0;
			let usdcBalance = 0;
			if (tokenData.result && Array.isArray(tokenData.result.tokenBalances)) {
				tokenData.result.tokenBalances.forEach((tb: any) => {
					if (tb.contractAddress.toLowerCase() === USDT_CONTRACT.toLowerCase()) {
						usdtBalance = tb.tokenBalance ? parseInt(tb.tokenBalance, 16) / 1e6 : 0;
					}
					if (tb.contractAddress.toLowerCase() === USDC_CONTRACT.toLowerCase()) {
						usdcBalance = tb.tokenBalance ? parseInt(tb.tokenBalance, 16) / 1e6 : 0;
					}
				});
			}
			setBalances([
				{ symbol: "ETH", name: "Ethereum", balance: eth, color: "from-blue-500 to-purple-600" },
				{ symbol: "USDT", name: "Tether", balance: usdtBalance, color: "from-green-500 to-emerald-600" },
				{ symbol: "USDC", name: "USD Coin", balance: usdcBalance, color: "from-blue-400 to-cyan-600" },
			]);
			setPrices(priceData);
		}).catch(error => {
			console.error('Error loading portfolio data:', error);
			setError('Failed to load portfolio data. Please try again.');
		}).finally(() => {
			setLoading(false);
		});
	}, [mounted, address, wallet]);

	 // Calculate total value in USD
    const totalValueUSD = balances.reduce((sum, b) => {
        const token = supportedTokens.find((t) => t.symbol === b.symbol)
        const price = token && prices[token.coingeckoId]?.usd ? prices[token.coingeckoId].usd : 0
        return sum + (b.balance * price)
    }, 0)

    // Calculate total value in NGN
    const totalValueNGN = balances.reduce((sum, b) => {
        const token = supportedTokens.find((t) => t.symbol === b.symbol)
        const price = token && prices[token.coingeckoId]?.ngn ? prices[token.coingeckoId].ngn : 0
        return sum + (b.balance * price)
    }, 0)
    
    // Helper function to format the value based on visibility and selected currency
    const formatValue = (value: number, currency: 'usd' | 'ngn') => {
        if (!showBalance) {
            return "••••••"
        }
        return currency === 'usd'
            ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
            : `₦${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }

    // Toggle functions
    const toggleBalanceVisibility = () => setShowBalance((prev) => !prev)
    const toggleCurrencyDisplay = () => setCurrencyDisplay((prev) => (prev === 'usd' ? 'ngn' : 'usd'))

	// Don't render until mounted
	if (!mounted) {
		return (
			<div className="flex items-baseline space-x-2">
				<div className="animate-pulse">
					<div className="h-8 w-32 bg-white/20 rounded"></div>
				</div>
			</div>
		);
	}

	// Show error state if there's an error
	if (error) {
		return (
			<div className="flex items-baseline space-x-2">
				<span className="text-2xl font-bold text-red-300">Error</span>
				<span className="text-red-200 text-sm">Failed to load</span>
			</div>
		);
	}

	// Figma-inspired card layout, keeping currency toggle button
	const baseClasses = "relative z-30 w-full flex flex-col items-center justify-center py-6 px-0 rounded-[40px] font-['Montserrat_Alternates'],sans-serif shadow-lg overflow-hidden";
	const defaultBg = 'bg-gradient-to-br from-[#d4ff16] to-[#1437ff]';
	const rootClass = className ? `${baseClasses} ${className}` : `${baseClasses} ${defaultBg}`;

	return (
		<div className={rootClass}>
			{/* Gradient background (Figma) */}
			<div
				className="absolute left-0 top-0 w-full h-[180px] rounded-t-[40px] z-0"
				style={{
					// Use an opaque decorative gradient to avoid revealing the white sheet underneath
					background: "linear-gradient(180deg, rgba(20,55,255,0.9) 0%, rgba(212,255,22,0.95) 100%)",
				}}
			/>

			{/* Grid overlay (Figma asset) */}
			<img src={imgPngtreeWhiteGridCartoonPngMaterial46759121} alt="grid overlay" className="absolute left-0 top-0 w-full h-[180px] object-cover opacity-20 pointer-events-none z-0 rounded-t-[40px]" />

			{/* Main balance card */}
			<div className="relative z-10 flex flex-col items-center justify-center w-full pt-6 pb-4">
				{/* Wallet address badge (Figma style) */}
				{wallet?.address && (
					<div className="flex items-center justify-center mb-2">
						<div className="bg-white border border-[#1687ff] rounded-[10px] px-4 py-1">
							<span className="font-['Montserrat_Alternates:Medium',sans-serif] text-[12px] text-black tracking-wide">{wallet.address.slice(0,6)}...{wallet.address.slice(-4)}</span>
						</div>
					</div>
				)}

				{/* Main balance display - Figma style */}
				<div className="flex flex-col items-center justify-center">
					{loading ? (
						<div className="animate-pulse">
							<div className="h-12 w-40 bg-white/20 rounded"></div>
						</div>
					) : (
						<span className="text-[40px] font-['Montserrat_Alternates:SemiBold',sans-serif] text-white tracking-tight drop-shadow-lg">
							{formatValue(
								currencyDisplay === 'usd' ? totalValueUSD : totalValueNGN,
								currencyDisplay
							)}
						</span>
					)}
				</div>

				{/* Currency toggle button (preserved) */}
				<Button
					variant="ghost"
					size="sm"
					onClick={toggleCurrencyDisplay}
					className="text-sm text-purple-200 hover:text-white hover:bg-white/10 px-3 py-1 h-auto rounded-full font-['Montserrat_Alternates:Medium',sans-serif] mt-2"
				>
					{currencyDisplay === 'usd' ? 'Switch to ₦ NGN' : 'Switch to $ USD'}
				</Button>
			</div>

			{/* Decorative circles (Figma) */}
			<div className="absolute left-[-40px] top-[-40px] w-[120px] h-[120px] bg-[#d4ff16] opacity-10 rounded-full z-0" />
			<div className="absolute right-[-30px] top-[-30px] w-[80px] h-[80px] bg-[#1437ff] opacity-10 rounded-full z-0" />
			<div className="absolute right-[-50px] bottom-[-50px] w-[120px] h-[120px] bg-[#d4ff16] opacity-10 rounded-full z-0" />
		</div>
	)
}