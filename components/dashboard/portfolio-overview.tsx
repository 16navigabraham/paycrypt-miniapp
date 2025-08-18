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

async function fetchEthBalance(address: string) {
	try {
		const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY
		if (!apiKey) {
			console.warn('No Etherscan API key found, using fallback data')
			return 0
		}
		
		const res = await fetch(
			`https://api.etherscan.io/v2/api?chainid=8453&module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`
		)
		
		if (!res.ok) {
			console.error('Etherscan API error:', res.status, res.statusText)
			return 0
		}
		
		const data = await res.json()
		console.log('ETH balance response:', data)
		
		if (data.status === "1" && data.result) {
			return Number(data.result) / 1e18
		}
		
		console.warn('Invalid ETH balance response:', data)
		return 0
	} catch (error) {
		console.error('Error fetching ETH balance:', error)
		return 0
	}
}

async function fetchErc20Balance(address: string, contract: string, decimals: number) {
	try {
		const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY
		if (!apiKey) {
			console.warn('No Etherscan API key found, using fallback data')
			return 0
		}
		
		const res = await fetch(
			`https://api.etherscan.io/v2/api?chainid=8453&module=account&action=tokenbalance&contractaddress=${contract}&address=${address}&tag=latest&apikey=${apiKey}`
		)
		
		if (!res.ok) {
			console.error('Etherscan token API error:', res.status, res.statusText)
			return 0
		}
		
		const data = await res.json()
		console.log(`Token balance response for ${contract}:`, data)
		
		if (data.status === "1" && data.result !== undefined) {
			return Number(data.result) / 10 ** decimals
		}
		
		console.warn('Invalid token balance response:', data)
		return 0
	} catch (error) {
		console.error('Error fetching token balance:', error)
		return 0
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

export function PortfolioOverview({ wallet }: { wallet: any }) {
	const [mounted, setMounted] = useState(false);
	const [balances, setBalances] = useState<any[]>([])
	const [prices, setPrices] = useState<any>({})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
    const [showBalance, setShowBalance] = useState(true)
    const [currencyDisplay, setCurrencyDisplay] = useState<'usd' | 'ngn'>('usd')

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
			console.log('No wallet address available')
			return;
		}
		
		console.log('Loading portfolio for address:', walletAddress)
		setLoading(true)
		setError(null)
		
		Promise.all([
			fetchEthBalance(walletAddress),
			fetchErc20Balance(walletAddress, USDT_CONTRACT, 6),
			fetchErc20Balance(walletAddress, USDC_CONTRACT, 6),
			fetchPrices(),
		]).then(([eth, usdt, usdc, priceData]) => {
			console.log('Portfolio data loaded:', { eth, usdt, usdc, priceData })
			
			setBalances([
				{ symbol: "ETH", name: "Ethereum", balance: eth, color: "from-blue-500 to-purple-600" },
				{ symbol: "USDT", name: "Tether", balance: usdt, color: "from-green-500 to-emerald-600" },
				{ symbol: "USDC", name: "USD Coin", balance: usdc, color: "from-blue-400 to-cyan-600" },
			])
			setPrices(priceData)
		}).catch(error => {
			console.error('Error loading portfolio data:', error);
			setError('Failed to load portfolio data. Please try again.')
		}).finally(() => {
			setLoading(false)
		})
	}, [mounted, address, wallet])

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

    // Calculate 24h change (mock data for now)
    const change24h = 2.37; // This could come from your API
    const isPositive = change24h > 0;

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

	// Mobile-first inline display for dashboard header
	return (
		<div className="space-y-2">
			{/* Main balance display */}
			<div className="flex items-baseline space-x-2">
				{loading ? (
					<div className="animate-pulse">
						<div className="h-8 w-32 bg-white/20 rounded"></div>
					</div>
				) : (
					<>
						<span className="text-3xl font-bold text-white">
							{formatValue(
								currencyDisplay === 'usd' ? totalValueUSD : totalValueNGN,
								currencyDisplay
							)}
						</span>
						{!loading && (
							<span className={`text-sm font-medium ${isPositive ? 'text-green-300' : 'text-red-300'}`}>
								{isPositive ? '+' : ''}{change24h}%
							</span>
						)}
					</>
				)}
			</div>

			{/* Currency toggle and quick stats */}
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={toggleCurrencyDisplay}
						className="text-xs text-blue-100 hover:text-white hover:bg-white/10 px-2 py-1 h-auto"
					>
						{currencyDisplay === 'usd' ? '→ NGN' : '→ USD'}
					</Button>
				</div>
				
				{!loading && (
					<div className="text-xs text-blue-100">
						{balances.filter(b => b.balance > 0).length} tokens
					</div>
				)}
			</div>

			{/* Expanded view - token breakdown (optional, can be toggled) */}
			{!loading && balances.some(b => b.balance > 0) && (
				<div className="mt-3 pt-3 border-t border-white/20">
					<div className="grid grid-cols-3 gap-2">
						{balances.filter(b => b.balance > 0).slice(0, 3).map((crypto) => {
							const token = supportedTokens.find((t) => t.symbol === crypto.symbol)
							const price = token ? prices[token.coingeckoId] : undefined
							const usdValue = price?.usd ? crypto.balance * price.usd : 0;
							const ngnValue = price?.ngn ? crypto.balance * price.ngn : 0;

							return (
								<div key={crypto.symbol} className="text-center">
									<div className="text-xs text-blue-100 font-medium">{crypto.symbol}</div>
									<div className="text-sm text-white">
										{showBalance 
											? formatValue(currencyDisplay === 'usd' ? usdValue : ngnValue, currencyDisplay)
											: "••••"
										}
									</div>
								</div>
							)
						})}
					</div>
				</div>
			)}
		</div>
	)
}