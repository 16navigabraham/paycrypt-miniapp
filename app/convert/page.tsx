// app/convert/page.tsx
"use client"

import BackToDashboard from "@/components/BackToDashboard"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const partners = [
  {
    name: "Aboki.xyz",
    url: "https://www.aboki.xyz/",
    description: "Trusted P2P platform for crypto onramp and offramp."
  },
  // {
  //   name: "NairaEx",
  //   url: "https://nairaex.com",
  //   description: "Popular Nigerian crypto exchange supporting bank withdrawals."
  // },
  // {
  //   name: "Busha",
  //   url: "https://www.busha.co",
  //   description: "Instant crypto to fiat with wallet services."
  // },
  // {
  //   name: "YellowCard",
  //   url: "https://yellowcard.io",
  //   description: "Global crypto exchange for African markets."
  // },
]

export default function ConvertPage() {
  return (
      <div className="w-96 h-[812px] relative bg-white rounded-[60px] overflow-hidden">
          <div className="absolute left-4 right-4 top-4 z-20 flex items-center gap-2 px-4 py-2 bg-white/90 rounded-xl shadow-sm">
            <BackToDashboard />
            <div className="text-black text-lg font-medium font-['Montserrat_Alternates'] tracking-[1.5px]">
              Crypto to Airtime Payment
            </div>
          </div>
    
          <div className="w-80 h-[643px] left-[25px] top-[140px] absolute bg-white/90 rounded-[45px] border-2 border-lime-400 p-6 overflow-hidden">
            <div className="flex flex-col gap-4 h-full">
    

      <div className="space-y-4">
        {partners.map((partner) => (
          <div key={partner.name} className="w-72 p-[1.5px] rounded-[15px] bg-gradient-to-r from-[#d4ff16] to-[#1437FF]">
            <div className="bg-white rounded-[13.5px] p-3">
              <div className="font-semibold">{partner.name}</div>
              <div className="text-xs text-muted-foreground mb-2">{partner.description}</div>
              <Link
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                Visit {partner.name}
              </Link>
            </div>
          </div>
            
        ))}
      </div>
      </div>
      </div>
      </div>    
  )
}