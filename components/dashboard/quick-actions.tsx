"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

const actions = [
	{ name: "Airtime", icon: "/airtime.png", href: "/airtime" },
	{ name: "Data", icon: "/internet.png", href: "/internet" },
	{ name: "TV/Cables", icon: "/tv.png", href: "/tv" },
	{ name: "Electricity", icon: "/electricity.png", href: "/electricity" },
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
								{/* Single white capsule with gradient border (pixel-perfect) */}
								<div className="p-[1.5px] rounded-[14px] bg-gradient-to-r from-[#d4ff16] to-[#1437FF] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.15)] transition-all group-hover:scale-105">
									<div className="w-12 h-12 bg-white rounded-[12px] flex items-center justify-center">
										<Image src={action.icon} alt={action.name} width={16} height={16} className="object-contain" />
									</div>
								</div>
							</div>
							<span
								className="w-full block px-1 mt-1"
								style={{
									color: '#000',
									textAlign: 'center',
									fontFamily: 'Montserrat Alternates, sans-serif',
									fontSize: '11px',
									fontStyle: 'normal',
									fontWeight: 300,
									lineHeight: 'normal'
								}}
							>
								{action.name}
							</span>
						</a>
					</Button>
				))}
			</div>

			   {/* Convert CTA — exact Figma rectangle */}
			   <div className="mt-3 flex justify-center">
				   {/* Gradient border wrapper to match Figma (green -> blue) */}
				   <div className="p-[1.5px] rounded-[15px] bg-gradient-to-r from-[#d4ff16] to-[#1437FF] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.15)]">
					   <Button asChild className="p-0 bg-white rounded-[13px]">
						   <Link
							   href={wallet?.address ? `/convert?wallet=${wallet.address}` : "/convert"}
							   className="block w-[284px] h-[50px] flex items-center justify-between px-4"
						   >
							   <span className="text-black text-[14px] font-[Montserrat_Alternates,ui-sans-serif,system-ui]">
								   Convert Cryptocurrency to Fiat
							   </span>
							   {/* small icon capsule with gradient border */}
							   <div className="p-[1.5px] rounded-[15px] bg-gradient-to-r from-[#d4ff16] to-[#1437FF]">
								   <div className="inline-flex items-center justify-center w-[28px] h-[28px] rounded-[13px] bg-white">
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
			</div>
		)
}