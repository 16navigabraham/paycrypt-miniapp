"use client"

import { useEffect, useState } from "react"
import { getUserHistory } from "@/lib/api"
import Link from "next/link"
import { TransactionReceiptModal } from "@/components/TransactionReceiptModal"
import { Button } from "@/components/ui/button"
import { useMiniAppWallet } from "@/hooks/useMiniAppWallet"
import * as htmlToImage from 'html-to-image'
import download from 'downloadjs'

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

const imgRecentTransactionsGridOverlay = "https://www.figma.com/api/mcp/asset/90c2d2c4-b46c-41b3-9ade-15b7be0a1c0f";

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
    <div className="relative bg-white dark:bg-black border p-3 rounded-lg shadow-sm overflow-hidden">
      {/* Grid overlay (Figma asset) */}
      <img src={imgRecentTransactionsGridOverlay} alt="grid overlay" className="absolute left-0 top-0 w-full h-full object-cover opacity-10 pointer-events-none z-0 rounded-lg" />

      <h2 className="text-base font-semibold mb-2 relative z-10">Recent Transactions</h2>
      {loading && <p className="text-muted-foreground relative z-10">Loading...</p>}
      {!loading && transactions.length === 0 && (
        <p className="text-muted-foreground relative z-10">No recent transactions found.</p>
      )}
      <ul className="space-y-2 relative z-10">
        {transactions.map((txn) => (
          <li key={txn.requestId} className="text-sm">
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {txn.serviceType.toUpperCase()} • ₦{txn.amountNaira} • {txn.cryptoUsed.toFixed(4)} {txn.cryptoSymbol}
                </div>
                <div className="text-muted-foreground text-xs mt-1">
                  {new Date(txn.createdAt).toLocaleString()}
                </div>
              </div>
                <div className="flex items-center gap-2 ml-3">
                <span
                  className={`text-xs ${
                    txn.vtpassStatus === "successful"
                      ? "text-green-600"
                      : txn.vtpassStatus === "pending"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {txn.vtpassStatus}
                </span>
                <Button size="sm" variant="outline" className="text-xs h-7 py-1 px-2">Print</Button>
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