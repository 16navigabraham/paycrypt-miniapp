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
								{/* Outer green ring */}
								<div className="p-[2px] rounded-[14px] bg-[#d4ff16] inline-flex">
									{/* Middle white ring */}
									<div className="p-[4px] rounded-[12px] bg-white inline-flex">
										{/* Inner blue ring + icon */}
										<div
											className={`h-10 w-10 flex items-center justify-center rounded-[15px] border-[1.5px] border-[#1437ff] bg-white transition-all group-hover:scale-105`}
											style={{ boxShadow: '0 2px 4px 0 rgba(0,0,0,0.25)' }}
										>
											<Image src={action.icon} alt={action.name} width={16} height={16} className="object-contain" />
										</div>
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

			   {/* Convert CTA — pixel-perfect Figma style */}
			   <div className="mt-3 flex justify-center">
				   <Button
					   asChild
					   className="p-0 bg-gradient-to-r from-[#d4ff16] to-[#1437ff] border-0 shadow-lg rounded-[14px] transition-all hover:scale-[1.02]"
				   >
					   <Link
						   href={wallet?.address ? `/convert?wallet=${wallet.address}` : "/convert"}
						   className="block w-[284px] h-[50px]"
					   >
						   <div className="w-full h-full flex items-center justify-between px-4">
							   <span
								   className="text-center"
								   style={{
									   color: '#000',
									   textAlign: 'center',
									   fontFamily: 'Montserrat Alternates, sans-serif',
									   fontSize: '14px',
									   fontStyle: 'normal',
									   fontWeight: 400,
									   lineHeight: 'normal'
								   }}
							   >
								   Convert Cryptocurrency to Fiat
							   </span>
							   <div
								   className="inline-flex items-center justify-center"
								   style={{
									   width: 28,
									   height: 28,
									   borderRadius: 15,
									   border: '1.5px solid #1437FF',
									   background: '#FFFFFF',
									   boxShadow: '0 2px 4px 0 rgba(0,0,0,0.25)'
								   }}
							   >
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