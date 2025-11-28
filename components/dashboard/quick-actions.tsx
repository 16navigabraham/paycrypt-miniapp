"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

const actions = [
	{ name: "Airtime", icon: "/airtime.png", href: "/airtime", color: "from-green-500 to-emerald-600" },
	{ name: "Data", icon: "/internet.png", href: "/internet", color: "from-purple-500 to-pink-600" },
	{ name: "TV/Cables", icon: "/tv.png", href: "/tv", color: "from-orange-500 to-red-600" },
	{ name: "Electricity", icon: "/electricity.png", href: "/electricity", color: "from-yellow-500 to-orange-600" },
]

export function QuickActions({ wallet }: { wallet: any }) {
	 return (
	 	<div className="space-y-4">
	 		{/* Figma-style grid layout - 3 columns */}
	 		<div className="grid grid-cols-3 gap-4">
				{actions.map((action) => (
						<Button
							key={action.name}
							variant="ghost"
							className="h-auto p-0 flex flex-col items-center space-y-1.5 hover:bg-transparent border-0 transition-all group"
							asChild
						>
							<a aria-label={action.name} href={action.href + (wallet?.address ? `?wallet=${wallet.address}` : "")} className="w-full">
								<div
									className={`h-20 w-20 rounded-[16px] bg-gradient-to-br ${action.color} flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all mx-auto`}
								>
									<Image 
										src={action.icon} 
										alt={action.name}
										width={40}
										height={40}
										className="object-contain"
									/>
								</div>
					 			<span className="text-[12px] font-semibold text-center text-[#1437ff] leading-tight w-full block px-1 mt-1">
					 				{action.name}
					 			</span>
							</a>
						</Button>
				))}
			</div>

			   {/* Convert CTA — pixel-perfect Figma style */}
			   <div className="mt-2">
				   <Button asChild className="w-full p-0 bg-gradient-to-r from-[#d4ff16] to-[#1437ff] border-0 shadow-lg rounded-2xl transition-all hover:scale-[1.02]">
					   <Link href={wallet?.address ? `/convert?wallet=${wallet.address}` : '/convert'} className="block w-full">
						   <div className="w-full flex items-center justify-between px-4 py-3">
							   <span className="text-base font-bold text-white drop-shadow-sm tracking-wide">Convert Crypto to Fiat</span>
							   <div className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white shadow-md">
								   <Image src="/convert crypto.png" alt="convert" width={22} height={22} className="object-contain" />
							   </div>
						   </div>
					   </Link>
				   </Button>
			   </div>
			</div>
		)
}