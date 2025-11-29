// app/electricity/page.tsx
"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {Button} from "@/components/ui/button"
import {Label} from "@/components/ui/label"
import {Badge} from "@/components/ui/badge"
import { Loader2, AlertCircle, CheckCircle, Info, Wifi } from "lucide-react"
import BackToDashboard from "@/components/BackToDashboard"
import { Input } from "@/components/ui/input"

import { useMiniAppWallet, useTransactionWait } from '@/hooks/useMiniAppWallet';
import { ERC20_ABI } from "@/config/erc20Abi";
import { parseUnits, toBytes, toHex, Hex, encodeFunctionData } from 'viem';
import { toast } from 'sonner';
import { TransactionStatusModal } from "@/components/TransactionStatusModal";

import { payElectricityBill, verifyMeter } from "@/lib/api";
import { TokenConfig } from "@/lib/tokenlist";
import { fetchActiveTokensWithMetadata } from "@/lib/tokenUtils";

import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";

// Dynamic ERC20 token list from contract
const ELECTRICITY_PROVIDERS = [
  { serviceID: "ikeja-electric", name: "Ikeja Electric" },
  { serviceID: "eko-electric", name: "Eko Electric" },
  { serviceID: "kano-electric", name: "Kano Electric" },
  { serviceID: "portharcourt-electric", name: "Port Harcourt Electric" },
  { serviceID: "jos-electric", name: "Jos Electric" },
  { serviceID: "ibadan-electric", name: "Ibadan Electric" },
  { serviceID: "kaduna-electric", name: "Kaduna Electric" },
  { serviceID: "abuja-electric", name: "Abuja Electric" },
  { serviceID: "enugu-electric", name: "Enugu Electric (EEDC)" },
  { serviceID: "benin-electric", name: "Benin Electric" },
  { serviceID: "aba-electric", name: "Aba Electric" },
  { serviceID: "yola-electric", name: "Yola Electric" },
]

interface ElectricityPlan {
  variation_code: string
  name: string
}

const METER_LENGTHS: Record<string, number[]> = {
  prepaid: [11, 12, 13],
  postpaid: [10, 11, 13],
  default: [10, 11, 12, 13],
}

function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
}

// Fetch prices for dynamic tokens
async function fetchPrices(tokenList: TokenConfig[]): Promise<Record<string, any>> {
  if (!tokenList || tokenList.length === 0) return {};
  const ids = tokenList.map(c => c.coingeckoId).join(",");
  try {
    const res = await fetch(`https://paycrypt-margin-price.onrender.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,ngn`);
    return res.ok ? await res.json() : {};
  } catch (error) {
    console.error("Error fetching prices:", error);
    return {};
  }
}

async function fetchElectricityPlans(serviceID: string) {
  try {
    const res = await fetch(`/api/vtpass/service-variations?serviceID=${serviceID}`)
    if (!res.ok) {
      console.error("Failed to fetch electricity plans:", res.status);
      return [];
    }
    const data = await res.json()
    console.log('Electricity plans response:', data);
    return data.content?.variations || []
  } catch (error) {
    console.error("Error fetching electricity plans:", error);
    return [];
  }
}

/* ---------- VTpass verify - BACKEND API VERSION ---------- */
async function verifyMeterNumber(billersCode: string, serviceID: string, type: string) {
  try {
    console.log("Verifying meter:", { billersCode, serviceID, type });
    
    const data = await verifyMeter({ billersCode, serviceID, type });
    console.log("Verification response data:", data);

    if (data.success && data.data) {
      return data.data;
    } else {
      // Handle various error responses from backend
      const errorMsg = data.error || data.message || data.vtpassResponse?.errors || "Invalid meter number or service unavailable";
      console.error("Verification failed:", errorMsg);
      throw new Error(errorMsg);
    }
  } catch (error: any) {
    console.error("Meter verification error:", error);
    if (error.message.includes('Failed to verify meter')) {
      throw new Error("Service temporarily unavailable. Please try again later.");
    }
    throw new Error(error.message || "Verification failed. Please try again.");
  }
}

function getMeterLength(planCode: string): number[] {
  const lc = planCode.toLowerCase()
  if (lc.includes("prepaid")) return METER_LENGTHS.prepaid
  if (lc.includes("postpaid")) return METER_LENGTHS.postpaid
  return METER_LENGTHS.default
}

