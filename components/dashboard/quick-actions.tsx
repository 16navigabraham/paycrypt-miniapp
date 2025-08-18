"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, Smartphone, Tv, Zap, Wifi, Plus } from "lucide-react"

const actions = [
	{ name: "Buy Airtime", icon: Smartphone, href: "/airtime", color: "from-green-500 to-emerald-600" },
	{ name: "Pay Internet Bills", icon: Wifi, href: "/internet", color: "from-purple-500 to-pink-600" },
	{ name: "Pay TV Bills", icon: Tv, href: "/tv", color: "from-orange-500 to-red-600" },
	{ name: "Pay Electricity Bills", icon: Zap, href: "/electricity", color: "from-yellow-500 to-orange-600" },
	{ name: "Convert Crypto", icon: ArrowUpDown, href: "/convert", color: "from-blue-500 to-purple-600" },
	{ name: "More Services", icon: Plus, href: "/services", color: "from-gray-500 to-gray-600" },
]

export function QuickActions({ wallet }: { wallet: any }) {
	return (
		<div className="space-y-4">
			{/* Mobile-style grid layout */}
			<div className="grid grid-cols-3 gap-3">
				{actions.map((action) => (
					<Button
						key={action.name}
						variant="ghost"
						className="h-auto p-3 flex flex-col items-center space-y-2 bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-2xl border-0 transition-all group"
						asChild
					>
						<a href={action.href + (wallet?.address ? `?wallet=${wallet.address}` : "")}>
							<div
								className={`h-12 w-12 rounded-2xl bg-gradient-to-r ${action.color} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}
							>
								<action.icon className="h-6 w-6 text-white" />
							</div>
							<span className="text-xs font-medium text-center text-gray-700 dark:text-gray-300 leading-tight">
								{action.name}
							</span>
						</a>
					</Button>
				))}
			</div>
		</div>
	)
}