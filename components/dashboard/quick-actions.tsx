"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"

const actions = [
	{ name: "Buy Airtime", icon: "/airtime.png", href: "/airtime", color: "from-green-500 to-emerald-600" },
	{ name: "Pay Internet Bills", icon: "/internet.png", href: "/internet", color: "from-purple-500 to-pink-600" },
	{ name: "Pay TV Bills", icon: "/tv.png", href: "/tv", color: "from-orange-500 to-red-600" },
	{ name: "Pay Electricity Bills", icon: "/electricity.png", href: "/electricity", color: "from-yellow-500 to-orange-600" },
	{ name: "Convert Crypto", icon: "/convert crypto.png", href: "/convert", color: "from-blue-500 to-purple-600" },
	{ name: "More Services", icon: "/more services.png", href: "/services", color: "from-gray-500 to-gray-600" },
]

export function QuickActions({ wallet }: { wallet: any }) {
	return (
		<div className="space-y-4">
			{/* Mobile-style grid layout - 4 columns to match Figma */}
			<div className="grid grid-cols-4 gap-3">
				{actions.map((action) => (
					<Button
						key={action.name}
						variant="ghost"
						className="h-auto p-0 flex flex-col items-center space-y-1.5 hover:bg-transparent border-0 transition-all group"
						asChild
					>
						<a href={action.href + (wallet?.address ? `?wallet=${wallet.address}` : "")} className="w-full">
							<div
								className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all mx-auto`}
							>
								<Image 
									src={action.icon} 
									alt={action.name}
									width={28}
									height={28}
									className="object-contain"
								/>
							</div>
							<span className="text-[10px] font-medium text-center text-gray-900 dark:text-gray-100 leading-tight w-full block px-1">
								{action.name.replace('Pay ', '').replace(' Bills', '')}
							</span>
						</a>
					</Button>
				))}
			</div>
		</div>
	)
}