import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Clock, KeyRound, Printer, Copy, Check, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Hex } from 'viem';
import { useState, useEffect } from 'react';

interface TransactionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  txStatus: 'idle' | 'waitingForSignature' | 'sending' | 'confirming' | 'success' | 'error' |
            'waitingForApprovalSignature' | 'approving' | 'approvalSuccess' | 'approvalError' |
            'backendProcessing' | 'backendSuccess' | 'backendError';
  transactionHash?: Hex;
  errorMessage?: string | null;
  explorerUrl?: string;
  backendMessage?: string | null;
  requestId?: string;
  backendDetails?: {
    token?: string;
    units?: string;
    amount?: number;
  };
}

export function TransactionStatusModal({
  isOpen,
  onClose,
  txStatus,
  transactionHash,
  errorMessage,
  explorerUrl = "https://basescan.org",
  backendMessage,
  requestId,
  backendDetails,
}: TransactionStatusModalProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedRequestId, setCopiedRequestId] = useState(false);
  const [lockedStatus, setLockedStatus] = useState<string | null>(null);

  // Lock the status once we reach a final state to prevent regression
  useEffect(() => {
    const isFinalState = txStatus === 'backendSuccess' || 
                        txStatus === 'backendError' || 
                        txStatus === 'error' || 
                        txStatus === 'approvalError';
    
    if (isFinalState && !lockedStatus) {
      setLockedStatus(txStatus);
    }
  }, [txStatus, lockedStatus]);

  // Use locked status if available, otherwise use current status
  const displayStatus = lockedStatus || txStatus;

  const isPendingBlockchain = displayStatus === 'waitingForSignature' || displayStatus === 'sending' || displayStatus === 'confirming';
  const isSuccessBlockchainConfirmed = displayStatus === 'success';
  const isErrorBlockchain = displayStatus === 'error';
  const isBackendProcessing = displayStatus === 'backendProcessing';
  const isBackendSuccess = displayStatus === 'backendSuccess';
  const isBackendError = displayStatus === 'backendError';
  const isWaitingForApprovalSignature = displayStatus === 'waitingForApprovalSignature';
  const isApproving = displayStatus === 'approving';
  const isApprovalSuccess = displayStatus === 'approvalSuccess';
  const isApprovalError = displayStatus === 'approvalError';

  // Detect user cancellation / rejection in wallet errors (e.g. MetaMask 4001 or textual reasons)
  const isUserCancelled = isErrorBlockchain && /(user rejected|user denied|request has been rejected by the user|cancel|canceled|transaction cancelled|4001)/i.test(errorMessage ?? '');

  // Show copy buttons for failed states or when transaction is completed, but skip for simple user cancellations
  const showCopyButtons = (isErrorBlockchain && !isUserCancelled) || isBackendError || isApprovalError || isBackendSuccess;

  let title = "Transaction Status";
  let description = "";
  let icon = null;
  let iconColor = "";

  if (isWaitingForApprovalSignature) {
    title = "Awaiting Approval";
    description = "Please approve the token spend in your wallet to continue.";
    icon = <KeyRound className="w-8 h-8 animate-pulse text-blue-500" />;
    iconColor = "text-blue-500";
  } else if (isApproving) {
    title = "Approving Token";
    description = "Your approval transaction is being processed.";
    icon = <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />;
    iconColor = "text-yellow-500";
  } else if (isApprovalSuccess) {
    title = "Token Approved!";
    description = "Approved successfully. Proceeding with payment...";
    icon = <CheckCircle className="w-8 h-8 text-green-500" />;
    iconColor = "text-green-500";
  } else if (isApprovalError) {
    title = "Approval Failed";
    description = errorMessage || "The approval transaction could not be completed.";
    icon = <XCircle className="w-8 h-8 text-red-500" />;
    iconColor = "text-red-500";
  } else if (displayStatus === 'waitingForSignature') {
    title = "Awaiting Signature";
    description = "Please confirm the transaction in your wallet.";
    icon = <Loader2 className="w-8 h-8 animate-spin text-blue-500" />;
    iconColor = "text-blue-500";
  } else if (displayStatus === 'sending') {
    title = "Transaction Sent";
    description = "Processing on blockchain. Waiting for confirmation...";
    icon = <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />;
    iconColor = "text-yellow-500";
  } else if (displayStatus === 'confirming') {
    title = "Confirming Transaction";
    description = "On blockchain, awaiting final confirmation.";
    icon = <Loader2 className="w-8 h-8 animate-spin text-purple-500" />;
    iconColor = "text-purple-500";
  } else if (isErrorBlockchain) {
    if (isUserCancelled) {
      title = "Transaction Cancelled";
      description = "You cancelled the transaction in your wallet.";
      icon = <XCircle className="w-8 h-8 text-red-500" />;
      iconColor = "text-red-500";
    } else {
      title = "Transaction Failed";
      description = errorMessage || "The blockchain transaction could not be completed.";
      icon = <XCircle className="w-8 h-8 text-red-500" />;
      iconColor = "text-red-500";
    }
  } else if (isSuccessBlockchainConfirmed) {
    title = "Blockchain Confirmed!";
    description = "Now processing with payment provider...";
    icon = <Clock className="w-8 h-8 animate-spin text-green-500" />;
    iconColor = "text-green-500";
  } else if (isBackendProcessing) {
    title = "Processing Payment";
    description = backendMessage || "Processing payment with service provider.";
    icon = <Loader2 className="w-8 h-8 animate-spin text-orange-500" />;
    iconColor = "text-orange-500";
  } else if (isBackendSuccess) {
    title = "Payment Successful!";
    description = backendMessage || "Your payment has been successfully processed!";
    icon = <CheckCircle className="w-8 h-8 text-green-600" />;
    iconColor = "text-green-600";
  } else if (isBackendError) {
    title = "Payment Failed";
    description = backendMessage || errorMessage || "Payment could not be completed. Contact support with your transaction hash.";
    icon = <XCircle className="w-8 h-8 text-red-600" />;
    iconColor = "text-red-600";
  }

  const explorerLink = transactionHash ? `${explorerUrl}/tx/${transactionHash}` : '#';

  const copyToClipboard = async (text: string, type: 'hash' | 'requestId') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'hash') {
        setCopiedHash(true);
        setTimeout(() => setCopiedHash(false), 2000);
      } else {
        setCopiedRequestId(true);
        setTimeout(() => setCopiedRequestId(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleClose = () => {
    // Reset internal state when modal closes
    setLockedStatus(null);
    setCopiedHash(false);
    setCopiedRequestId(false);
    onClose();
  };

  const printReceipt = () => {
    const content = document.getElementById("printable-receipt");
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Transaction Receipt</title></head><body>${content.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Only allow closing if in a final state
        if (!open && (isBackendSuccess || isBackendError || isErrorBlockchain || isApprovalError)) {
          handleClose();
        }
      }}
    >
      <DialogContent className="w-[95vw] max-w-[350px] p-4 text-center rounded-lg">
        <DialogHeader className="flex flex-col items-center space-y-2">
          <div className="mb-2"></div>
          <div className="w-12 h-12 bg-white rounded-2xl shadow-[0px_2px_4px_0px_rgba(0,0,0,0.25)] border-[1.50px] border-blue-700 flex items-center justify-center">
            <div className={iconColor}>{icon}</div>
          </div>
          <DialogTitle className="text-lg font-bold leading-tight">{title}</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground text-sm leading-snug px-2">{description}</DialogDescription>
        </DialogHeader>

        {transactionHash && (
          <div className="mt-3 text-xs space-y-1">
            <p className="font-medium text-sm">Transaction Hash:</p>
            <div className="flex items-center justify-center gap-1 bg-gray-50 dark:bg-gray-800 rounded-md p-2">
              <Link href={explorerLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs font-mono">
                {transactionHash.substring(0, 8)}...{transactionHash.substring(transactionHash.length - 6)}
              </Link>
              {showCopyButtons && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 w-5 p-0 ml-1"
                  onClick={() => copyToClipboard(transactionHash, 'hash')}
                >
                  {copiedHash ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
        
        {requestId && (displayStatus !== 'idle' && displayStatus !== 'waitingForSignature' && !isWaitingForApprovalSignature) && (
          <div className="mt-3 text-xs space-y-1">
            <p className="font-medium text-sm">Request ID:</p>
            <div className="flex items-center justify-center gap-1 bg-gray-50 dark:bg-gray-800 rounded-md p-2">
              <span className="text-muted-foreground font-mono text-xs truncate max-w-[200px]">{requestId}</span>
              {showCopyButtons && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 w-5 p-0 ml-1 flex-shrink-0"
                  onClick={() => copyToClipboard(requestId, 'requestId')}
                >
                  {copiedRequestId ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        <div id="printable-receipt" style={{ display: 'none' }}>
          <h2 style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Transaction Receipt</h2>
          <p><strong>Status:</strong> {displayStatus}</p>
          <p><strong>Request ID:</strong> {requestId}</p>
          <p><strong>Transaction Hash:</strong> {transactionHash}</p>
          <p><strong>Explorer:</strong> {explorerLink}</p>
          <p><strong>Message:</strong> {backendMessage || errorMessage || "N/A"}</p>
        </div>

        {isBackendSuccess && backendDetails && backendDetails.token && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-left space-y-2">
            <h3 className="font-medium text-green-800">Prepaid Token Details</h3>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Token:</span>
                <span className="font-mono">{backendDetails.token}</span>
              </div>
              {backendDetails.units && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Units:</span>
                  <span>{backendDetails.units}</span>
                </div>
              )}
              {backendDetails.amount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span>₦{backendDetails.amount.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 flex flex-col gap-2">
          {isBackendSuccess && (
            <div className="flex flex-col gap-2 w-full">
              <Button variant="secondary" onClick={printReceipt} className="w-full text-sm h-9">
                <Printer className="w-3 h-3 mr-2" /> Print Receipt
              </Button>
              <Button variant="outline" asChild className="w-full text-sm h-9">
                <Link href="https://forms.gle/voDtR5vBsJtisDEL7" target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="w-3 h-3 mr-2" /> Give Feedback
                </Link>
              </Button>
            </div>
          )}
          {/* Only show close button for final states */}
          {(isBackendSuccess || isBackendError || isErrorBlockchain || isApprovalError) && (
            <Button onClick={handleClose} className="w-full text-sm h-9">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}