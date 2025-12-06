// app/tv/page.tsx
"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {Button} from "@/components/ui/button"
import {Label} from "@/components/ui/label"
import {Badge} from "@/components/ui/badge"
import { Loader2, AlertCircle, CheckCircle, Wifi } from "lucide-react"
import BackToDashboard from "@/components/BackToDashboard"
import { Input } from "@/components/ui/input"

import { useMiniAppWallet, useTransactionWait } from '@/hooks/useMiniAppWallet';
import { getContractAddress, CONTRACT_ABI } from "@/config/contract";
import { ERC20_ABI } from "@/config/erc20Abi";
import { parseUnits, toBytes, toHex, Hex, encodeFunctionData } from 'viem';
import { toast } from 'sonner';
import { TransactionStatusModal } from "@/components/TransactionStatusModal";

import { payTVSubscription, verifySmartCard } from "@/lib/api";
import { TokenConfig, getTokensForChain } from "@/lib/tokenlist";

interface TVProvider {
  serviceID: string
  name: string
}

interface TVPlan {
  variation_code: string
  name: string
  variation_amount: string
}

const SMART_CARD_LENGTHS: Record<string, number[]> = {
  dstv: [10, 11],
  gotv: [10, 11],
  startimes: [10, 11],
  showmax: [10, 11],
  default: [10, 11, 12],
}

function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
}

/* ---------- fetch helpers - using backend API ---------- */

async function fetchPrices(tokenList: TokenConfig[]): Promise<Record<string, any>> {
  const ids = tokenList.map((c: TokenConfig) => c.coingeckoId).join(",");
  if (!ids) return {};
  const res = await fetch(`https://paycrypt-margin-price.onrender.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,ngn`);
  return res.ok ? await res.json() : {};
}

async function fetchTVProviders() {
  try {
    const res = await fetch("/api/vtpass/services?identifier=tv-subscription")
    if (!res.ok) {
      console.error("Failed to fetch TV providers:", res.status);
      return [];
    }
    const data = await res.json()
    console.log('TV providers response:', data);
    return data.content || []
  } catch (error) {
    console.error("Error fetching TV providers:", error);
    return [];
  }
}

async function fetchTVPlans(serviceID: string) {
  try {
    const res = await fetch(`/api/vtpass/service-variations?serviceID=${serviceID}`)
    if (!res.ok) {
      console.error("Failed to fetch TV plans:", res.status);
      return [];
    }
    const data = await res.json()
    console.log('TV plans response:', data);
    return data.content?.variations || []
  } catch (error) {
    console.error("Error fetching TV plans:", error);
    return [];
  }
}

/* ---------- VTpass verify - using backend API ---------- */
async function verifyCard(billersCode: string, serviceID: string) {
  try {
    console.log("Verifying card:", billersCode, "for provider:", serviceID);
    const data = await verifySmartCard({ billersCode, serviceID, type: "smartcard" });
    console.log("Verification response:", data);

    if (data.success && data.data) {
      return data.data;
    } else {
      throw new Error(data.error || "Verification failed");
    }
  } catch (error: any) {
    console.error("Verify card error:", error);
    if (error.message.includes('Failed to verify smart card')) {
      throw new Error("Service temporarily unavailable. Please try again later.");
    }
    throw error;
  }
}

function getSmartCardLength(serviceID: string): number[] {
  const id = serviceID.toLowerCase()
  return SMART_CARD_LENGTHS[id] ?? SMART_CARD_LENGTHS.default
}

