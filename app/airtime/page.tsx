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

import { useMiniAppWallet, sendTransaction, waitForTransaction } from '@/hooks/useMiniAppWallet';
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
  const backendRequestSentRef = useRef<Hex | null>(null);

  // Simple wallet hook
  const { address, isConnected, isLoading: walletLoading } = useMiniAppWallet();

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

  const handlePurchase = async () => {
    setShowTransactionModal(true);
    setTransactionError(null);
    setBackendMessage(null);
    setTxStatus('idle');
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

    console.log("--- Starting Mini App Transaction Flow ---");
    console.log("RequestId:", requestId);
    console.log("Token:", selectedTokenObj.symbol);
    console.log("Amount:", cryptoNeeded);

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
        to: selectedTokenObj.address,
        data: approvalData,
      });

      setTxStatus('approving');
      setTransactionHashForModal(approvalTx);
      toast.loading("Waiting for approval confirmation...", { id: 'approval-status' });

      // Wait for approval
      await waitForTransaction(approvalTx);
      
      setTxStatus('approvalSuccess');
      toast.success("Token approved! Proceeding with payment...", { id: 'approval-status' });

      // Step 2: Main Transaction
      setTimeout(async () => {
        try {
          setTxStatus('waitingForSignature');
          toast.info("Please confirm the payment transaction...");

          const orderData = encodeFunctionData({
            abi: CONTRACT_ABI,
            functionName: 'createOrder',
            args: [
              bytes32RequestId,
              selectedTokenObj.address as Hex,
              tokenAmountForOrder,
            ],
          });

          const orderTx = await sendTransaction({
            to: CONTRACT_ADDRESS,
            data: orderData,
          });

          setTxStatus('confirming');
          setTransactionHashForModal(orderTx);
          toast.loading("Confirming payment on blockchain...", { id: 'tx-status' });

          // Wait for confirmation
          await waitForTransaction(orderTx);

          setTxStatus('success');
          toast.success("Payment confirmed! Processing order...", { id: 'tx-status' });

          // Process with backend
          await handlePostTransaction(orderTx);

        } catch (error: any) {
          console.error("Main transaction error:", error);
          setTransactionError(error.message);
          setTxStatus('error');
          toast.error(`Payment failed: ${error.message}`, { id: 'tx-status' });
        }
      }, 2000);

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
    <div className="container py-10 max-w-xl mx-auto">
      <BackToDashboard />
      <h1 className="text-3xl font-bold mb-4">Buy Airtime</h1>
      <p className="text-muted-foreground mb-8">
        Purchase airtime using supported ERC20 cryptocurrencies on Base chain.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Crypto to Airtime Payment</CardTitle>
          <CardDescription>
            Preview and calculate your airtime purchase with crypto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          {address && (
            <div className="text-sm p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-green-700">
                  Wallet Connected: {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
            </div>
          )}

          {!address && (
            <div className="text-sm p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <span className="text-orange-700">
                  No wallet connected. Please ensure you're accessing this through the mini app.
                </span>
              </div>
            </div>
          )}

          {/* Token selection */}
          <div className="space-y-2">
            <Label htmlFor="token-select">Pay With</Label>
            <Select value={selectedToken} onValueChange={setSelectedToken}>
              <SelectTrigger id="token-select">
                <SelectValue placeholder="Select ERC20 token" />
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

          {/* Network provider */}
          <div className="space-y-2">
            <Label htmlFor="network-select">Network Provider</Label>
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger id="network-select">
                <SelectValue placeholder="Select network" />
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

          {/* Amount input */}
          <div className="space-y-2">
            <Label htmlFor="amount-input">Amount (NGN)</Label>
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
              min="100"
              max="50000"
              disabled={!selectedTokenObj}
            />
            {amountNGN > 0 && priceNGN && selectedTokenObj && (
              <div className="text-sm text-muted-foreground flex items-center justify-between">
                <span>
                  You will pay: ~{cryptoNeeded.toFixed(selectedTokenObj.decimals)} {selectedTokenObj.symbol}
                </span>
                <Badge variant="secondary">
                  1 {selectedTokenObj.symbol} = ₦{priceNGN?.toLocaleString()}
                </Badge>
              </div>
            )}
            {amountNGN > 0 && amountNGN < 100 && (
              <p className="text-sm text-red-500">Minimum amount is ₦100.</p>
            )}
            {amountNGN > 50000 && (
              <p className="text-sm text-red-500">Maximum amount is ₦50,000.</p>
            )}
          </div>

          {/* Phone number input */}
          <div className="space-y-2">
            <Label htmlFor="phone-input">Phone Number</Label>
            <Input
              id="phone-input"
              type="tel"
              placeholder="Enter phone number (11 digits)"
              value={phone}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, "")
                setPhone(v.slice(0, 11))
              }}
              maxLength={11}
            />
            {phone && phone.length < 10 && (
              <p className="text-sm text-red-500">Phone number must be at least 10 digits.</p>
            )}
          </div>

          {/* Token approval info */}
          {selectedTokenObj && (
            <div className="text-sm p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <span className="text-blue-700">
                  Token approval required for all ERC20 transactions
                </span>
              </div>
            </div>
          )}

          {/* Transaction summary */}
          <div className="border-t pt-4 space-y-2 text-sm">
            {requestId && (
              <div className="flex justify-between">
                <span>Request ID:</span>
                <span className="text-muted-foreground font-mono text-xs">{requestId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Amount (NGN):</span>
              <span>{amountNGN > 0 ? `₦${amountNGN.toLocaleString()}` : "--"}</span>
            </div>
            <div className="flex justify-between">
              <span>You will pay:</span>
              <span>
                {cryptoNeeded > 0 && selectedTokenObj ? (
                  <Badge variant="outline">
                    {cryptoNeeded.toFixed(selectedTokenObj.decimals)} {selectedTokenObj.symbol}
                  </Badge>
                ) : (
                  "--"
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Network:</span>
              <span>{NETWORKS.find(n => n.serviceID === network)?.name || "--"}</span>
            </div>
            {phone && (
              <div className="flex justify-between">
                <span>Phone:</span>
                <span className="font-mono">{phone}</span>
              </div>
            )}
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
            txStatus === 'backendSuccess' ? "Airtime Delivered!" :
            txStatus === 'backendError' ? "Order Failed - Try Again" :
            txStatus === 'error' ? "Transaction Failed - Try Again" :
            !isConnected ? "Wallet Not Connected" :
            canPay ? "Purchase Airtime" :
            "Fill all details"}
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
  )
}