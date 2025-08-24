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
import { Copy, MessageCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
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
  const [hashCopied, setHashCopied] = useState(false);

  const shareToCast = async () => {
    if (!order) {
      toast.error("No order data available");
      return;
    }

    try {
      // Create a Farcaster/Base app friendly cast text
      const castText = `✅ Just completed a crypto payment with https://miniapp.paycrypt.org

💰 Service: ${order.serviceType.toUpperCase()}
📱 Amount: ₦${order.amountNaira.toLocaleString()}
🪙 Paid: ${order.cryptoUsed} ${order.cryptoSymbol}

Status: ${formatStatus(order.vtpassStatus)}

🔗 ${order.transactionHash.slice(0, 10)}...${order.transactionHash.slice(-8)}

#PayCrypt #Crypto #Web3Payments #Onchain`;

      // Copy the cast text to clipboard
      await navigator.clipboard.writeText(castText);
      
      toast.success("Cast text copied! You can now paste it in Farcaster or Base to share your transaction.");
      
    } catch (error) {
      console.error('Copy cast text error:', error);
      
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = castText;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        toast.success("Cast text copied! You can now paste it in Farcaster or Base to share your transaction.");
      } catch (fallbackError) {
        toast.error("Failed to copy cast text");
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setHashCopied(true);
      toast.success("Copied to clipboard!");
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setHashCopied(false);
      }, 2000);
      
    } catch (err) {
      console.error('Failed to copy: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setHashCopied(true);
        toast.success("Copied to clipboard!");
        
        setTimeout(() => {
          setHashCopied(false);
        }, 2000);
      } catch (fallbackErr) {
        toast.error("Failed to copy to clipboard");
      }
      document.body.removeChild(textArea);
    }
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
      <DialogContent className="w-[90vw] max-w-[320px] p-0 overflow-hidden max-h-[85vh]">
        <DialogHeader className="sr-only">
          <DialogTitle>Transaction Receipt</DialogTitle>
        </DialogHeader>

        {order && (
          <div className="receipt-display">
            {/* Screen Display */}
            <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 text-white p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-white rounded-full flex items-center justify-center">
                <Image 
                  src="/paycrypt.png" 
                  alt="PayCrypt" 
                  width={28} 
                  height={28}
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
                <div className="logo-fallback text-blue-600 font-bold text-sm hidden">PC</div>
              </div>
              <h2 className="text-lg font-bold mb-1">PayCrypt</h2>
              <p className="text-blue-100 text-xs">Crypto Payment Receipt</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <CheckCircle className="w-3 h-3" />
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.vtpassStatus)} text-white`}>
                  {formatStatus(order.vtpassStatus)}
                </span>
              </div>
            </div>

            <div className="p-4 space-y-3 bg-white max-h-[40vh] overflow-y-auto">
              {/* Transaction Details */}
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600 text-xs">Service</span>
                  <div className="text-right">
                    <div className="font-medium text-xs">{order.serviceType.toUpperCase()}</div>
                    <div className="text-gray-500 text-xs">{order.serviceID}</div>
                  </div>
                </div>

                {order.variationCode && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-xs">Plan</span>
                    <span className="font-medium text-xs">{order.variationCode}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600 text-xs">Customer</span>
                  <span className="font-medium text-xs font-mono">{order.customerIdentifier}</span>
                </div>

                <div className="border-t border-dashed border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-xs">Amount</span>
                    <span className="font-bold text-sm">₦{order.amountNaira.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-gray-500 text-xs">Paid with</span>
                    <span className="text-gray-700 text-xs font-medium">{order.cryptoUsed} {order.cryptoSymbol}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-200 pt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-xs">Request ID</span>
                    <span className="font-mono text-xs text-gray-700 truncate ml-2 max-w-[50%]">{order.requestId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-xs">Blockchain</span>
                    <span className="text-xs">{formatStatus(order.onChainStatus)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-xs">Date</span>
                    <span className="text-xs">{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-md p-2">
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

        <DialogFooter className="p-3 bg-gray-50 flex flex-col gap-2 border-t">
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={() => copyToClipboard(order?.transactionHash || "")} className="flex-1 text-xs h-8"> 
              <Copy className="w-3 h-3 mr-1" /> {hashCopied ? "Copied!" : "Copy Hash"}
            </Button>
            <Button variant="outline" onClick={shareToCast} className="flex-1 text-xs h-8">
              <MessageCircle className="w-3 h-3 mr-1" /> Share Cast
            </Button>
          </div>
          <Button onClick={onClose} className="w-full text-xs h-8">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}