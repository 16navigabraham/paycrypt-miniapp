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

const imgPngtreeWhiteGridCartoonPngMaterial46759121 = "https://www.figma.com/api/mcp/asset/0cd7906c-bcfd-4b4f-8a51-de6de026a2fc"

export function QuickActions({ wallet }: { wallet: any }) {
	 return (
	 	<div className="relative space-y-6">
	 		{/* Figma-style grid layout - 3 columns */}
			<div className="grid grid-cols-4 gap-3 relative">
				{/* Grid overlay (Figma asset) */}
				<img
					src={imgPngtreeWhiteGridCartoonPngMaterial46759121}
					alt="grid overlay"
					className="absolute left-0 top-0 w-full h-full object-cover opacity-20 pointer-events-none z-0 rounded-lg"
				/>

				{actions.map((action) => (
					<Button
						key={action.name}
						variant="ghost"
						className="h-auto p-0 flex flex-col items-center space-y-1 hover:bg-transparent border-0 transition-all group relative z-10"
						asChild
					>
						<a aria-label={action.name} href={action.href + (wallet?.address ? `?wallet=${wallet.address}` : "")} className="w-full">
							<div className="mx-auto">
								<div className="p-[2px] rounded-[14px] bg-white inline-flex">
									<div
										className={`h-10 w-10 rounded-[12px] bg-gradient-to-br ${action.color} flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all`}
									>
										<Image src={action.icon} alt={action.name} width={16} height={16} className="object-contain" />
									</div>
								</div>
							</div>
							<span className="text-[11px] font-medium text-center text-[#1437ff] leading-tight w-full block px-1 mt-1">{action.name}</span>
						</a>
					</Button>
				))}
			</div>

			   {/* Convert CTA — pixel-perfect Figma style */}
			   <div className="mt-3">
				   <Button
					   asChild
					   className="w-full p-0 bg-gradient-to-r from-[#d4ff16] to-[#1437ff] border-0 shadow-lg rounded-[14px] transition-all hover:scale-[1.02]"
				   >
					   <Link
						   href={wallet?.address ? `/convert?wallet=${wallet.address}` : "/convert"}
						   className="block w-full"
					   >
						   <div className="w-full flex items-center justify-between px-3 py-2">
							   <span className="text-sm font-semibold text-white drop-shadow-sm tracking-normal">
								   Convert Cryptocurrency to Fiat
							   </span>
							   <div className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-white shadow-md border border-white/40">
								   <Image
								   src="/convert crypto.png"
								   alt="convert"
								   width={16}
								   height={16}
								   className="object-contain"
								   />
							   </div>
						   </div>
					   </Link>
				   </Button>
			   </div>
			</div>
		)
}