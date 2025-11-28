"use client"

import { useEffect, useState } from "react"
import { getUserHistory } from "@/lib/api"
import Link from "next/link"
import { TransactionReceiptModal } from "@/components/TransactionReceiptModal"
import { Button } from "@/components/ui/button"
import { Tv, Zap, Phone, Wifi } from 'lucide-react'
import { useMemo } from 'react'
import { useMiniAppWallet } from "@/hooks/useMiniAppWallet"
import * as htmlToImage from 'html-to-image'
import download from 'downloadjs'
import React from 'react'

interface Transaction {
  requestId: string
  userAddress: string
  transactionHash: string
  serviceType: string
  serviceID: string
  variationCode?: string
  customerIdentifier: string
  amountNaira: number
  cryptoUsed: number
  cryptoSymbol: string
  onChainStatus: string
  vtpassStatus: string
  vtpassResponse?: any
  createdAt: string
  prepaid_token: string
  units: string
  customer_name: string
  customer_address: string
}

interface Props {
  wallet: { address: string } | null
}

// Small helper component: attempts to load an icon from /public, falls back to lucide icon
function ServiceIcon({ serviceType }: { serviceType: string }) {
  const [useFallback, setUseFallback] = useState(false)

  const key = (serviceType || '').toLowerCase()
  const src = useMemo(() => {
    if (key.includes('tv')) return '/tv.png'
    if (key.includes('electric')) return '/electricity.png'
    if (key.includes('data') || key.includes('internet')) return '/internet.png'
    if (key.includes('airtime') || key.includes('air')) return '/airtime.png'
    // default
    return '/airtime.png'
  }, [key])

  if (useFallback) {
    if (key.includes('tv')) return <Tv className="h-5 w-5 text-[#1437ff]" />
    if (key.includes('electric')) return <Zap className="h-5 w-5 text-[#1437ff]" />
    if (key.includes('data') || key.includes('internet')) return <Wifi className="h-5 w-5 text-[#1437ff]" />
    return <Phone className="h-5 w-5 text-[#1437ff]" />
  }

  return (
    <img
      src={src}
      alt={serviceType}
      className="h-5 w-5 object-contain"
      onError={() => setUseFallback(true)}
    />
  )
}

const imgRecentTransactionsGridOverlay = "https://www.figma.com/api/mcp/asset/0cd7906c-bcfd-4b4f-8a51-de6de026a2fc";

export default function RecentTransactions({ wallet }: Props) {
  const [mounted, setMounted] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Transaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Use simple mini app wallet hook
  const { address, isConnected } = useMiniAppWallet();

  // Set mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchHistory = async () => {
      // Use address from mini app hook or wallet prop
      const walletAddress = address || wallet?.address;
      
      if (walletAddress) {
        try {
          setLoading(true)
          const data = await getUserHistory(walletAddress)
          setTransactions(data.orders.slice(0, 5))
        } catch (err) {
          console.error("Failed to fetch recent transactions:", err)
        } finally {
          setLoading(false)
        }
      }
    }

    fetchHistory()
  }, [mounted, wallet, address, isConnected])

  const openModal = (txn: Transaction) => {
    setSelectedOrder(txn)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedOrder(null)
  }

  const downloadAsImage = async () => {
    const node = document.getElementById("printable-receipt")
    if (!node) return

    try {
      const dataUrl = await htmlToImage.toPng(node)
      if (selectedOrder)
        download(dataUrl, `receipt-${selectedOrder.requestId}.png`)
    } catch (error) {
      console.error("Failed to generate image:", error)
    }
  }

  // Don't render until mounted
  if (!mounted) {
    return (
      <div className="bg-white dark:bg-black border p-4 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }


  return (
    <div className="relative bg-white dark:bg-black border p-3 rounded-lg shadow-sm overflow-visible">
      {/* Grid overlay (Figma asset) */}
      <img src={imgRecentTransactionsGridOverlay} alt="grid overlay" className="absolute left-0 top-0 w-full h-full object-cover opacity-20 pointer-events-none z-0 rounded-lg" />

      <h2 className="text-base font-semibold mb-2 relative z-10">Recent Transactions</h2>
      {loading && <p className="text-muted-foreground relative z-10">Loading...</p>}
      {!loading && transactions.length === 0 && (
        <p className="text-muted-foreground relative z-10">No recent transactions found.</p>
      )}
      <ul className="space-y-2 relative z-10">
        {transactions.map((txn) => (
          <li key={txn.requestId} className="text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0">
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center mr-3 overflow-hidden">
                  <ServiceIcon serviceType={txn.serviceType} />
                </div>

                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {txn.serviceType} • ₦{txn.amountNaira} • {txn.cryptoUsed.toFixed(4)} {txn.cryptoSymbol}
                  </div>
                  <div className="text-muted-foreground text-xs mt-1">
                    {new Date(txn.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end ml-3">
                <span className={`text-sm font-semibold ${
                    txn.vtpassStatus === "successful"
                      ? "text-green-600"
                      : txn.vtpassStatus === "pending"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}>{txn.vtpassStatus === 'successful' ? 'Successful' : txn.vtpassStatus}</span>
                <Button size="sm" variant="outline" className="text-xs h-7 py-1 px-2 mt-2" onClick={() => openModal(txn)}>Print</Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="text-right mt-3 relative z-10">
        <Link href="/history" className="text-blue-500 hover:underline text-sm">
          View All →
        </Link>
      </div>

      {selectedOrder && (
        <TransactionReceiptModal
          isOpen={isModalOpen}
          onClose={closeModal}
          order={selectedOrder}
        />
      )}
    </div>
  )
}