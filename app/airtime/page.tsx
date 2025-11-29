// app/airtime/page.tsx
"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, Wifi } from "lucide-react"
import BackToDashboard from "@/components/BackToDashboard"
import { Input } from "@/components/ui/input"

import { useMiniAppWallet, useTransactionWait } from '@/hooks/useMiniAppWallet';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import { ERC20_ABI } from "@/config/erc20Abi";
import { parseUnits, toBytes, toHex, Hex, encodeFunctionData } from 'viem';
import { toast } from 'sonner';
import { TransactionStatusModal } from "@/components/TransactionStatusModal";

import { buyAirtime } from "@/lib/api";
import { TokenConfig } from "@/lib/tokenlist";
import { fetchActiveTokensWithMetadata } from "@/lib/tokenUtils";

const NETWORKS = [
  { serviceID: "mtn", name: "MTN" },
  { serviceID: "glo", name: "Glo" },
  { serviceID: "airtel", name: "Airtel" },
  { serviceID: "9mobile", name: "9mobile" },
]

function generateRequestId(): string {
  return `${Date.now().toString()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
}

async function fetchPrices(tokenList: TokenConfig[]): Promise<Record<string, any>> {
  if (!tokenList || tokenList.length === 0) return {};
  const ids = tokenList.map(c => c.coingeckoId).join(",");
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(
      `https://paycrypt-margin-price.onrender.com/api/v3/simple/price?ids=${ids}&vs_currencies=ngn`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    return res.ok ? await res.json() : {};
  } catch (error) {
    console.error("Error fetching prices:", error);
    return {};
  }
}

