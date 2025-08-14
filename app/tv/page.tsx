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
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import { ERC20_ABI } from "@/config/erc20Abi";
import { parseUnits, toBytes, toHex, Hex, encodeFunctionData } from 'viem';
import { toast } from 'sonner';
import { TransactionStatusModal } from "@/components/TransactionStatusModal";

import { payTVSubscription, verifySmartCard } from "@/lib/api";
import { TokenConfig } from "@/lib/tokenlist";
import { fetchActiveTokensWithMetadata } from "@/lib/tokenUtils";

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

  // Derived values
  const selectedCrypto = activeTokens.find(c => c.address === selectedTokenAddress);
  const selectedPlan = plans.find(p => p.variation_code === plan);
  const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null;
  const amountNGN = selectedPlan ? Number(selectedPlan.variation_amount) : 0;
  const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0;

  const tokenAmountForOrder: bigint = selectedCrypto ? parseUnits(cryptoNeeded.toFixed(selectedCrypto.decimals), selectedCrypto.decimals) : BigInt(0);
  const bytes32RequestId: Hex = toHex(toBytes(requestId || ""), { size: 32 });

  /* initial load */
  useEffect(() => {
    if (!mounted) return;
    
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const tokens = await fetchActiveTokensWithMetadata();
        if (!isMounted) return;
        setActiveTokens(tokens.filter(token => token.tokenType !== 0)); // Filter out ETH
        const prices = await fetchPrices(tokens);
        if (!isMounted) return;
        setPrices(prices);
        const prov = await fetchTVProviders();
        if (!isMounted) return;
        setProviders(prov);
      } catch (error) {
        console.error("Error loading tokens, prices, or providers:", error);
        toast.error("Failed to load essential data. Please try again.");
      } finally {
        setLoading(false);
        setLoadingProviders(false);
      }
    })();
    return () => { isMounted = false; };
  }, [mounted]);

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
        userAddress: address!
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

    // Ensure we're on Base chain
    try {
      await ensureBaseChain();
    } catch (error: any) {
      toast.error(error.message);
      setTxStatus('error');
      return;
    }

    console.log("--- Starting Mini App TV Payment ---");
    console.log("RequestId:", requestId);
    console.log("Token:", selectedCrypto.symbol);
    console.log("Amount:", cryptoNeeded);
    console.log("Base Chain:", isOnBaseChain);

    if (!selectedCrypto.address) {
      toast.error("Selected crypto has no contract address.");
      setTxStatus('error');
      return;
    }

    try {
      // Step 1: Token Approval
      setTxStatus('waitingForApprovalSignature');
      toast.info("Please approve token spending...");

      const unlimitedApproval = parseUnits('115792089237316195423570985008687907853269984665640564039457584007913129639935', 0);
      
      const approvalData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, unlimitedApproval],
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
    <div className="container py-10 max-w-xl mx-auto">
      <BackToDashboard />
      <h1 className="text-3xl font-bold mb-4">Pay TV Subscription</h1>
      <p className="text-muted-foreground mb-8">
        Pay for your TV subscription using supported ERC20 cryptocurrencies on Base chain.
      </p>

      {/* Connection Status */}
      {address && (
        <div className="text-sm p-3 bg-green-50 border border-green-200 rounded-lg mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <Wifi className="w-4 h-4 text-green-500" />
            <span className="text-green-700">
              Wallet Connected: {address.slice(0, 6)}...{address.slice(-4)}
              {isOnBaseChain && <span className="ml-2 text-xs">(Base Chain ✓)</span>}
            </span>
          </div>
        </div>
      )}

      {!address && (
        <div className="text-sm p-3 bg-orange-50 border border-orange-200 rounded-lg mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-orange-700">
              No wallet connected. Please ensure you're accessing this through the mini app.
            </span>
          </div>
        </div>
      )}

      {/* Base Chain Warning */}
      {address && !isOnBaseChain && (
        <div className="text-sm p-3 bg-red-50 border border-red-200 rounded-lg mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-red-700">
              Please switch to Base network to continue. Transactions will auto-switch when needed.
            </span>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Crypto to TV Subscription</CardTitle>
          <CardDescription>
            Preview and calculate your TV subscription payment with crypto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* crypto selection */}
          <div className="space-y-2">
            <Label htmlFor="crypto-select">Pay With</Label>
            <Select value={selectedTokenAddress} onValueChange={setSelectedTokenAddress}>
              <SelectTrigger id="crypto-select">
                <SelectValue placeholder="Select ERC20 token" />
              </SelectTrigger>
              <SelectContent>
                {activeTokens.length === 0 ? (
                  <SelectItem value="" disabled>No ERC20 tokens available</SelectItem>
                ) : (
                  activeTokens.map(c => (
                    <SelectItem key={c.address} value={c.address}>
                      {c.symbol} - {c.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {activeTokens.length === 0 && !loading && (
              <p className="text-sm text-yellow-600">
                No active ERC20 tokens found from contract.
              </p>
            )}
          </div>

          {/* TV provider selection */}
          <div className="space-y-2">
            <Label htmlFor="provider-select">TV Provider</Label>
            <Select value={provider} onValueChange={setProvider} disabled={loadingProviders}>
              <SelectTrigger id="provider-select">
                <SelectValue placeholder={loadingProviders ? "Loading..." : "Select provider"} />
              </SelectTrigger>
              <SelectContent>
                {providers.map(p => (
                  <SelectItem key={p.serviceID} value={p.serviceID}>
                    {p.name}
                  </SelectItem>
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

          {/* Customer details - conditionally rendered after verification */}
          {verificationSuccess && (
            <>
              {customerName && (
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input value={customerName} readOnly className="bg-green-50 text-black" />
                </div>
              )}
              {currentBouquet && (
                <div className="space-y-2">
                  <Label>Current Bouquet</Label>
                  <Input value={currentBouquet} readOnly className="bg-green-50 text-black" />
                </div>
              )}
              {dueDate && (
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input value={dueDate} readOnly className="bg-green-50 text-black" />
                </div>
              )}
              {renewalAmount && (
                <div className="space-y-2">
                  <Label>Renewal Amount</Label>
                  <Input value={`₦${Number(renewalAmount).toLocaleString()}`} readOnly className="bg-green-50 text-black" />
                </div>
              )}
            </>
          )}

          {/* Subscription plan selection - only visible after successful verification */}
          {verificationSuccess && (
            <div className="space-y-2">
              <Label htmlFor="plan-select">Subscription Plan</Label>
              <Select value={plan} onValueChange={setPlan} disabled={!provider || loadingPlans}>
                <SelectTrigger id="plan-select">
                  <SelectValue placeholder={loadingPlans ? "Loading..." : "Select plan"} />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.variation_code} value={p.variation_code}>
                      {p.name} - ₦{Number(p.variation_amount).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Compulsory token approval info */}
          {selectedCrypto && (
            <div className="text-sm p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <span className="text-blue-700">
                  Token approval required for all ERC20 transactions
                </span>
              </div>
            </div>
          )}

          {/* Summary section */}
          <div className="border-t pt-4 space-y-2 text-sm">
            {requestId && (
              <div className="flex justify-between">
                <span>Request ID:</span>
                <span className="font-mono text-xs">{requestId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Conversion Rate:</span>
              <span>
                {selectedCrypto && priceNGN
                  ? `₦${priceNGN.toLocaleString()} / 1 ${selectedCrypto.symbol}`
                  : "--"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Subscription Amount:</span>
              <span>₦{amountNGN.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>You will pay:</span>
              <span>
                {selectedCrypto && selectedPlan && priceNGN ? (
                  <Badge variant="outline">
                    {cryptoNeeded.toFixed(selectedCrypto?.decimals || 6)} {selectedCrypto.symbol}
                  </Badge>
                ) : (
                  "--"
                )}
              </span>
            </div>
          </div>
          
          <Button
            className="w-full"
            onClick={handlePurchase}
            disabled={isButtonDisabled}
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
            canPay ? "Pay TV Subscription" :
            "Complete form and verify card"}
          </Button>

          {/* Active tokens info */}
          {activeTokens.length > 0 && (
            <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
              <p className="font-medium mb-1">Active ERC20 Tokens ({activeTokens.length}):</p>
              <p>{activeTokens.map(t => t.symbol).join(", ")}</p>
            </div>
          )}
        </CardContent>
      </Card>
      
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
  );
}