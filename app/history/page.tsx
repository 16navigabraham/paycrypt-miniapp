"use client"

import { useEffect, useState } from "react"
import { getUserHistory } from "@/lib/api"
import { TransactionReceiptModal } from "@/components/TransactionReceiptModal"
import { Button } from "@/components/ui/button"
import * as htmlToImage from "html-to-image"
import download from "downloadjs"
import AuthGuard from "@/components/AuthGuard"
import BackToDashboard from '@/components/BackToDashboard'
import { useMiniAppWallet } from "@/hooks/useMiniAppWallet"

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
}

export default function HistoryPage() {
  const { address, isConnected } = useMiniAppWallet()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Transaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const fetchHistory = async () => {
      if (isConnected && address) {
        try {
          setLoading(true)
          console.log('🔍 Fetching transaction history for:', address)
          const data = await getUserHistory(address)
          setTransactions(data.orders)
          console.log('✅ Transaction history loaded:', data.orders?.length || 0, 'transactions')
        } catch (err) {
          console.error("❌ Failed to fetch history:", err)
        } finally {
          setLoading(false)
        }
      } else {
        console.log('⚠️ No wallet connected, skipping history fetch')
      }
    }

    fetchHistory()
  }, [isConnected, address])

  const openModal = (txn: Transaction) => {
    setSelectedOrder(txn)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedOrder(null)
  }

  // Show wallet connection prompt if not connected
  if (!isConnected) {
    return (
      <div className="container py-10">
        <BackToDashboard />
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold mb-4">Transaction History</h1>
          <p className="text-muted-foreground mb-6">
            Please connect your wallet to view your transaction history.
          </p>
          <Button onClick={() => window.location.href = '/dashboard'}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard>
      <div className="container py-10">
        <BackToDashboard />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Transaction History</h1>
            <p className="text-muted-foreground">
              Here are your past transactions for wallet: {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
          {address && (
            <div className="text-sm text-muted-foreground">
              <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {address}
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading transaction history...</p>
          </div>
        )}

        {!loading && transactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No transactions found for this wallet.</p>
            <p className="text-sm text-gray-500">
              Complete your first transaction to see it appear here.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {transactions.map((txn) => (
            <div
              key={txn.requestId}
              className="border p-4 rounded-md cursor-pointer hover:shadow-md transition-shadow bg-white"
              onClick={() => openModal(txn)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="font-medium text-sm mb-1">
                    {txn.serviceType.toUpperCase()} • ₦{txn.amountNaira.toLocaleString()} • {txn.cryptoUsed} {txn.cryptoSymbol}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Customer: {txn.customerIdentifier}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(txn.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      txn.vtpassStatus === "successful"
                        ? "bg-green-100 text-green-700"
                        : txn.vtpassStatus === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {txn.vtpassStatus}
                  </span>
                  {txn.transactionHash && (
                    <span className="text-xs text-blue-600 font-mono">
                      {txn.transactionHash.slice(0, 8)}...
                    </span>
                  )}
                </div>
              </div>
              
              {/* Additional transaction details */}
              <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-2 mt-2">
                <span>Request ID: {txn.requestId.slice(0, 8)}...</span>
                <span>Chain Status: {txn.onChainStatus}</span>
              </div>
            </div>
          ))}
        </div>

        {selectedOrder && (
          <TransactionReceiptModal
            isOpen={isModalOpen}
            onClose={closeModal}
            order={selectedOrder}
          />
        )}
      </div>
    </AuthGuard>
  )
}