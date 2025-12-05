"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Eye, EyeOff, TrendingUp, Network } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMiniAppWallet } from "@/hooks/useMiniAppWallet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { getTokensForChain } from "@/lib/tokenlist"

// RPC endpoints for different chains
const getRpcUrl = (chainId: number): string => {
	const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
	switch (chainId) {
		case 8453: // Base
			return `https://base-mainnet.g.alchemy.com/v2/${apiKey}`;
		case 1135: // Lisk
			return 'https://rpc.api.lisk.com';
		case 42220: // Celo
			return `https://celo-mainnet.g.alchemy.com/v2/${apiKey}`;
		default:
			return `https://base-mainnet.g.alchemy.com/v2/${apiKey}`;
	}
};

// Fetch native token balance (ETH for Base, ETH for Lisk, CELO for Celo)
async function fetchNativeBalance(address: string, chainId: number) {
	try {
		const url = getRpcUrl(chainId);
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
			console.error(`RPC error for chain ${chainId}:`, res.status, res.statusText);
			return 0;
		}
		const data = await res.json();
		if (data.result) {
			return parseInt(data.result, 16) / 1e18;
		}
		console.warn(`Invalid balance response for chain ${chainId}:`, data);
		return 0;
	} catch (error) {
		console.error(`Error fetching native balance for chain ${chainId}:`, error);
		return 0;
	}
}

// Fetch token balances for a specific chain
async function fetchTokenBalances(address: string, chainId: number, contractAddresses: string[]) {
	try {
		const url = getRpcUrl(chainId);
		
		// Use Alchemy's alchemy_getTokenBalances for Alchemy-supported chains (Base, Celo)
		if (chainId === 8453 || chainId === 42220) {
			const res = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method: 'alchemy_getTokenBalances',
					params: [address, contractAddresses],
				}),
			});
			
			if (!res.ok) {
				console.error(`Token API error for chain ${chainId}:`, res.status);
				return {};
			}
			
			const data = await res.json();
			const balances: Record<string, number> = {};
			
			if (data.result?.tokenBalances) {
				data.result.tokenBalances.forEach((tb: any) => {
					const addr = tb.contractAddress.toLowerCase();
					balances[addr] = tb.tokenBalance ? parseInt(tb.tokenBalance, 16) : 0;
				});
			}
			return balances;
		}
		
		// For Lisk and other chains, use standard eth_call with balanceOf
		const balances: Record<string, number> = {};
		for (const contract of contractAddresses) {
			try {
				const data = `0x70a08231000000000000000000000000${address.slice(2)}`; // balanceOf(address)
				const res = await fetch(url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 1,
						method: 'eth_call',
						params: [{ to: contract, data }, 'latest'],
					}),
				});
				
				if (res.ok) {
					const result = await res.json();
					if (result.result) {
						balances[contract.toLowerCase()] = parseInt(result.result, 16);
					}
				}
			} catch (err) {
				console.error(`Error fetching balance for ${contract}:`, err);
			}
		}
		return balances;
	} catch (error) {
		console.error(`Error fetching token balances for chain ${chainId}:`, error);
		return {};
	}
}