export default function TVPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>("");
  const [provider, setProvider] = useState("");
  const [plan, setPlan] = useState("");
  const [smartCardNumber, setSmartCardNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [currentBouquet, setCurrentBouquet] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [renewalAmount, setRenewalAmount] = useState("");
  const [providers, setProviders] = useState<TVProvider[]>([]);
  const [plans, setPlans] = useState<TVPlan[]>([]);
  const [prices, setPrices] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [verifyingCard, setVerifyingCard] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [requestId, setRequestId] = useState<string | undefined>(undefined);
  const [lastLoadedChainId, setLastLoadedChainId] = useState<number | null>(null);

  const [activeTokens, setActiveTokens] = useState<TokenConfig[]>([]);

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
    chainIdNumber,
    isOnSupportedChain
  } = useMiniAppWallet();

  // Get chain name based on chainId
  const getChainName = (): string => {
    switch(chainIdNumber) {
      case 8453: return "Base";
      case 1135: return "Lisk";
      case 42220: return "Celo";
      default: return "Unknown";
    }
  };

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

  // Derived values
  const selectedCrypto = activeTokens.find(c => c.address === selectedTokenAddress);
  const selectedPlan = plans.find(p => p.variation_code === plan);
  const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null;
  const amountNGN = selectedPlan ? Number(selectedPlan.variation_amount) : 0;
  const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0;

  const tokenAmountForOrder: bigint = selectedCrypto ? parseUnits(cryptoNeeded.toFixed(selectedCrypto.decimals), selectedCrypto.decimals) : BigInt(0);
  const bytes32RequestId: Hex = toHex(toBytes(requestId || ""), { size: 32 });

  /* initial load - reload when chain changes */
  useEffect(() => {
    if (!mounted) return;
    
    // Skip loading if we just loaded tokens for this chain
    if (lastLoadedChainId === chainIdNumber) {
      console.log(`Tokens already loaded for chain ${chainIdNumber}, skipping reload`);
      return;
    }

    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        // Use static token list from tokenlist.ts for current chain
        const chainTokens = getTokensForChain(chainIdNumber);
        if (!isMounted) return;
        setActiveTokens(chainTokens);
        setLastLoadedChainId(chainIdNumber);
        const prices = await fetchPrices(chainTokens);
        if (!isMounted) return;
        setPrices(prices);
        const prov = await fetchTVProviders();
        if (!isMounted) return;
        setProviders(prov);
        console.log(`Loaded ${chainTokens.length} tokens for chain ${chainIdNumber}`);
      } catch (error) {
        console.error("Error loading tokens, prices, or providers:", error);
        toast.error("Failed to load essential data. Please try again.");
      } finally {
        setLoading(false);
        setLoadingProviders(false);
      }
    })();
    return () => { isMounted = false; };
  }, [mounted, chainIdNumber, lastLoadedChainId]);

  /* plans when provider changes */
  useEffect(() => {
    if (!provider) {
        setPlans([]);
        setPlan("");
        return;
    }
    setLoadingPlans(true)
    fetchTVPlans(provider).then(setPlans).finally(() => setLoadingPlans(false))
  }, [provider])

  /* requestId generator */
  useEffect(() => {
    if ((selectedTokenAddress || provider || plan || smartCardNumber || customerName || verificationSuccess) && !requestId)
      setRequestId(generateRequestId())
    else if (!(selectedTokenAddress || provider || plan || smartCardNumber || customerName || verificationSuccess) && requestId) {
      setRequestId(undefined)
    }
  }, [selectedTokenAddress, provider, plan, smartCardNumber, customerName, verificationSuccess, requestId])

  /* auto-verify card - using backend API */
  useEffect(() => {
    if (!provider || !smartCardNumber) {
      setCustomerName("")
      setCurrentBouquet("")
      setDueDate("")
      setRenewalAmount("")
      setVerificationError("")
      setVerificationSuccess(false)
      return
    }

    const validLengths = getSmartCardLength(provider)
    if (!validLengths.includes(smartCardNumber.length)) {
      setCustomerName("")
      setCurrentBouquet("")
      setDueDate("")
      setRenewalAmount("")
      setVerificationError(`Please enter a valid ${validLengths.join(" or ")} digit smart card number for ${providers.find(p => p.serviceID === provider)?.name || 'this provider'}.`)
      setVerificationSuccess(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      setVerifyingCard(true)
      setVerificationError("")
      setVerificationSuccess(false)
      setCustomerName("")
      setCurrentBouquet("")
      setDueDate("")
      setRenewalAmount("")

      try {
        const content = await verifyCard(smartCardNumber, provider)

        // Enhanced handling of customer data with multiple fallbacks
        const name = content?.Customer_Name || 
                    content?.customer_name || 
                    content?.customerName ||
                    content?.name || 
                    content?.Name || "";
                    
        const bouquet = content?.Current_Bouquet || 
                       content?.current_bouquet || 
                       content?.currentBouquet ||
                       content?.bouquet || 
                       content?.Bouquet || "";

        const due = content?.Due_Date || 
                   content?.due_date || 
                   content?.dueDate ||
                   content?.date || 
                   content?.Date || "";

        const renewal = content?.Renewal_Amount || 
                       content?.renewal_amount || 
                       content?.renewalAmount ||
                       content?.amount || 
                       content?.Amount || "";

        console.log("Parsed customer data:", { name, bouquet, due, renewal, rawContent: content });

        if (!name || name.trim() === "" || name === "null" || !content?.Customer_Name) {
          // Check if it's a valid response but inactive card
          if (content?.WrongBillersCode === false && content?.Customer_Name === null) {
            throw new Error("This smart card number appears to be inactive or has no active subscription. Please check the card number or contact your service provider.");
          }
          throw new Error("Customer name not found. Please check the smart card number.");
        }

        setCustomerName(name.trim())
        setCurrentBouquet(bouquet.trim())
        setDueDate(due.trim())
        setRenewalAmount(renewal.trim())
        setVerificationSuccess(true)
        toast.success(`Card verified for ${name.trim()}`)
      } catch (err: any) {
        console.error("Verification error:", err);
        let errorMessage = err.message || "Verification failed. Please try again.";
        
        // Handle specific error cases
        if (errorMessage.includes("Service temporarily unavailable")) {
          // Keep the original message
        } else if (errorMessage.includes("Network error") || errorMessage.includes("Failed to fetch")) {
          errorMessage = "Network error. Please check your connection and try again.";
        }
        
        setVerificationError(errorMessage);
        toast.error("Card verification failed");
      } finally {
        setVerifyingCard(false)
      }
    }, 1000) // 1 second delay

    return () => clearTimeout(timeoutId)
  }, [smartCardNumber, provider, providers])

  // Handle backend API call after successful transaction
  const handlePostTransaction = useCallback(async (transactionHash: Hex) => {
    if (backendRequestSentRef.current === transactionHash) {
      console.log(`Backend request already sent for hash: ${transactionHash}. Skipping duplicate.`);
      return;
    }

    backendRequestSentRef.current = transactionHash;
    setTxStatus('backendProcessing');
    setBackendMessage("Processing your order...");
    toast.loading("Processing order with VTpass...", { id: 'backend-status' });

    try {
      const response = await payTVSubscription({
        requestId: requestId!,
        smartcard_number: smartCardNumber,
        serviceID: provider,
        variation_code: plan,
        amount: amountNGN,
        phone: smartCardNumber, // Using smartCardNumber as phone
        cryptoUsed: parseFloat(cryptoNeeded.toFixed(selectedCrypto?.decimals || 6)),
        cryptoSymbol: selectedCrypto?.symbol!,
        transactionHash,
        userAddress: address!,
        chainId: chainIdNumber,
        chainName: getChainName()
      });

      console.log('Backend success response:', response);
      setTxStatus('backendSuccess');
      setBackendMessage("TV subscription paid successfully!");
      toast.success("TV subscription paid successfully!", { id: 'backend-status' });

      // Reset form for next transaction after a delay
      setTimeout(() => {
        setSelectedTokenAddress("");
        setProvider("");
        setPlan("");
        setSmartCardNumber("");
        setCustomerName("");
        setCurrentBouquet("");
        setDueDate("");
        setRenewalAmount("");
        setVerificationSuccess(false);
        setRequestId(undefined);
        backendRequestSentRef.current = null;
        // Clear requestId slightly later to prevent immediate re-generation
        setTimeout(() => setRequestId(undefined), 100);
      }, 3000); 
    } catch (error: any) {
      console.error("Backend API call failed:", error);
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
  }, [requestId, smartCardNumber, provider, plan, amountNGN, cryptoNeeded, selectedCrypto?.symbol, selectedCrypto?.decimals, address]);

  const handleMainTransaction = async () => {
    try {
      setTxStatus('waitingForSignature');
      toast.info("Please confirm the payment transaction...");

      const orderData = encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: 'createOrder',
        args: [
          bytes32RequestId,
          selectedCrypto!.address as Hex,
          tokenAmountForOrder,
        ],
      });

      const orderTx = await sendTransaction({
        to: getContractAddress(chainIdNumber) as Hex,
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
      toast.error("Please verify smart card number before proceeding with purchase.");
      setTxStatus('error');
      return;
    }
    if (!selectedPlan) {
      toast.error("Please select a subscription plan.");
      setTxStatus('error');
      return;
    }
    if (amountNGN <= 0) {
      toast.error("Selected plan has an invalid amount.");
      setTxStatus('error');
      return;
    }
    if (!selectedCrypto) {
      toast.error("Please select a cryptocurrency.");
      setTxStatus('error');
      return;
    }

    if (tokenAmountForOrder === 0n) {
      toast.error('Amount too low. Please enter a valid amount.');
      setRequestId(generateRequestId());
      setTxStatus('error');
      return;
    }

    // Ensure we're on a supported chain
    if (!isOnSupportedChain) {
      toast.error("Please switch to a supported chain (Base, Lisk, or Celo)");
      setTxStatus('error');
      return;
    }

    console.log("--- Starting Mini App TV Payment ---");
    console.log("RequestId:", requestId);
    console.log("Token:", selectedCrypto.symbol);
    console.log("Amount:", cryptoNeeded);
    console.log("Chain ID:", chainIdNumber);

    if (!selectedCrypto.address) {
      toast.error("Selected crypto has no contract address.");
      setTxStatus('error');
      return;
    }

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
        args: [getContractAddress(chainIdNumber), requiredApproval],
      });

      const approvalTx = await sendTransaction({
        to: selectedCrypto.address as Hex,
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

    // Regenerate requestId for next transaction
    setRequestId(generateRequestId());
  };

  const handleCloseModal = useCallback(() => {
    // Don't allow closing during critical phases
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

  const canPay =
    selectedTokenAddress &&
    provider &&
    plan &&
    smartCardNumber &&
    customerName &&
    verificationSuccess &&
    priceNGN &&
    amountNGN > 0 &&
    requestId;

  const isButtonDisabled = loading || loadingProviders || loadingPlans || verifyingCard || !canPay ||
                           ['waitingForApprovalSignature', 'approving', 'waitingForSignature', 'confirming', 'backendProcessing'].includes(txStatus) ||
                           walletLoading;

  // Don't render until mounted
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

  if (loading) return (
    <div className="container py-10 max-w-xl mx-auto">
      <div className="flex items-center justify-center p-10">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        <span>Loading active tokens...</span>
      </div>
    </div>
  );

  return (
    <div className="w-96 h-[1026px] relative bg-white rounded-[60px] overflow-hidden">
      <div className="absolute left-4 right-4 top-4 z-20 flex items-center gap-2 px-4 py-2 bg-white/90 rounded-xl shadow-sm">
        <BackToDashboard />
        <div className="text-black text-2xl font-semibold font-['Montserrat_Alternates'] tracking-[3.60px]">
          Crypto to TV Subscription
        </div>
      </div>

   {/* inner panel */}
      <div className="absolute left-[25px] top-[140px] w-80 h-[849px] bg-white/90 rounded-[45px] border-2 border-lime-400 p-6 overflow-auto">
        <div className="flex flex-col gap-4 h-full">
                                    {/* Pay With */}
                              <div className="text-black text-xl font-medium font-['Montserrat_Alternates'] tracking-[3px]">
                                      Pay With
                              <div className="w-full bg-white rounded-[20px] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.25)] border border-black p-2">
                                  <Select value={selectedTokenAddress} onValueChange={setSelectedTokenAddress}>
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

            {/* TV provider selection */}
            <div className="space-y-2">
              <Label htmlFor="provider-select">TV Provider</Label>
              <Select value={provider} onValueChange={setProvider} disabled={loadingProviders}>
                <SelectTrigger id="provider-select" className="rounded-[20px] border border-black/20 h-12 px-3">
                  <SelectValue placeholder={loadingProviders ? "Loading..." : "Select provider"} />
                </SelectTrigger>
                <SelectContent>
                  {providers.map(p => (
                    <SelectItem key={p.serviceID} value={p.serviceID}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Smart card input and verification status */}
            <div className="space-y-2">
              <Label htmlFor="smart-card-input">Smart Card / IUC Number</Label>
              <Input
                id="smart-card-input"
                placeholder={provider ? `Enter ${getSmartCardLength(provider).join(" or ")}-digit card number` : "Select a TV Provider first"}
                value={smartCardNumber}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "")
                  setSmartCardNumber(v)
                  setVerificationError("")
                  setVerificationSuccess(false)
                  setCustomerName("")
                  setCurrentBouquet("")
                  setDueDate("")
                  setRenewalAmount("")
                }}
                maxLength={12}
                disabled={!provider}
                className="rounded-[20px] border border-black/20 shadow-[0_2px_4px_rgba(0,0,0,0.25)] h-12 px-3"
              />
              {verifyingCard && (
                <div className="flex items-center space-x-2 text-sm text-blue-600 mt-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying card…</span>
                </div>
              )}
              {verificationSuccess && (
                <div className="flex items-center space-x-2 text-sm text-green-600 mt-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Card verified</span>
                </div>
              )}
              {verificationError && (
                <div className="flex items-center space-x-2 text-sm text-red-600 mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{verificationError}</span>
                </div>
              )}
            </div>

            {/* Customer details and plans (unchanged structure) */}
            {verificationSuccess && (
              <>
              {customerName && (
                <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input value={customerName} readOnly className="bg-green-50 text-black rounded-[12px]" />
                </div>
              )}
              {currentBouquet && (
                <div className="space-y-2">
                <Label>Current Bouquet</Label>
                <Input value={currentBouquet} readOnly className="bg-green-50 text-black rounded-[12px]" />
                </div>
              )}
              {dueDate && (
                <div className="space-y-2">
                <Label>Due Date</Label>
                <Input value={dueDate} readOnly className="bg-green-50 text-black rounded-[12px]" />
                </div>
              )}
              {renewalAmount && (
                <div className="space-y-2">
                <Label>Renewal Amount</Label>
                <Input value={`₦${Number(renewalAmount).toLocaleString()}`} readOnly className="bg-green-50 text-black rounded-[12px]" />
                </div>
              )}
              </>
            )}

            {verificationSuccess && (
              <div className="space-y-2">
              <Label htmlFor="plan-select">Subscription Plan</Label>
              <Select value={plan} onValueChange={setPlan} disabled={!provider || loadingPlans}>
                <SelectTrigger id="plan-select" className="rounded-[20px] border border-black/20 h-12 px-3">
                <SelectValue placeholder={loadingPlans ? "Loading..." : "Select plan"} />
                </SelectTrigger>
                <SelectContent>
                {plans.map(p => (
                  <SelectItem key={p.variation_code} value={p.variation_code}>{p.name} - ₦{Number(p.variation_amount).toLocaleString()}</SelectItem>
                ))}
                </SelectContent>
              </Select>

              {/* Amount display: NGN and approximated crypto */}
              <div className="mt-2">
                <div className="text-sm text-black/70 font-['Montserrat_Alternates'] tracking-wide">
                {amountNGN > 0 ? (
                  <>
                  ₦{amountNGN.toLocaleString()} &nbsp; ~
                  {selectedCrypto
                    ? cryptoNeeded.toFixed(selectedCrypto.decimals)
                    : cryptoNeeded.toFixed(6)
                  } {selectedCrypto?.symbol ?? ''}
                  </>
                ) : null}
                </div>
              </div>
              </div>
            )}


            <div className="mt-auto">
              <Button
                onClick={handlePurchase}
                disabled={isButtonDisabled}
                className="w-full h-14 rounded-[20px] flex items-center px-4"
                style={{
                  borderRadius: "20px",
                  background: "linear-gradient(91deg, rgba(0,0,0,0.00) 0.52%, rgba(20,55,255,0.50) 90.44%), linear-gradient(85deg, rgba(212,255,22,0.50) 1.75%, rgba(0,0,0,0.50) 35.67%), #302F2F",
                  boxShadow: "0 2px 4px 0 rgba(0,0,0,0.25)",
                }}
              >
                {txStatus === 'waitingForApprovalSignature' ? "Awaiting Approval..." :
                 txStatus === 'approving' ? "Approving Token..." :
                 txStatus === 'approvalSuccess' ? "Starting Payment..." :
                 txStatus === 'waitingForSignature' ? "Awaiting Payment..." :
                 txStatus === 'confirming' ? "Confirming..." :
                 txStatus === 'success' ? "Payment Confirmed!" :
                 txStatus === 'backendProcessing' ? "Processing Order..." :
                 txStatus === 'backendSuccess' ? "TV Subscription Successful!" :
                 txStatus === 'backendError' ? "Payment Failed - Try Again" :
                 txStatus === 'error' ? "Transaction Failed - Try Again" :
                 !isConnected ? "Wallet Not Connected" :
                 canPay ? "Purchase TV Subscription" :
                 "Complete form and verify card"}
              </Button>
            </div>

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
      chainId={chainIdNumber}
      chainName={getChainName()}
      />      </div>
    </div>
    </div>
  )
}