export default function AirtimePage() {
  const [mounted, setMounted] = useState(false);
  const [activeTokens, setActiveTokens] = useState<TokenConfig[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [network, setNetwork] = useState("");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [prices, setPrices] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [requestId, setRequestId] = useState<string | undefined>(undefined);

  const [txStatus, setTxStatus] = useState<'idle' | 'waitingForApprovalSignature' | 'approving' | 'approvalSuccess' | 'waitingForSignature' | 'sending' | 'confirming' | 'success' | 'backendProcessing' | 'backendSuccess' | 'backendError' | 'error'>('idle');
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionHashForModal, setTransactionHashForModal] = useState<Hex | undefined>(undefined);
  const [approvalHash, setApprovalHash] = useState<Hex | undefined>(undefined);
  const [orderHash, setOrderHash] = useState<Hex | undefined>(undefined);
  const backendRequestSentRef = useRef<Hex | null>(null);

  // Updated wallet hook usage - destructure the functions
  const { 
    address, 
    isConnected, 
    isLoading: walletLoading,
    sendTransaction,
    isOnBaseChain,
    ensureBaseChain
  } = useMiniAppWallet();

  // Transaction waiting hooks
  const approvalReceipt = useTransactionWait(approvalHash);
  const orderReceipt = useTransactionWait(orderHash);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load tokens and prices
  useEffect(() => {
    if (!mounted) return;
    
    async function loadTokensAndPrices() {
      setLoading(true);
      try {
        const tokens = await fetchActiveTokensWithMetadata();
        const erc20Tokens = tokens.filter(token => token.tokenType !== 0);
        setActiveTokens(erc20Tokens);
        
        const prices = await fetchPrices(tokens);
        setPrices(prices);
      } catch (error) {
        console.error("Error loading tokens and prices:", error);
        toast.error("Failed to load token data. Please refresh and try again.");
      } finally {
        setLoading(false);
      }
    }
    
    loadTokensAndPrices();
  }, [mounted]);

  // Generate requestId when form has data
  useEffect(() => {
    if ((selectedToken || network || amount || phone) && !requestId) {
      setRequestId(generateRequestId());
    } else if (!(selectedToken || network || amount || phone) && requestId) {
      setRequestId(undefined);
    }
  }, [selectedToken, network, amount, phone, requestId]);

  // Monitor approval transaction
  useEffect(() => {
    if (approvalReceipt.isSuccess && txStatus === 'approving') {
      setTxStatus('approvalSuccess');
      toast.success("Token approved! Proceeding with payment...", { id: 'approval-status' });
      
      // Proceed with main transaction after a short delay
      setTimeout(() => {
        handleMainTransaction();
      }, 2000);
    } else if (approvalReceipt.isError && txStatus === 'approving') {
      setTxStatus('error');
      setTransactionError("Approval transaction failed");
      toast.error("Approval transaction failed", { id: 'approval-status' });
    }
  }, [approvalReceipt.isSuccess, approvalReceipt.isError, txStatus]);

  // Monitor order transaction
  useEffect(() => {
    if (orderReceipt.isSuccess && txStatus === 'confirming') {
      setTxStatus('success');
      toast.success("Payment confirmed! Processing order...", { id: 'tx-status' });
      
      // Process with backend
      if (orderHash) {
        handlePostTransaction(orderHash);
      }
    } else if (orderReceipt.isError && txStatus === 'confirming') {
      setTxStatus('error');
      setTransactionError("Payment transaction failed");
      toast.error("Payment transaction failed", { id: 'tx-status' });
    }
  }, [orderReceipt.isSuccess, orderReceipt.isError, txStatus, orderHash]);

  // Derived values
  const selectedTokenObj = activeTokens.find(t => t.address === selectedToken);
  const priceNGN = selectedTokenObj ? prices[selectedTokenObj.coingeckoId]?.ngn : null;
  const amountNGN = Number(amount) || 0;
  const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0;
  const tokenAmountForOrder: bigint = selectedTokenObj ? parseUnits(cryptoNeeded.toFixed(selectedTokenObj.decimals), selectedTokenObj.decimals) : BigInt(0);
  const bytes32RequestId: Hex = requestId ? toHex(toBytes(requestId), { size: 32 }) : toHex(toBytes(""), { size: 32 });

  const handlePostTransaction = useCallback(async (transactionHash: Hex) => {
    if (backendRequestSentRef.current === transactionHash) {
      return;
    }

    backendRequestSentRef.current = transactionHash;
    setTxStatus('backendProcessing');
    setBackendMessage("Processing your order...");
    toast.loading("Processing order with our service provider...", { id: 'backend-status' });

    try {
      await buyAirtime({
        requestId: requestId!,
        phone,
        serviceID: network,
        amount: amountNGN,
        cryptoUsed: parseFloat(cryptoNeeded.toFixed(selectedTokenObj?.decimals || 6)),
        cryptoSymbol: selectedTokenObj?.symbol ?? "",
        transactionHash,
        userAddress: address!
      });

      setTxStatus('backendSuccess');
      setBackendMessage("Airtime delivered successfully!");
      toast.success("Airtime delivered successfully!", { id: 'backend-status' });

      // Reset form
      setTimeout(() => {
        setSelectedToken("");
        setNetwork("");
        setAmount("");
        setPhone("");
        setRequestId(undefined);
        backendRequestSentRef.current = null;
      }, 3000);

    } catch (error: any) {
      setTxStatus('backendError');
      let errorMessage = error.message;
      if (errorMessage.includes('HTML instead of JSON')) {
        errorMessage = 'Server error occurred. Please try again or contact support.';
      } else if (errorMessage.includes('Invalid JSON')) {
        errorMessage = 'Communication error with server. Please try again.';
      } else if (errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      const fullMessage = `${errorMessage}. Request ID: ${requestId}`;
      setBackendMessage(fullMessage);
      toast.error(fullMessage, { id: 'backend-status' });
    }
  }, [requestId, phone, network, amountNGN, cryptoNeeded, selectedTokenObj?.symbol, selectedTokenObj?.decimals, address]);

  const handleMainTransaction = async () => {
    try {
      setTxStatus('waitingForSignature');
      toast.info("Please confirm the payment transaction...");

      const orderData = encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: 'createOrder',
        args: [
          bytes32RequestId,
          selectedTokenObj!.address as Hex,
          tokenAmountForOrder,
        ],
      });

      const orderTx = await sendTransaction({
        to: CONTRACT_ADDRESS,
        data: orderData,
      });

      setOrderHash(orderTx);
      setTxStatus('confirming');
      setTransactionHashForModal(orderTx);
      toast.loading("Confirming payment on blockchain...", { id: 'tx-status' });

    } catch (error: any) {
      console.error("Main transaction error:", error);
      setTransactionError(error.message);
      setTxStatus('error');
      toast.error(`Payment failed: ${error.message}`, { id: 'tx-status' });
    }
  };

  const handlePurchase = async () => {
    setShowTransactionModal(true);
    setTransactionError(null);
    setBackendMessage(null);
    setTxStatus('idle');
    setApprovalHash(undefined);
    setOrderHash(undefined);
    backendRequestSentRef.current = null;

    if (!isConnected || !address) {
      toast.error("Please ensure your wallet is connected.");
      setShowTransactionModal(false);
      return;
    }

    if (!requestId || !selectedTokenObj || amountNGN <= 0) {
      toast.error("Please check all form fields.");
      setTxStatus('error');
      return;
    }

    // Validate inputs
    if (phone.length < 10 || phone.length > 11) {
      toast.error("Please enter a valid Nigerian phone number (10-11 digits).");
      setTxStatus('error');
      return;
    }

    if (amountNGN < 100 || amountNGN > 50000) {
      toast.error("Amount must be between ₦100 and ₦50,000.");
      setTxStatus('error');
      return;
    }

    if (!priceNGN || cryptoNeeded <= 0) {
      toast.error("Unable to calculate crypto amount. Please try again.");
      setTxStatus('error');
      return;
    }

    if (tokenAmountForOrder <= 0) {
      toast.error("Invalid token amount calculated. Please try again.");
      setTxStatus('error');
      return;
    }

    if (!selectedTokenObj.address) {
      toast.error("Selected crypto has no contract address.");
      setTxStatus('error');
      return;
    }

    // Ensure we're on Base chain
    try {
      await ensureBaseChain();
    } catch (error: any) {
      toast.error(error.message);
      setTxStatus('error');
      return;
    }

    console.log("--- Starting Mini App Transaction Flow ---");
    console.log("RequestId:", requestId);
    console.log("Token:", selectedTokenObj.symbol);
    console.log("Amount:", cryptoNeeded);
    console.log("Base Chain:", isOnBaseChain);

    try {
      // Step 1: Token Approval
      setTxStatus('waitingForApprovalSignature');
      toast.info("Please approve token spending...");

      // Approve only the required amount for the transaction
      const requiredApproval = tokenAmountForOrder; // Use the exact amount needed for the transaction

      console.log("Approving the required amount for this transaction:", requiredApproval.toString());

      const approvalData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, requiredApproval],
      });

      const approvalTx = await sendTransaction({
        to: selectedTokenObj.address as Hex,
        data: approvalData,
      });

      setApprovalHash(approvalTx);
      setTxStatus('approving');
      setTransactionHashForModal(approvalTx);
      toast.loading("Waiting for approval confirmation...", { id: 'approval-status' });

    } catch (error: any) {
      console.error("Approval transaction error:", error);
      setTransactionError(error.message);
      setTxStatus('error');
      toast.error(`Approval failed: ${error.message}`);
    }

    setRequestId(generateRequestId());
  };

  const handleCloseModal = useCallback(() => {
    if (['waitingForApprovalSignature', 'approving', 'waitingForSignature', 'confirming', 'backendProcessing'].includes(txStatus)) {
      toast.info("Please wait for the transaction to complete before closing.");
      return;
    }
    
    setShowTransactionModal(false);
    setTxStatus('idle');
    setTransactionError(null);
    setBackendMessage(null);
    setTransactionHashForModal(undefined);
    setApprovalHash(undefined);
    setOrderHash(undefined);
    backendRequestSentRef.current = null;
  }, [txStatus]);

  const canPay = selectedToken && network && amount && amountNGN >= 100 && amountNGN <= 50000 && phone && phone.length >= 10 && priceNGN && requestId && tokenAmountForOrder > 0;

  const isButtonDisabled = loading || !canPay ||
                           ['waitingForApprovalSignature', 'approving', 'waitingForSignature', 'confirming', 'backendProcessing'].includes(txStatus) ||
                           walletLoading;

  if (!mounted || walletLoading) {
    return (
      <div className="container py-10 max-w-xl mx-auto">
        <div className="flex items-center justify-center p-10">
          <Loader2 className="w-8 h-8 animate-spin mr-2" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container py-10 max-w-xl mx-auto">
        <div className="flex items-center justify-center p-10">
          <Loader2 className="w-8 h-8 animate-spin mr-2" />
          <span>Loading active tokens...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 h-[812px] relative bg-white rounded-[60px] overflow-hidden">
       <BackToDashboard />
      <div className="left-[35px] top-[53px] absolute justify-start text-black text-2xl font-semibold font-['Montserrat_Alternates'] tracking-[3.60px]">
        Crypto to <br/>Airtime Payment
      </div>

      <div className="w-80 h-[643px] left-[25px] top-[140px] absolute bg-white/90 rounded-[45px] border-2 border-lime-400" />

      {/* Pay With */}
      <div className="left-[61px] top-[166px] absolute justify-start text-black text-xl font-medium font-['Montserrat_Alternates'] tracking-[3px]">
        Pay With
      </div>
      <div className="w-64 h-14 left-[55px] top-[204px] absolute bg-white rounded-[20px] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.25)] border border-black p-2">
        {/* <div className="left-[79px] top-[221px] absolute justify-start text-black text-base font-normal font-['Montserrat_Alternates'] tracking-widest pointer-events-none">
          Select Tokens
        </div> */}
        <div className="h-full flex items-center">
          <Select value={selectedToken} onValueChange={setSelectedToken}>
            <SelectTrigger id="token-select" className="w-full">
              <SelectValue placeholder="Select crypto" />
            </SelectTrigger>
            <SelectContent>
              {activeTokens.length === 0 ? (
                <SelectItem value="" disabled>No ERC20 tokens available</SelectItem>
              ) : (
                activeTokens.map(token => (
                  <SelectItem key={token.address} value={token.address}>
                    {token.symbol} - {token.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Network Provider */}
      <div className="left-[55px] top-[290px] absolute justify-start text-black text-xl font-medium font-['Montserrat_Alternates'] tracking-[3px]">
        Network Provider
      </div>
      <div className="w-64 h-14 left-[55px] top-[329px] absolute bg-white rounded-[20px] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.25)] border border-black p-2">
        {/* <div className="left-[79px] top-[343px] absolute justify-start text-black text-base font-normal font-['Montserrat_Alternates'] tracking-widest pointer-events-none">
          Select Network
        </div> */}
        <div className="h-full flex items-center">
          <Select value={network} onValueChange={setNetwork}>
            <SelectTrigger id="network-select" className="w-full">
              <SelectValue placeholder="Select service provider" />
            </SelectTrigger>
            <SelectContent>
              {NETWORKS.map(n => (
                <SelectItem key={n.serviceID} value={n.serviceID}>
                  {n.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Amount */}
      <div className="left-[61px] top-[412px] absolute justify-start text-black text-xl font-medium font-['Montserrat_Alternates'] tracking-[3px]">
        Amount
      </div>
      <div className="w-64 h-14 left-[55px] top-[441px] absolute bg-white rounded-[20px] border border-black/20 p-2">
        <div className="left-[79px] top-[457px] absolute justify-start text-black/30 text-base font-normal font-['Montserrat_Alternates'] tracking-widest pointer-events-none">
          Enter Amount
        </div>
        <div className="h-full flex items-center">
          <Input
            id="amount-input"
            type="number"
            placeholder="Enter amount (₦100 - ₦50,000)"
            value={amount}
            onChange={e => {
              const val = e.target.value;
              if (val === "" || val === "0") {
                setAmount("");
              } else {
                const numVal = Math.max(0, parseInt(val));
                setAmount(String(Math.min(numVal, 50000)));
              }
            }}
            min={100}
            max={50000}
            disabled={!selectedTokenObj}
            className="w-full"
          />
        </div>
      </div>

      {/* Phone Number */}
      <div className="left-[61px] top-[527px] absolute justify-start text-black text-xl font-medium font-['Montserrat_Alternates'] tracking-[3px]">
        Phone Number
      </div>
      <div className="w-64 h-14 left-[55px] top-[557px] absolute bg-white rounded-[20px] border border-black/20 p-2">
        <div className="left-[77px] top-[575px] absolute justify-start text-black/30 text-base font-medium font-['Montserrat_Alternates'] tracking-widest pointer-events-none">
          Enter Number
        </div>
        <div className="h-full flex items-center">
          <Input
            id="phone-input"
            type="tel"
            placeholder="Enter phone number (11 digits)"
            value={phone}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, "");
              setPhone(v.slice(0, 11));
            }}
            maxLength={11}
            className="w-full"
          />
        </div>
      </div>

      {/* Proceed Button */}
      <div className="w-64 h-14 left-[55px] top-[679px] absolute bg-gradient-to-r from-black/0 to-blue-700/50 rounded-[20px] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.25)]"></div>

      <div className="left-[125px] top-[693px] absolute justify-start">
        <Button
          onClick={handlePurchase}
          disabled={isButtonDisabled}
          className="text-white text-2xl font-semibold font-['Montserrat_Alternates'] tracking-[3.60px]"
        >
          {txStatus === 'waitingForApprovalSignature' ? "Awaiting Approval..." :
          txStatus === 'approving' ? "Approving Token..." :
          txStatus === 'approvalSuccess' ? "Starting Payment..." :
          txStatus === 'waitingForSignature' ? "Awaiting Payment..." :
          txStatus === 'confirming' ? "Confirming..." :
          txStatus === 'success' ? "Payment Confirmed!" :
          txStatus === 'backendProcessing' ? "Processing Order..." :
          txStatus === 'backendSuccess' ? "Airtime Delivered!" :
          txStatus === 'backendError' ? "Order Failed - Try Again" :
          txStatus === 'error' ? "Transaction Failed - Try Again" :
          !isConnected ? "Wallet Not Connected" :
          canPay ? "Proceed" :
          "Fill all details"}
        </Button>
      </div>

      {/* Small info / pricing badge - placed near inner card bottom */}
      <div className="absolute left-[55px] top-[600px] text-xs text-muted-foreground">
        {amountNGN > 0 && priceNGN && selectedTokenObj ? (
          <div className="text-sm text-muted-foreground flex items-center justify-between">
            <span>
              You will pay: ~{cryptoNeeded.toFixed(selectedTokenObj!.decimals)} {selectedTokenObj!.symbol}
            </span>
            <Badge variant="secondary">
              1 {selectedTokenObj!.symbol} = ₦{priceNGN?.toLocaleString()}
            </Badge>
          </div>
        ) : null}
      </div>

      <TransactionStatusModal
        isOpen={showTransactionModal}
        onClose={handleCloseModal}
        txStatus={txStatus}
        transactionHash={transactionHashForModal}
        errorMessage={transactionError}
        backendMessage={backendMessage}
        requestId={requestId}
      />
    </div>
  )
}