// components/TransactionReceiptModal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Printer, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";
import Image from "next/image";

interface ReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    requestId: string;
    userAddress: string;
    transactionHash: string;
    serviceType: string;
    serviceID: string;
    variationCode?: string;
    customerIdentifier: string;
    amountNaira: number;
    cryptoUsed: number;
    cryptoSymbol: string;
    onChainStatus: string;
    vtpassStatus: string;
    createdAt: string;
  } | null;
}

export function TransactionReceiptModal({ isOpen, onClose, order }: ReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const printWindow = window.open("", "", "height=700,width=400");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Transaction Receipt</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  margin: 0; 
                  padding: 20px; 
                  background: white;
                  font-size: 12px;
                  line-height: 1.4;
                }
                .receipt-container {
                  max-width: 350px;
                  margin: 0 auto;
                  border: 1px solid #ddd;
                  border-radius: 8px;
                  overflow: hidden;
                }
                .receipt-header {
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 20px;
                  text-align: center;
                }
                .logo {
                  width: 60px;
                  height: 60px;
                  margin: 0 auto 10px;
                  background: white;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  color: #667eea;
                }
                .receipt-body {
                  padding: 20px;
                  background: white;
                }
                .status-badge {
                  background: #10b981;
                  color: white;
                  padding: 4px 12px;
                  border-radius: 20px;
                  font-size: 11px;
                  display: inline-block;
                  margin: 10px 0;
                }
                .divider {
                  border-top: 1px dashed #ddd;
                  margin: 15px 0;
                }
                .receipt-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 8px 0;
                  font-size: 11px;
                }
                .receipt-row.highlight {
                  font-weight: bold;
                  font-size: 12px;
                  color: #1f2937;
                }
                .receipt-footer {
                  text-align: center;
                  color: #6b7280;
                  font-size: 10px;
                  padding: 15px;
                  border-top: 1px solid #f3f4f6;
                }
                .hash-text {
                  word-break: break-all;
                  font-family: monospace;
                  font-size: 10px;
                }
              </style>
            </head>
            <body>${printContents}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const formatStatus = (status: string) => {
    return status.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const getStatusColor = (status: string) => {
    if (status.toLowerCase().includes('success') || status.toLowerCase().includes('delivered')) {
      return 'bg-green-500';
    }
    if (status.toLowerCase().includes('pending') || status.toLowerCase().includes('processing')) {
      return 'bg-yellow-500';
    }
    if (status.toLowerCase().includes('failed') || status.toLowerCase().includes('error')) {
      return 'bg-red-500';
    }
    return 'bg-gray-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[400px] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Transaction Receipt</DialogTitle>
        </DialogHeader>

        {order && (
          <div className="receipt-display">
            {/* Screen Display */}
            <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 text-white p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-white rounded-full flex items-center justify-center">
                <Image 
                  src="/paycrypt.png" 
                  alt="PayCrypt" 
                  width={40} 
                  height={40}
                  className="rounded-full"
                  onError={(e) => {
                    // Fallback if logo fails to load
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.parentElement?.querySelector('.logo-fallback') as HTMLElement;
                    if (fallback) {
                      fallback.style.display = 'block';
                    }
                  }}
                />
                <div className="logo-fallback text-blue-600 font-bold text-lg hidden">PC</div>
              </div>
              <h2 className="text-xl font-bold mb-1">PayCrypt</h2>
              <p className="text-blue-100 text-sm">Crypto Payment Receipt</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <CheckCircle className="w-4 h-4" />
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.vtpassStatus)} text-white`}>
                  {formatStatus(order.vtpassStatus)}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4 bg-white">
              {/* Transaction Details */}
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600 text-sm">Service</span>
                  <div className="text-right">
                    <div className="font-medium text-sm">{order.serviceType.toUpperCase()}</div>
                    <div className="text-gray-500 text-xs">{order.serviceID}</div>
                  </div>
                </div>

                {order.variationCode && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm">Plan</span>
                    <span className="font-medium text-sm">{order.variationCode}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Customer</span>
                  <span className="font-medium text-sm font-mono">{order.customerIdentifier}</span>
                </div>

                <div className="border-t border-dashed border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Amount</span>
                    <span className="font-bold text-lg">₦{order.amountNaira.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-gray-500 text-xs">Paid with</span>
                    <span className="text-gray-700 text-sm font-medium">{order.cryptoUsed} {order.cryptoSymbol}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-200 pt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-xs">Request ID</span>
                    <span className="font-mono text-xs text-gray-700">{order.requestId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-xs">Blockchain</span>
                    <span className="text-xs">{formatStatus(order.onChainStatus)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-xs">Date</span>
                    <span className="text-xs">{new Date(order.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-600 text-xs mb-1">Transaction Hash</div>
                  <div className="font-mono text-xs text-gray-800 break-all">{order.transactionHash}</div>
                </div>
              </div>
            </div>

            {/* Print-only version */}
            <div ref={printRef} className="hidden">
              <div className="receipt-container">
                <div className="receipt-header">
                  <div className="logo">PC</div>
                  <h2 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 'bold' }}>PayCrypt</h2>
                  <p style={{ margin: '0', fontSize: '12px', opacity: '0.9' }}>Crypto Payment Receipt</p>
                  <div className="status-badge">{formatStatus(order.vtpassStatus)}</div>
                </div>
                
                <div className="receipt-body">
                  <div className="receipt-row highlight">
                    <span>Service:</span>
                    <span>{order.serviceType.toUpperCase()} - {order.serviceID}</span>
                  </div>
                  
                  {order.variationCode && (
                    <div className="receipt-row">
                      <span>Plan:</span>
                      <span>{order.variationCode}</span>
                    </div>
                  )}
                  
                  <div className="receipt-row">
                    <span>Customer:</span>
                    <span>{order.customerIdentifier}</span>
                  </div>
                  
                  <div className="divider"></div>
                  
                  <div className="receipt-row highlight">
                    <span>Amount:</span>
                    <span>₦{order.amountNaira.toLocaleString()}</span>
                  </div>
                  
                  <div className="receipt-row">
                    <span>Paid:</span>
                    <span>{order.cryptoUsed} {order.cryptoSymbol}</span>
                  </div>
                  
                  <div className="divider"></div>
                  
                  <div className="receipt-row">
                    <span>Request ID:</span>
                    <span>{order.requestId}</span>
                  </div>
                  
                  <div className="receipt-row">
                    <span>Blockchain:</span>
                    <span>{formatStatus(order.onChainStatus)}</span>
                  </div>
                  
                  <div className="receipt-row">
                    <span>Date:</span>
                    <span>{new Date(order.createdAt).toLocaleString()}</span>
                  </div>
                  
                  <div className="divider"></div>
                  
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '5px' }}>Transaction Hash:</div>
                    <div className="hash-text">{order.transactionHash}</div>
                  </div>
                </div>
                
                <div className="receipt-footer">
                  <p>Thank you for using PayCrypt!</p>
                  <p>Keep this receipt for your records</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="p-4 bg-gray-50 flex flex-col gap-2">
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={() => copyToClipboard(order?.transactionHash || "")} className="flex-1 text-sm h-9"> 
              <Copy className="w-3 h-3 mr-2" /> Copy Hash
            </Button>
            <Button variant="outline" onClick={handlePrint} className="flex-1 text-sm h-9">
              <Printer className="w-3 h-3 mr-2" /> Print
            </Button>
          </div>
          <Button onClick={onClose} className="w-full text-sm h-9">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}