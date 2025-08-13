"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Wallet, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSafeWagmi } from "@/hooks/useSafeWagmi"

// Base chain contract addresses (update if needed)
const USDT_CONTRACT = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"
const USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

const supportedTokens = [
	{ symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", color: "from-blue-500 to-purple-600" },
	{ symbol: "USDT", name: "Tether", coingeckoId: "tether", color: "from-green-500 to-emerald-600", contract: USDT_CONTRACT, decimals: 6 },
	{ symbol: "USDC", name: "USD Coin", coingeckoId: "usd-coin", color: "from-blue-400 to-cyan-600", contract: USDC_CONTRACT, decimals: 6 },
]

async function fetchEthBalance(address: string) {
	const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY
	const res = await fetch(
		`https://api.etherscan.io/v2/api?chainid=8453&module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`
	)
	const data = await res.json()
	if (data.status === "1") {
		return Number(data.result) / 1e18
	}
	return 0
}

async function fetchErc20Balance(address: string, contract: string, decimals: number) {
	const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY
	const res = await fetch(
		`https://api.etherscan.io/v2/api?chainid=8453&module=account&action=tokenbalance&contractaddress=${contract}&address=${address}&tag=latest&apikey=${apiKey}`
	)
	const data = await res.json()
	if (data.status === "1") {
		return Number(data.result) / 10 ** decimals
	}
	return 0
}

async function fetchPrices() {
	const ids = supportedTokens.map((t) => t.coingeckoId).join(",")
	const res = await fetch(
		`https://paycrypt-margin-price.onrender.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,ngn`
	)
	return await res.json()
}

export function PortfolioOverview({ wallet }: { wallet: any }) {
	const [mounted, setMounted] = useState(false);
	const [balances, setBalances] = useState<any[]>([])
	const [prices, setPrices] = useState<any>({})
	const [loading, setLoading] = useState(false)
    const [showBalance, setShowBalance] = useState(true)
    const [currencyDisplay, setCurrencyDisplay] = useState<'usd' | 'ngn'>('usd')

	// Use safe wagmi hook
	const { address } = useSafeWagmi();

	// Set mounted
	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!mounted) return;
		
		// Use address from safe wagmi hook or wallet prop
		const walletAddress = address || wallet?.address;
		if (!walletAddress) return;
		
		setLoading(true)
		Promise.all([
			fetchEthBalance(walletAddress),
			fetchErc20Balance(walletAddress, USDT_CONTRACT, 6),
			fetchErc20Balance(walletAddress, USDC_CONTRACT, 6),
			fetchPrices(),
		]).then(([eth, usdt, usdc, priceData]) => {
			setBalances([
				{ symbol: "ETH", name: "Ethereum", balance: eth, color: "from-blue-500 to-purple-600" },
				{ symbol: "USDT", name: "Tether", balance: usdt, color: "from-green-500 to-emerald-600" },
				{ symbol: "USDC", name: "USD Coin", balance: usdc, color: "from-blue-400 to-cyan-600" },
			])
			setPrices(priceData)
			setLoading(false)
		}).catch(error => {
			console.error('Error loading portfolio data:', error);
			setLoading(false);
		})
	}, [mounted, address, wallet])

	 // Calculate total value in USD
    const totalValueUSD = balances.reduce((sum, b) => {
        const token = supportedTokens.find((t) => t.symbol === b.symbol)
        const price = token && prices[token.coingeckoId]?.usd ? prices[token.coingeckoId].usd : 0
        return sum + b.balance * price
    }, 0)

    // Calculate total value in NGN
    const totalValueNGN = balances.reduce((sum, b) => {
        const token = supportedTokens.find((t) => t.symbol === b.symbol)
        const price = token && prices[token.coingeckoId]?.ngn ? prices[token.coingeckoId].ngn : 0
        return sum + b.balance * price
    }, 0)
    
    // Helper function to format the value based on visibility and selected currency
    const formatValue = (value: number, currency: 'usd' | 'ngn') => {
        if (!showBalance) {
            return "********"
        }
        return currency === 'usd'
            ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
            : `₦${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }

    // Toggle functions for the new states
    const toggleBalanceVisibility = () => setShowBalance((prev) => !prev)
    const toggleCurrencyDisplay = () => setCurrencyDisplay((prev) => (prev === 'usd' ? 'ngn' : 'usd'))

	// Don't render until mounted
	if (!mounted) {
		return (
			<Card className="shadow-lg border-2 hover:shadow-xl transition-shadow">
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<Wallet className="h-5 w-5 text-blue-600" />
						<span>Portfolio Overview</span>
					</CardTitle>
					<CardDescription>Loading your portfolio...</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="animate-pulse space-y-4">
						<div className="h-8 bg-gray-200 rounded"></div>
						<div className="h-4 bg-gray-200 rounded"></div>
					</div>
				</CardContent>
			</Card>
		);
	}

return (
        <Card className="shadow-lg border-2 hover:shadow-xl transition-shadow">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Wallet className="h-5 w-5 text-blue-600" />
                        <span>Portfolio Overview</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        {/* Toggle Balance Visibility Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleBalanceVisibility}
                            className="text-muted-foreground hover:text-blue-500"
                            aria-label={showBalance ? "Hide Balance" : "Show Balance"}
                        >
                            {showBalance ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </Button>
                        {/* Toggle Currency Display Button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleCurrencyDisplay}
                            className="text-sm font-semibold text-muted-foreground hover:text-blue-500"
                            aria-label={`Switch to ${currencyDisplay === 'usd' ? 'Naira' : 'Dollar'}`}
                        >
                            {currencyDisplay === 'usd' ? "NGN" : "USD"}
                        </Button>
                    </div>
                </CardTitle>
                <CardDescription>Your cryptocurrency holdings and performance</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center space-x-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span className="text-2xl font-bold">
                                    {loading
                                        ? "Loading..."
                                        : formatValue(
                                              currencyDisplay === 'usd' ? totalValueUSD : totalValueNGN,
                                              currencyDisplay
                                          )}
                                </span>
                            </div>
                        </div>
                    </div>
                        <div className="grid gap-4 md:grid-cols-2">
                        {balances.map((crypto) => {
                            const token = supportedTokens.find((t) => t.symbol === crypto.symbol)
                            const price = token ? prices[token.coingeckoId] : undefined

                            // Calculate value in both currencies for individual tokens
                            const usdValue = price?.usd ? crypto.balance * price.usd : 0;
                            const ngnValue = price?.ngn ? crypto.balance * price.ngn : 0;

                            return (
                                <div
                                    key={crypto.symbol}
                                    className="flex items-center justify-between p-3 rounded-lg border-2 hover:border-blue-200 dark:hover:border-blue-800 transition-colors bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div
                                            className={`h-8 w-8 rounded-full bg-gradient-to-r ${crypto.color} flex items-center justify-center shadow-md`}
                                        >
                                            <span className="text-white font-bold text-xs">{crypto.symbol.slice(0, 2)}</span>
                                        </div>
                                        <div>
                                            <div className="font-medium">{crypto.symbol}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {showBalance ? `${crypto.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${crypto.symbol}` : "********"}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium">
                                            {loading ? "--" : formatValue(currencyDisplay === 'usd' ? usdValue : ngnValue, currencyDisplay)}
                                        </div>
                                        <Badge variant="default" className="text-xs mt-1">
                                            {loading ? "--" : (
                                                showBalance ? (
                                                    currencyDisplay === 'usd'
                                                        ? `₦${ngnValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                                                        : `$${usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                                                ) : "********"
                                            )}
                                      </Badge>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}