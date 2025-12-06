// app/internet/page.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import BackToDashboard from '@/components/BackToDashboard'
import { Loader2, AlertCircle, Wifi } from "lucide-react"

import { useMiniAppWallet, useTransactionWait } from '@/hooks/useMiniAppWallet';
import { getContractAddress, CONTRACT_ABI } from "@/config/contract";
import { ERC20_ABI } from "@/config/erc20Abi";
import { parseUnits, toBytes, toHex, Hex, encodeFunctionData } from 'viem';
import { toast } from 'sonner';
import { TransactionStatusModal } from "@/components/TransactionStatusModal";

import { buyinternet } from "@/lib/api";
import { TokenConfig, getTokensForChain } from "@/lib/tokenlist";

async function fetchPrices(tokenList: TokenConfig[]): Promise<Record<string, any>> {
  const ids = tokenList.map((c: TokenConfig) => c.coingeckoId).join(",");
  if (!ids) return {};
  const res = await fetch(`https://paycrypt-margin-price.onrender.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,ngn`);
  return res.ok ? await res.json() : {};
}

interface InternetPlan {
    variation_code: string
    name: string
    variation_amount: string
    fixedPrice: string
}

function generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
}

async function fetchInternetPlans(serviceID: string) {
    console.log(`[fetchInternetPlans] Attempting to fetch plans for serviceID: ${serviceID}`);
    try {
        const response = await fetch(`/api/vtpass/service-variations?serviceID=${serviceID}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error(`HTTP error! status: ${response.status}`, errorData)
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log('[fetchInternetPlans] Fetched plans data:', data)
        return data.content?.variations || []
    } catch (error) {
        console.error('[fetchInternetPlans] Error fetching internet plans:', error)
        return []
    }
}

async function fetchDataServices() {
    try {
        const response = await fetch('/api/vtpass/services?identifier=data', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log('Available data services:', data)
        return data.content || []
    } catch (error) {
        console.error('Error fetching data services:', error)
        return []
    }
}

export default function InternetPage() {
    const [mounted, setMounted] = useState(false);
    const [activeTokens, setActiveTokens] = useState<TokenConfig[]>([]);
    const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>("");
    const [provider, setProvider] = useState("");
    const [plan, setPlan] = useState("");
    const [customerID, setCustomerID] = useState("");
    const [plans, setPlans] = useState<InternetPlan[]>([]);
    const [prices, setPrices] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [availableProviders, setAvailableProviders] = useState<any[]>([]);
    const [requestId, setRequestId] = useState<string | undefined>(undefined);
    const [lastLoadedChainId, setLastLoadedChainId] = useState<number | null>(null);

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
  };    // Transaction waiting hooks
    const approvalReceipt = useTransactionWait(approvalHash);
    const orderReceipt = useTransactionWait(orderHash);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Load tokens and prices on initial mount - reload when chain changes
    useEffect(() => {
        if (!mounted) return;
        
        // Skip loading if we just loaded tokens for this chain
        if (lastLoadedChainId === chainIdNumber) {
          console.log(`Tokens already loaded for chain ${chainIdNumber}, skipping reload`);
          return;
        }
        
        async function loadTokensAndPricesAndProviders() {
            setLoading(true);
            try {
                // Use static token list from tokenlist.ts for current chain
                const chainTokens = getTokensForChain(chainIdNumber);
                setActiveTokens(chainTokens);
                setLastLoadedChainId(chainIdNumber);
                const prices = await fetchPrices(chainTokens);
                setPrices(prices);
                const serviceData = await fetchDataServices();
                setAvailableProviders(serviceData);
                console.log(`Loaded ${chainTokens.length} tokens for chain ${chainIdNumber}`);

            } catch (error) {
                console.error("Error loading tokens, prices, or providers:", error);
                toast.error("Failed to load essential data. Please try again.");
            } finally {
                setLoading(false);
            }
        }
        loadTokensAndPricesAndProviders();
    }, [mounted, chainIdNumber, lastLoadedChainId]);

    // Effect to fetch plans when provider changes
    useEffect(() => {
        console.log(`[useEffect - provider] Provider changed to: ${provider}`);
        if (!provider) {
            setPlans([]);
            setPlan("");
            return;
        }
        setLoadingPlans(true)
        fetchInternetPlans(provider)
            .then(data => {
                console.log(`[useEffect - provider] Plans received:`, data);
                setPlans(data);
                // Optionally set a default plan if plans are loaded and none is selected
                if (data.length > 0 && !plan) {
                    setPlan(data[0].variation_code);
                }
            })
            .catch(error => {
                console.error(`[useEffect - provider] Error fetching plans for ${provider}:`, error);
                setPlans([]);
                toast.error(`Failed to load plans for ${provider}.`);
            })
            .finally(() => setLoadingPlans(false));
    }, [provider, plan]);

    // Generate requestId when form has data
    useEffect(() => {
        if ((selectedTokenAddress || provider || plan || customerID) && !requestId) {
            setRequestId(generateRequestId());
        } else if (!(selectedTokenAddress || provider || plan || customerID) && requestId) {
            setRequestId(undefined);
        }
    }, [selectedTokenAddress, provider, plan, customerID, requestId]);

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
    const selectedCrypto = activeTokens.find((c) => c.address === selectedTokenAddress);
    const selectedPlan = plans.find((p) => p.variation_code === plan);
    const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null;
    const amountNGN = selectedPlan ? Number(selectedPlan.variation_amount) : 0;
    const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0;

    let tokenAmountForOrder: bigint = BigInt(0);

    if (selectedCrypto && cryptoNeeded > 0) {
        tokenAmountForOrder = parseUnits(cryptoNeeded.toFixed(selectedCrypto.decimals), selectedCrypto.decimals);
    }
    const bytes32RequestId: Hex = toHex(toBytes(requestId || ""), { size: 32 });

    // Handle backend API call after successful transaction
    const handlePostTransaction = useCallback(async (transactionHash: Hex) => {
        if (backendRequestSentRef.current === transactionHash) {
            console.log(`Backend request already sent for hash: ${transactionHash}. Skipping duplicate.`);
            return;
        }

        backendRequestSentRef.current = transactionHash;
        setTxStatus('backendProcessing');
        setBackendMessage("Processing your order...");
        toast.loading("Processing order with our service provider...", { id: 'backend-status' });

        try {
            const response = await buyinternet({
                requestId: requestId!,
                phone: customerID,
                serviceID: provider,
                variation_code: plan,
                amount: amountNGN,
                cryptoUsed: parseFloat(cryptoNeeded.toFixed(selectedCrypto?.decimals || 6)),
                cryptoSymbol: selectedCrypto?.symbol!,
                transactionHash,
                userAddress: address!,
                chainId: chainIdNumber,
                chainName: getChainName()
            });

            console.log('Backend success response:', response);
            setTxStatus('backendSuccess');
            setBackendMessage("Internet data delivered successfully!");
            toast.success("Internet data delivered successfully!", { id: 'backend-status' });

            // Reset form for next transaction after a delay
            setTimeout(() => {
                setSelectedTokenAddress("");
                setProvider("");
                setPlan("");
                setCustomerID("");
                setRequestId(undefined);
                backendRequestSentRef.current = null;
                // Clear requestId slightly later to prevent immediate re-generation
                setTimeout(() => setRequestId(undefined), 100);
            }, 3000); // 3 second delay to allow user to see success

        } catch (error: unknown) {
            console.error("Backend API call failed:", error);
            setTxStatus('backendError');

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            let userFriendlyMessage = errorMessage;
            if (errorMessage.includes('HTML instead of JSON')) {
                userFriendlyMessage = 'Server error occurred. Please try again or contact support.';
            } else if (errorMessage.includes('Invalid JSON')) {
                userFriendlyMessage = 'Communication error with server. Please try again.';
            } else if (errorMessage.includes('Failed to fetch')) {
                userFriendlyMessage = 'Network error. Please check your connection and try again.';
            }

            const fullMessage = `${userFriendlyMessage}. Request ID: ${requestId}`;
            setBackendMessage(fullMessage);
            toast.error(fullMessage, { id: 'backend-status' });
        }
    }, [requestId, customerID, provider, plan, amountNGN, cryptoNeeded, selectedCrypto?.symbol, selectedCrypto?.decimals, address]);

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
        if (!selectedPlan) {
            toast.error("Please select a data plan.");
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

        console.log("--- Starting Mini App Internet Purchase ---");
        console.log("RequestId:", requestId);
        console.log("Token:", selectedCrypto.symbol);
        console.log("Amount:", cryptoNeeded);
        console.log("Chain ID:", chainIdNumber);

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

    const providersToShow = availableProviders.length > 0 ? availableProviders : [];

    const isFormValid = Boolean(selectedTokenAddress && provider && plan && customerID && requestId && cryptoNeeded > 0);
    
    const isButtonDisabled = loading || 
                             loadingPlans || 
                             ['waitingForApprovalSignature', 'approving', 'waitingForSignature', 'confirming', 'backendProcessing'].includes(txStatus) ||
                             !isFormValid ||
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
            <div className="absolute left-4 right-4 top-4 z-20 flex items-center gap-2 px-4 py-2 bg-white/90 rounded-xl shadow-sm">
                <BackToDashboard />
                <div className="text-black text-lg font-medium font-['Montserrat_Alternates'] tracking-[1.5px]">
                    Crypto to Data Payment
                </div>
            </div>

            {/* Only show Request ID as requested */}
             <div className="w-80 h-[643px] left-[25px] top-[140px] absolute bg-white/90 rounded-[45px] border-2 border-lime-400 p-6 overflow-hidden">
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

                    <div className="text-black text-xl font-medium font-['Montserrat_Alternates'] tracking-[3px]">Network Provider</div>
                    <div className="w-full bg-white rounded-[20px] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.25)] border border-black p-2">
                        <Select value={provider} onValueChange={setProvider}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                                {providersToShow.map((p) => (
                                    <SelectItem key={p.serviceID || p.id} value={p.serviceID}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="text-black text-xl font-medium font-['Montserrat_Alternates'] tracking-[3px]">Data Plan</div>
                    <div className="w-full bg-white rounded-[20px] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.25)] border border-black p-2">
                        <Select value={plan} onValueChange={setPlan} disabled={!provider || loadingPlans}>
                            <SelectTrigger>
                                <SelectValue placeholder={loadingPlans ? "Loading plans..." : "Select data plan"} />
                            </SelectTrigger>
                            <SelectContent>
                                {plans.length > 0 ? (
                                    plans.map((p) => (
                                        <SelectItem key={p.variation_code} value={p.variation_code}>
                                            {p.name} - ₦{Number(p.variation_amount).toLocaleString()}
                                        </SelectItem>
                                    ))
                                ) : (
                                    !loadingPlans && provider && (
                                        <SelectItem value="no-plans" disabled>
                                            No plans available for this provider
                                        </SelectItem>
                                    )
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="text-sm text-black/70 font-['Montserrat_Alternates'] tracking-wide">
                      {amountNGN > 0
                        ? `${amountNGN} ~${selectedCrypto ? cryptoNeeded.toFixed(selectedCrypto.decimals) : cryptoNeeded.toFixed(6)} ${selectedCrypto?.symbol ?? ''}`
                        : ''}
                    </div>

                    <div className="text-black text-xl font-medium font-['Montserrat_Alternates'] tracking-[3px]">Phone Number</div>
                    <div className="w-full bg-white rounded-[20px] border border-black/20 p-2">
                        <Input
                            id="customerID"
                            type="text"
                            placeholder="Enter customer ID or phone number"
                            value={customerID}
                            maxLength={11}
                            onChange={(e) => setCustomerID(e.target.value)}
                            className="w-full"
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
                            }}
                        >
                            <span className="text-white font-semibold">
                                {txStatus === 'waitingForApprovalSignature' ? "Awaiting Approval..." :
                                txStatus === 'approving' ? "Approving Token..." :
                                txStatus === 'approvalSuccess' ? "Starting Payment..." :
                                txStatus === 'waitingForSignature' ? "Awaiting Payment..." :
                                txStatus === 'confirming' ? "Confirming..." :
                                txStatus === 'success' ? "Payment Confirmed!" :
                                txStatus === 'backendProcessing' ? "Processing Order..." :
                                txStatus === 'backendSuccess' ? "Data Delivered!" :
                                txStatus === 'backendError' ? "Order Failed - Try Again" :
                                txStatus === 'error' ? "Transaction Failed - Try Again" :
                                !isConnected ? "Wallet Not Connected" :
                                isFormValid ? "Purchase Internet Data" :
                                "Fill all details"}
                            </span>
                        </Button>
                    </div>

                    {/* Only show Request ID as requested */}
                    <div className="text-xs text-muted-foreground">
                      Request ID: <span className="inline-block font-mono">{requestId ?? "—"}</span>
                    </div>
                  </div>
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
            />
        </div>
    );
}