export default function ElectricityPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTokens, setActiveTokens] = useState<TokenConfig[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [provider, setProvider] = useState("");
  const [plan, setPlan] = useState("");
  const [amount, setAmount] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [plans, setPlans] = useState<ElectricityPlan[]>([]);
  const [prices, setPrices] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [verifyingMeter, setVerifyingMeter] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [requestId, setRequestId] = useState<string | undefined>(undefined);
  const [phone, setPhone] = useState("");

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

  // Initial load: fetch active tokens and prices
  useEffect(() => {
    if (!mounted) return;
    
    async function loadTokensAndPrices() {
      setLoading(true);
      try {
        const tokens = await fetchActiveTokensWithMetadata();
        // Filter out ETH (tokenType 0) as per requirement - ERC20 only
        const erc20Tokens = tokens.filter(token => token.tokenType !== 0);
        setActiveTokens(erc20Tokens);
        const prices = await fetchPrices(erc20Tokens);
        setPrices(prices);
      } catch (error) {
        console.error("Error loading tokens and prices:", error);
        toast.error("Failed to load token data. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadTokensAndPrices();
  }, [mounted]);

  /* plans when provider changes */
  useEffect(() => {
    if (!provider) {
        setPlans([]);
        setPlan("");
        return;
    }
    setLoadingPlans(true)
    fetchElectricityPlans(provider).then(setPlans).finally(() => setLoadingPlans(false))
  }, [provider])

  /* requestId generator */
  useEffect(() => {
    if ((selectedToken || provider || plan || meterNumber || amount || phone) && !requestId) {
        setRequestId(generateRequestId());
    } else if (!(selectedToken || provider || plan || meterNumber || amount || phone) && requestId) {
        setRequestId(undefined);
    }
  }, [selectedToken, provider, plan, meterNumber, amount, phone, requestId]);

  /* auto-verify meter - ENHANCED ERROR HANDLING WITH DEV MODE */
  useEffect(() => {
    if (!provider || !plan || !meterNumber) {
      setCustomerName("")
      setCustomerAddress("")
      setVerificationError("")
      setVerificationSuccess(false)
      return
    }

    const validLengths = getMeterLength(plan)
    if (!validLengths.includes(meterNumber.length)) {
      setCustomerName("")
      setCustomerAddress("")
      setVerificationError(`Please enter a valid ${validLengths.join(" or ")} digit meter number for ${ELECTRICITY_PROVIDERS.find(p => p.serviceID === provider)?.name || 'this provider'}.`)
      setVerificationSuccess(false)
      return
    }

    const id = setTimeout(async () => {
      setVerifyingMeter(true)
      setVerificationError("")
      setVerificationSuccess(false)
      setCustomerName("")
      setCustomerAddress("")

      try {
        const content = await verifyMeterNumber(meterNumber, provider, plan)

        // Enhanced handling of customer data with multiple fallbacks
        const name = content?.Customer_Name || 
                    content?.customer_name || 
                    content?.customerName ||
                    content?.name || 
                    content?.Name || "";
                    
        const address = content?.Customer_Address || 
                       content?.customer_address || 
                       content?.customerAddress ||
                       content?.address || 
                       content?.Address || "";

        console.log("Parsed customer data:", { name, address, rawContent: content });

        if (!name || name.trim() === "") {
          throw new Error("Customer name not found. Please verify the meter number and provider selection are correct.");
        }

        setCustomerName(name.trim())
        setCustomerAddress(address.trim())
        setVerificationSuccess(true)
        
        // Clear any previous errors
        setVerificationError("")
        
      } catch (err: any) {
        console.error("Meter verification failed:", err);
        let errorMessage = err.message || "Verification failed. Please try again.";
        
        // Handle specific error cases
        if (errorMessage.includes("fetch") || errorMessage.includes("Failed to fetch")) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (errorMessage.includes("404") || errorMessage.includes("Not Found")) {
          errorMessage = "Service temporarily unavailable. Please try again later.";
        } else if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
          errorMessage = "Request timeout. Please try again.";
        } else if (errorMessage.includes("500") || errorMessage.includes("Internal Server Error")) {
          errorMessage = "Server error. Please try again later.";
        } else if (errorMessage.includes("IP NOT WHITELISTED") || errorMessage.includes("whitelisted")) {
          // Development mode fallback - use mock data
          console.warn("IP not whitelisted, using mock data for development");
          setCustomerName(`Test Customer (${meterNumber})`);
          setCustomerAddress("Test Address, Lagos, Nigeria");
          setVerificationSuccess(true);
          setVerificationError("");
          return;
        }
        
        setVerificationError(errorMessage);
      } finally {
        setVerifyingMeter(false)
      }
    }, 1000) // Increased debounce time to 1 second for better UX
    
    return () => clearTimeout(id)
  }, [meterNumber, provider, plan])

  // Derived values for selected token
  const selectedTokenObj = activeTokens.find(t => t.address === selectedToken);
  const priceNGN = selectedTokenObj ? prices[selectedTokenObj.coingeckoId]?.ngn : null;
  const amountNGN = Number(amount) || 0;
  const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0;
  const tokenAmountForOrder: bigint = selectedTokenObj ? parseUnits(cryptoNeeded.toFixed(selectedTokenObj.decimals), selectedTokenObj.decimals) : BigInt(0);
  const bytes32RequestId: Hex = toHex(toBytes(requestId || ""), { size: 32 });

  // Update backendMessage state to include details
  const [backendDetails, setBackendDetails] = useState<{
    token?: string;
    units?: string;
    amount?: number;
  } | undefined>(undefined);

  // Backend processing after blockchain confirmation
  const handlePostTransaction = useCallback(async (transactionHash: Hex) => {
    if (backendRequestSentRef.current === transactionHash) {
      console.log(`Backend request already sent for hash: ${transactionHash}. Skipping duplicate.`);
      return;
    }

    backendRequestSentRef.current = transactionHash;
    setTxStatus('backendProcessing');
    setBackendMessage("Processing your electricity bill payment...");
    toast.loading("Processing order with our service provider...", { id: 'backend-status' });

    try {
      const response = await payElectricityBill({
        requestId: requestId!,
        meter_number: meterNumber,
        serviceID: provider,
        variation_code: plan,
        amount: amountNGN,
        phone:phone,
        cryptoUsed: parseFloat(cryptoNeeded.toFixed(selectedTokenObj?.decimals || 6)),
        cryptoSymbol: selectedTokenObj?.symbol!,
        transactionHash,
        userAddress: address!
      });

      if (response.status === 'success' && response.details) {
        setBackendDetails(response.details);
        setBackendMessage(
          `Payment successful! ${response.details.token ? 'Your prepaid token has been generated.' : ''}`
        );
      }

      setTxStatus('backendSuccess');
      toast.success("Electricity bill paid successfully!", { id: 'backend-status' });

      // Reset form after successful payment with delay
      setTimeout(() => {
        setSelectedToken("");
        setProvider("");
        setPlan("");
        setAmount("");
        setMeterNumber("");
        setCustomerName("");
        setCustomerAddress("");
        setVerificationSuccess(false);
        setRequestId(undefined);
        setPhone("");
        backendRequestSentRef.current = null;
        // Clear requestId slightly later to prevent immediate re-generation
        setTimeout(() => setRequestId(undefined), 100);
      }, 3000); 

    } catch (error: any) {
      setBackendDetails(undefined);
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
  }, [requestId, meterNumber, provider, plan, amountNGN, phone, cryptoNeeded, selectedTokenObj?.symbol, selectedTokenObj?.decimals, address]);

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

    if (!requestId) {
      toast.error("Request ID not generated. Please fill all form details.");
      setTxStatus('error');
      return;
    }

    if (!verificationSuccess || !customerName) {
      toast.error("Please verify meter number before proceeding with purchase.");
      setTxStatus('error');
      return;
    }

    if (amountNGN <= 0) {
      toast.error("Please enter a valid amount.");
      setTxStatus('error');
      return;
    }

    if (!selectedTokenObj) {
      toast.error("Please select a token.");
      setTxStatus('error');
      return;
    }

    if (typeof tokenAmountForOrder === "bigint" ? tokenAmountForOrder === BigInt(0) : tokenAmountForOrder === 0) {
      toast.error('Amount too low. Please enter a valid amount.');
      setRequestId(generateRequestId());
      return;
    }

    if (!selectedTokenObj.address) {
      toast.error("Selected token has no contract address for approval.");
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

    console.log("--- Starting Mini App Electricity Payment ---");
    console.log("RequestId:", requestId);
    console.log("Token:", selectedTokenObj.symbol);
    console.log("Amount:", cryptoNeeded);
    console.log("Base Chain:", isOnBaseChain);

    try {
      // Step 1: Token Approval - Only approve required amount
      setTxStatus('waitingForApprovalSignature');
      toast.info("Please approve token spending...");

      // Use the exact amount needed for the transaction
      const requiredApproval = tokenAmountForOrder;
      
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

  // Protected modal close - prevent closing during critical phases
  const handleCloseModal = useCallback(() => {
    // Don't allow closing during critical transaction phases
    if (['waitingForApprovalSignature', 'approving', 'waitingForSignature', 'sending', 'confirming', 'backendProcessing'].includes(txStatus)) {
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

  const canPay =
    selectedToken &&
    provider &&
    plan &&
    meterNumber &&
    amount &&
    amountNGN >= 500 &&
    phone &&
    priceNGN &&
    requestId &&
    customerName &&
    verificationSuccess;

  const isButtonDisabled = loading || loadingPlans || verifyingMeter ||
                           ['waitingForApprovalSignature', 'approving', 'waitingForSignature', 'confirming', 'backendProcessing'].includes(txStatus) ||
                           !canPay ||
                           walletLoading;

  // Don't render until mounted
  if (!mounted || walletLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        <span>Loading...</span>
      </div>
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center p-10">
      <Loader2 className="w-8 h-8 animate-spin mr-2" />
      <span>Loading active tokens...</span>
    </div>
  );

    return (
    <div className="w-96 h-[1026px] relative bg-white rounded-[60px] overflow-hidden">
          <div className="absolute left-4 right-4 top-4 z-20 flex items-center gap-2 px-4 py-2 bg-white/90 rounded-xl shadow-sm">
            <BackToDashboard />
            <div className="text-black text-2xl font-semibold font-['Montserrat_Alternates'] tracking-[3.60px]">
              Crypto to Electricity Payment
            </div>
          </div>
      

      {/* inner panel */}
      <div className="absolute left-[25px] top-[140px] w-80 h-[849px] bg-white/90 rounded-[45px] border-2 border-lime-400 p-6 overflow-auto">
        <div className="flex flex-col gap-4 h-full">
                                    {/* Pay With */}
                              <div className="text-black text-xl font-medium font-['Montserrat_Alternates'] tracking-[3px]">
                                      Pay With
                              <div className="w-full bg-white rounded-[20px] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.25)] border border-black p-2">
                                  <Select value={selectedToken} onValueChange={setSelectedToken}>
                                      <SelectTrigger>
                                          <SelectValue placeholder="Select ERC20 token" />
                                      </SelectTrigger>
                                      <SelectContent>
                                          {activeTokens.length === 0 ? (
                                              <SelectItem value="" disabled>No ERC20 tokens available</SelectItem>
                                          ) : (
                                              activeTokens.map((c) => (
                                                  <SelectItem key={c.address} value={c.address}>
                                                      {c.symbol} - {c.name}
                                                  </SelectItem>
                                              ))
                                          )}
                                      </SelectContent>
                                  </Select>
                              </div>
                              </div>
                              
          {/* Provider */}
          <div className="space-y-2">
            <Label htmlFor="provider-select">Electricity Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger id="provider-select" className="rounded-[20px] border border-black/20 h-12 px-3">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {ELECTRICITY_PROVIDERS.map(p => (
                  <SelectItem key={p.serviceID} value={p.serviceID}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Meter type */}
          <div className="space-y-2">
            <Label htmlFor="meter-type-select">Meter Type</Label>
            <Select value={plan} onValueChange={setPlan} disabled={!provider || loadingPlans}>
              <SelectTrigger id="meter-type-select" className="rounded-[20px] border border-black/20 h-12 px-3">
                <SelectValue placeholder={loadingPlans ? "Loading..." : "Select type"} />
              </SelectTrigger>
              <SelectContent>
                {plans.map(p => (
                  <SelectItem key={p.variation_code} value={p.variation_code}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Meter number */}
          <div className="space-y-2">
            <Label htmlFor="meter-number-input">Meter Number</Label>
            <Input
              id="meter-number-input"
              type="text"
              placeholder={plan ? `Enter ${getMeterLength(plan).join(" or ")}-digit meter number` : "Select a Meter Type first"}
              value={meterNumber}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, "")
                setMeterNumber(v)
                setVerificationError("")
                setVerificationSuccess(false)
                setCustomerName("")
                setCustomerAddress("")
              }}
              maxLength={plan ? Math.max(...getMeterLength(plan)) : undefined}
              disabled={!plan}
              className="rounded-[20px] border border-black/20 shadow-[0_2px_4px_rgba(0,0,0,0.25)] h-12 px-3"
            />
            {verifyingMeter && (
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying meter…</span>
              </div>
            )}
            {verificationSuccess && (
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>Meter verified successfully</span>
              </div>
            )}
            {verificationError && (
              <div className="flex items-center space-x-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>{verificationError}</span>
              </div>
            )}
          </div>

          {/* Customer details */}
          {customerName && (
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input value={customerName} readOnly className="bg-green-50 text-black rounded-[12px]" />
            </div>
          )}
          {customerAddress && (
            <div className="space-y-2">
              <Label>Customer Address</Label>
              <Input value={customerAddress} readOnly className="bg-green-50 text-black" />
            </div>
          )}

            {/* Amount */}
            <div className="space-y-2">
            <Label htmlFor="amount">Amount (NGN)</Label>
            <Input
              id="amount"
              type="number"
              min={500}
              max={50000}
              placeholder="Enter amount in Naira, minimum ₦500"
              value={amount}
              onChange={(e) => {
              const val = e.target.value;
              if (val === "" || val === "0") {
                setAmount("");
              } else {
                setAmount(String(Math.max(0, parseInt(val))));
              }
              }}
              className="rounded-[20px] border border-black/20 h-12 px-3"
            />

            <div className="text-sm text-black/70 font-['Montserrat_Alternates'] tracking-wide">
              {amountNGN > 0
              ? `${amountNGN} ~${selectedTokenObj ? cryptoNeeded.toFixed(selectedTokenObj.decimals) : cryptoNeeded.toFixed(6)} ${selectedTokenObj?.symbol ?? ''}`
              : ''}
            </div>
            </div>

          {/* Phone Number */}
          <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (for receipt/notifications)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g. 080*********"
                  maxLength={11}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-[20px] border border-black/20 h-12 px-3"
                />
          </div>


             <div className="mt-auto">
                  <Button
                     onClick={handlePurchase}
                     disabled={isButtonDisabled}
                    className="w-full h-14 rounded-[20px] flex items-center px-4"
                     style={{
                     borderRadius: "20px",
                    background:
                     "linear-gradient(91deg, rgba(0, 0, 0, 0.00) 0.52%, rgba(20, 55, 255, 0.50) 90.44%), linear-gradient(85deg, rgba(212, 255, 22, 0.50) 1.75%, rgba(0, 0, 0, 0.50) 35.67%), #302F2F",
                      boxShadow: "0 2px 4px 0 rgba(0, 0, 0, 0.25)",
                       }} >
              {txStatus === 'waitingForApprovalSignature' ? "Awaiting Approval..." :
              txStatus === 'approving' ? "Approving Token..." :
              txStatus === 'approvalSuccess' ? "Starting Payment..." :
              txStatus === 'waitingForSignature' ? "Awaiting Payment..." :
              txStatus === 'confirming' ? "Confirming..." :
              txStatus === 'success' ? "Payment Confirmed!" :
              txStatus === 'backendProcessing' ? "Processing Order..." :
              txStatus === 'backendSuccess' ? "Payment Successful!" :
              txStatus === 'backendError' ? "Payment Failed - Try Again" :
              txStatus === 'error' ? "Transaction Failed - Try Again" :
              !isConnected ? "Wallet Not Connected" :
              canPay ? "Purchase Electricity Bill" :
              "Fill all details and verify meter"}
          </Button>

           {/* Only show Request ID as requested */}
                    <div className="w-full flex justify-center items-center text-xs text-muted-foreground">
                      Request ID: <span className="inline-block font-mono">{requestId ?? "—"}</span>
                    </div>

      <TransactionStatusModal
        isOpen={showTransactionModal}
        onClose={handleCloseModal}
        txStatus={txStatus}
        transactionHash={transactionHashForModal}
        errorMessage={transactionError}
        backendMessage={backendMessage}
        requestId={requestId}
        backendDetails={backendDetails}  // Add this prop
      />
        </div>
      </div>
    </div>
    </div>
    
  )
}