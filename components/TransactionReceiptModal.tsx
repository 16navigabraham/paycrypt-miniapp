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
import { Copy, Download, CheckCircle } from "lucide-react";
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

  const handleDownload = () => {
    if (!order) {
      toast.error("No order data available for download");
      return;
    }
    
    try {
      // Format status for display
      const formatStatusForDownload = (status: string) => {
        return status.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      };

      const receiptContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PayCrypt Receipt - ${order.requestId}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5;
            min-height: 100vh;
        }
        .receipt-container {
            max-width: 350px;
            margin: 0 auto;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            background: white;
        }
        .receipt-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 24px;
            text-align: center;
        }
        .logo {
            width: 64px;
            height: 64px;
            margin: 0 auto 12px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: #667eea;
            font-size: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .receipt-body {
            padding: 24px;
            background: white;
        }
        .status-badge {
            background: #10b981;
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
            margin: 12px 0;
        }
        .divider {
            border-top: 2px dashed #e5e7eb;
            margin: 20px 0;
        }
        .receipt-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin: 12px 0;
            font-size: 13px;
            line-height: 1.4;
        }
        .receipt-row.highlight {
            font-weight: 600;
            font-size: 15px;
            color: #1f2937;
        }
        .receipt-row .label {
            color: #6b7280;
            font-weight: 500;
        }
        .receipt-row .value {
            text-align: right;
            max-width: 60%;
            word-break: break-word;
        }
        .receipt-footer {
            text-align: center;
            color: #6b7280;
            font-size: 11px;
            padding: 20px;
            border-top: 1px solid #f3f4f6;
            background: #fafafa;
        }
        .hash-section {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            margin: 16px 0;
        }
        .hash-text {
            word-break: break-all;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 11px;
            color: #374151;
            line-height: 1.5;
        }
        .company-name {
            font-size: 20px;
            font-weight: 700;
            margin: 0;
        }
        .company-tagline {
            font-size: 12px;
            opacity: 0.9;
            margin: 4px 0 0 0;
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="receipt-header">
            <div class="logo">PC</div>
            <h1 class="company-name">PayCrypt</h1>
            <p class="company-tagline">Crypto Payment Receipt</p>
            <div class="status-badge">${formatStatusForDownload(order.vtpassStatus)}</div>
        </div>
        
        <div class="receipt-body">
            <div class="receipt-row highlight">
                <span class="label">Service:</span>
                <span class="value">${order.serviceType.toUpperCase()} - ${order.serviceID}</span>
            </div>
            
            ${order.variationCode ? `
            <div class="receipt-row">
                <span class="label">Plan:</span>
                <span class="value">${order.variationCode}</span>
            </div>` : ''}
            
            <div class="receipt-row">
                <span class="label">Customer:</span>
                <span class="value">${order.customerIdentifier}</span>
            </div>
            
            <div class="divider"></div>
            
            <div class="receipt-row highlight">
                <span class="label">Amount:</span>
                <span class="value">₦${order.amountNaira.toLocaleString()}</span>
            </div>
            
            <div class="receipt-row">
                <span class="label">Paid:</span>
                <span class="value">${order.cryptoUsed} ${order.cryptoSymbol}</span>
            </div>
            
            <div class="divider"></div>
            
            <div class="receipt-row">
                <span class="label">Request ID:</span>
                <span class="value">${order.requestId}</span>
            </div>
            
            <div class="receipt-row">
                <span class="label">Blockchain:</span>
                <span class="value">${formatStatusForDownload(order.onChainStatus)}</span>
            </div>
            
            <div class="receipt-row">
                <span class="label">Date:</span>
                <span class="value">${new Date(order.createdAt).toLocaleString()}</span>
            </div>
            
            <div class="hash-section">
                <div style="font-size: 11px; color: #6b7280; margin-bottom: 6px; font-weight: 500;">Transaction Hash:</div>
                <div class="hash-text">${order.transactionHash}</div>
            </div>
        </div>
        
        <div class="receipt-footer">
            <p style="margin: 0 0 8px 0; font-weight: 500;">Thank you for using PayCrypt!</p>
            <p style="margin: 0; opacity: 0.8;">Keep this receipt for your records</p>
            <p style="margin: 8px 0 0 0; opacity: 0.6;">Generated on ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>`;

      // Create and download the file
      const blob = new Blob([receiptContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paycrypt-receipt-${order.requestId.slice(-8)}.html`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast.success("Receipt downloaded successfully!");
      
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Failed to download receipt");
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
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
        toast.success("Copied to clipboard!");
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
              <Copy className="w-3 h-3 mr-1" /> Copy Hash
            </Button>
            <Button variant="outline" onClick={handleDownload} className="flex-1 text-xs h-8">
              <Download className="w-3 h-3 mr-1" /> Download
            </Button>
          </div>
          <Button onClick={onClose} className="w-full text-xs h-8">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}