// Fetch prices for all tokens
async function fetchPrices(coingeckoIds: string[]) {
	try {
		const ids = [...new Set(coingeckoIds)].join(","); // Remove duplicates
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

	// Detect if running inside Farcaster
	const [isFarcaster, setIsFarcaster] = useState(false);

	// Use simple mini app wallet hook with chain info
	const { 
		address, 
		chainIdNumber, 
		isOnBaseChain, 
		isOnLiskChain, 
		isOnCeloChain,
		switchToBaseChain,
		switchToLiskChain,
		switchToCeloChain,
		isSwitchingChain 
	} = useMiniAppWallet();

	// Get current chain name for display
	const getChainName = () => {
		if (isOnBaseChain) return "Base";
		if (isOnLiskChain) return "Lisk";
		if (isOnCeloChain) return "Celo";
		return "Unknown";
	};

	// Get chain color for the indicator
	const getChainColor = () => {
		if (isOnBaseChain) return "#0052FF"; // Base blue
		if (isOnLiskChain) return "#4070F4"; // Lisk blue
		if (isOnCeloChain) return "#FCFF52"; // Celo yellow
		return "#1687FF"; // Default
	};

	// Handle network switch
	const handleNetworkSwitch = async (network: 'base' | 'lisk' | 'celo') => {
		try {
			console.log(`Attempting to switch to ${network} network...`);
			switch (network) {
				case 'base':
					await switchToBaseChain();
					toast.success("Switched to Base network");
					break;
				case 'lisk':
					await switchToLiskChain();
					toast.success("Switched to Lisk network");
					break;
				case 'celo':
					await switchToCeloChain();
					toast.success("Switched to Celo network");
					break;
			}
			console.log(`Successfully switched to ${network}`);
		} catch (error) {
			toast.error("Failed to switch network. Please try again.");
			console.error("Network switch error:", error);
		}
	};

	// Set mounted and detect Farcaster
	useEffect(() => {
		setMounted(true);
		// Detect if running inside Farcaster frame
		const isInFarcaster = typeof window !== 'undefined' && 
			(window.location.hostname.includes('farcaster') || 
			 window.location.hostname.includes('warpcast') ||
			 document.referrer.includes('farcaster') ||
			 document.referrer.includes('warpcast'));
		setIsFarcaster(isInFarcaster);
	}, []);

	useEffect(() => {
		if (!mounted) return;

		// Use address from mini app hook or wallet prop
		const walletAddress = address || wallet?.address;

		if (!walletAddress || !chainIdNumber) {
			console.log('No wallet address or chain available', { address: walletAddress, chainIdNumber });
			return;
		}

		console.log(`Loading portfolio for address: ${walletAddress} on chain: ${chainIdNumber} (${getChainName()})`);
		setLoading(true);
		setError(null);

		// Get tokens for the current chain
		const chainTokens = getTokensForChain(chainIdNumber);
		const tokenContracts = chainTokens.map(t => t.address);
		const allCoingeckoIds = chainTokens.map(t => t.coingeckoId);
		
		console.log(`Chain ${chainIdNumber} tokens:`, chainTokens.map(t => t.symbol));

		Promise.all([
			fetchNativeBalance(walletAddress, chainIdNumber),
			fetchTokenBalances(walletAddress, chainIdNumber, tokenContracts),
			fetchPrices(allCoingeckoIds),
		]).then(([nativeBalance, tokenBalancesMap, priceData]) => {
			// Build balances array
			const newBalances: any[] = [];

			// Add native token based on chain
			let nativeSymbol = "ETH";
			let nativeCoingeckoId = "ethereum";
			if (chainIdNumber === 42220) {
				nativeSymbol = "CELO";
				nativeCoingeckoId = "celo";
			}
			
			newBalances.push({
				symbol: nativeSymbol,
				name: nativeSymbol === "CELO" ? "Celo" : "Ethereum",
				balance: nativeBalance,
				coingeckoId: nativeCoingeckoId,
				color: "from-blue-500 to-purple-600"
			});

			// Add ERC20 tokens
			chainTokens.forEach(token => {
				const rawBalance = tokenBalancesMap[token.address.toLowerCase()] || 0;
				const balance = rawBalance / Math.pow(10, token.decimals);
				
				newBalances.push({
					symbol: token.symbol,
					name: token.name,
					balance,
					coingeckoId: token.coingeckoId,
					color: getTokenColor(token.symbol),
				});
			});

			setBalances(newBalances);
			setPrices(priceData);
		}).catch(error => {
			console.error('Error loading portfolio data:', error);
			setError('Failed to load portfolio data. Please try again.');
		}).finally(() => {
			setLoading(false);
		});
	}, [mounted, address, wallet, chainIdNumber]);

	// Helper to get token color
	const getTokenColor = (symbol: string) => {
		const colorMap: Record<string, string> = {
			'USDT': 'from-green-500 to-emerald-600',
			'USDC': 'from-blue-400 to-cyan-600',
			'SEND': 'from-purple-500 to-pink-600',
			'cUSD': 'from-yellow-400 to-orange-500',
			'CELO': 'from-green-400 to-teal-500',
		};
		return colorMap[symbol] || 'from-gray-400 to-gray-600';
	};

	 // Calculate total value in USD
    const totalValueUSD = balances.reduce((sum, b) => {
        const price = prices[b.coingeckoId]?.usd || 0;
        return sum + (b.balance * price);
    }, 0)

    // Calculate total value in NGN
    const totalValueNGN = balances.reduce((sum, b) => {
        const price = prices[b.coingeckoId]?.ngn || 0;
        return sum + (b.balance * price);
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

	// Mask wallet address like: 0xe...Df3 (first 3 chars, ellipsis, last 3 chars)
	const maskAddress = (addr: string) => {
		if (!addr) return ''
		if (addr.length <= 6) return addr
		return `${addr.slice(0, 3)}...${addr.slice(-3)}`
	}

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
				className="absolute left-0 top-0 rounded-t-[40px] z-0 w-full max-w-[375px]"
				style={{
					width: '100%',
					maxWidth: '375px',
					aspectRatio: '375/316',
					// Composite gradients per spec
					background: 'linear-gradient(158deg, rgba(0, 0, 0, 0.00) 45.14%, rgba(20, 55, 255, 0.70) 101.86%), linear-gradient(184deg, #000 60.2%, #D4FF16 116.67%)',
					backgroundSize: 'cover',
				}}
			/>

			{/* Grid overlay (public PNG) */}
			<img
				src="/pngtree-white-grid-cartoon.png"
				alt="grid overlay"
				className="absolute left-0 top-0 object-cover opacity-20 pointer-events-none z-0 rounded-t-[40px] w-full max-w-[375px]"
				style={{ width: '100%', maxWidth: 375, aspectRatio: '375/316' }}
			/>

			{/* Main balance card */}
			<div className="relative z-10 flex flex-col items-center justify-center w-full pt-6 pb-4">
				{/* Wallet address badge with network switcher (Figma style) */}
				{(wallet?.address || address) && (
					<div className="flex items-center justify-center mb-2 gap-2">
						{/* Wallet address badge */}
						<div className="h-[20px] flex items-center justify-center gap-2 rounded-[10px] border bg-white px-2" 
							style={{ borderColor: getChainColor() }}
							role="group" 
							aria-label="Wallet address">
							{/* Status dot with chain color */}
							<div
								style={{ 
									width: 8, 
									height: 8, 
									borderRadius: '50%',
									backgroundColor: getChainColor(),
									filter: 'blur(2.5px)',
									boxShadow: `0 0 6px ${getChainColor()}`
								}}
								aria-hidden="true"
							/>
							{/* Masked address */}
							<span className="font-['Montserrat_Alternates:Medium',sans-serif] text-[12px] text-black truncate px-1">
								{maskAddress(address || wallet?.address)}
							</span>
						</div>

						{/* Network Switcher Dropdown - Hidden in Farcaster */}
						{!isFarcaster && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										className="h-[20px] w-[20px] flex items-center justify-center rounded-full border bg-white hover:bg-gray-50 transition-colors"
										style={{ borderColor: getChainColor() }}
										aria-label="Switch network"
										disabled={isSwitchingChain}
									>
										{isSwitchingChain ? (
											<div className="animate-spin h-3 w-3 border border-gray-400 border-t-transparent rounded-full" />
										) : (
											<Network className="h-3 w-3" style={{ color: getChainColor() }} />
										)}
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="center" className="w-32">
									<DropdownMenuItem 
										onClick={() => handleNetworkSwitch('base')}
										className="cursor-pointer"
										disabled={isOnBaseChain}
									>
										<div className="flex items-center gap-2">
											<div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#0052FF' }} />
											<span className={isOnBaseChain ? 'font-semibold' : ''}>Base</span>
										</div>
									</DropdownMenuItem>
									<DropdownMenuItem 
										onClick={() => handleNetworkSwitch('lisk')}
										className="cursor-pointer"
										disabled={isOnLiskChain}
									>
										<div className="flex items-center gap-2">
											<div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4070F4' }} />
											<span className={isOnLiskChain ? 'font-semibold' : ''}>Lisk</span>
										</div>
									</DropdownMenuItem>
									<DropdownMenuItem 
										onClick={() => handleNetworkSwitch('celo')}
										className="cursor-pointer"
										disabled={isOnCeloChain}
									>
										<div className="flex items-center gap-2">
											<div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FCFF52' }} />
											<span className={isOnCeloChain ? 'font-semibold' : ''}>Celo</span>
										</div>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
				)}

				{/* Main balance display - Figma style with frosted pill (includes currency toggle) */}
				<div className="flex flex-col items-center justify-center">
					{loading ? (
						<div className="animate-pulse">
							<div className="h-12 w-40 bg-white/20 rounded"></div>
						</div>
					) : (
						<div className="relative flex flex-col items-center">
							<div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full flex items-center justify-center drop-shadow-lg space-x-3">
								{showBalance ? (
									<span
										role="button"
										aria-label="Toggle currency display"
										tabIndex={0}
										onClick={toggleCurrencyDisplay}
										onKeyDown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												toggleCurrencyDisplay();
											}
										}}
										style={{
											color: '#FFF',
											textAlign: 'center',
											fontFamily: 'Montserrat, sans-serif',
											fontSize: '48px',
											fontStyle: 'normal',
											fontWeight: 500,
											lineHeight: 'normal',
											letterSpacing: '2.4px',
											cursor: 'pointer'
										}}
									>
										{formatValue(
											currencyDisplay === 'usd' ? totalValueUSD : totalValueNGN,
											currencyDisplay
										)}
									</span>
								) : (
									<span
										aria-hidden
										style={{
											color: '#FFF',
											textAlign: 'center',
											fontFamily: 'Montserrat Alternates, sans-serif',
											fontSize: '62px',
											fontStyle: 'normal',
											fontWeight: 500,
											lineHeight: 'normal',
											letterSpacing: '9.3px'
										}}
									>
										****
									</span>
								)}
								<button
									aria-label={showBalance ? 'Hide balance' : 'Show balance'}
									onClick={toggleBalanceVisibility}
									className="inline-flex items-center justify-center p-0 rounded-full"
									style={{ width: 16, height: 16 }}
								>
									{/* Visible / Hidden button visual — keep tappable button but use background images for the icon */}
									<div
										style={{
											width: '16px',
											height: '16px',
											aspectRatio: '1/1',
											background: showBalance
												? "url('/eye.png') lightgray 50% / cover no-repeat"
												: "url('/eye-off.png') lightgray 50% / cover no-repeat",
											WebkitBackgroundSize: 'cover',
											backgroundSize: 'cover'
										}}
									/>
								</button>
							</div>

							{/* Currency toggles when user clicks the balance digits (accessibility: Enter/Space) */}
						</div>
					)}
				</div>
			</div>

		</div>
	)
}