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
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import { ERC20_ABI } from "@/config/erc20Abi";
import { parseUnits, toBytes, toHex, Hex, encodeFunctionData } from 'viem';
import { toast } from 'sonner';
import { TransactionStatusModal } from "@/components/TransactionStatusModal";

import { buyinternet } from "@/lib/api";
import { TokenConfig } from "@/lib/tokenlist";
import { fetchActiveTokensWithMetadata } from "@/lib/tokenUtils";

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

    // Load tokens and prices on initial mount
    useEffect(() => {
        if (!mounted) return;
        
        async function loadTokensAndPricesAndProviders() {
            setLoading(true);
            try {
                const tokens = await fetchActiveTokensWithMetadata();
                // Filter out ETH (tokenType 0) - only ERC20 tokens supported
                setActiveTokens(tokens.filter(token => token.tokenType !== 0));
                const prices = await fetchPrices(tokens);
                setPrices(prices);
                const serviceData = await fetchDataServices();
                setAvailableProviders(serviceData);

            } catch (error) {
                console.error("Error loading tokens, prices, or providers:", error);
                toast.error("Failed to load essential data. Please try again.");
            } finally {
                setLoading(false);
            }
        }
        loadTokensAndPricesAndProviders();
    }, [mounted]);

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
                userAddress: address!
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

        // Ensure we're on Base chain
        try {
            await ensureBaseChain();
        } catch (error: any) {
            toast.error(error.message);
            setTxStatus('error');
            return;
        }

        console.log("--- Starting Mini App Internet Purchase ---");
        console.log("RequestId:", requestId);
        console.log("Token:", selectedCrypto.symbol);
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
        <div className="container py-10 max-w-xl mx-auto">
            <BackToDashboard />
            {/* <h1 className="text-3xl font-bold mb-4">Buy Internet Data</h1>
            <p className="text-muted-foreground mb-8">
                Purchase internet data bundles using supported ERC20 cryptocurrencies on Base chain.
            </p> */}

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
                    <CardTitle>Crypto to Internet Data</CardTitle>
                    <CardDescription>
                        Preview and calculate your internet data purchase with crypto
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Pay With Token Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="crypto">Pay With</Label>
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
                        {activeTokens.length === 0 && !loading && (
                            <p className="text-sm text-yellow-600">
                                No active ERC20 tokens found from contract.
                            </p>
                        )}
                    </div>
                    
                    {/* Internet Provider Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="provider">Internet Provider</Label>
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
                    
                    {/* Data Plan Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="plan">Data Plan</Label>
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
                    
                    {/* Customer ID / Phone Number */}
                    <div className="space-y-2">
                        <Label htmlFor="customerID">Customer ID / Phone Number</Label>
                        <Input
                            id="customerID"
                            type="text"
                            placeholder="Enter customer ID or phone number"
                            value={customerID}
                            maxLength={11}
                            onChange={(e) => setCustomerID(e.target.value)}
                        />
                    </div>
                    
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

                    {requestId && (
                        <div className="border-t pt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Conversion Rate:</span>
                                <span>
                                    {selectedCrypto && priceNGN
                                        ? `₦${priceNGN.toLocaleString()} / 1 ${selectedCrypto.symbol}`
                                        : "--"}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Plan Amount:</span>
                                <span>
                                    {selectedPlan ? `₦${Number(selectedPlan.variation_amount).toLocaleString()}` : "--"}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>You will pay:</span>
                                <span>
                                    {cryptoNeeded > 0 && selectedCrypto ? (
                                        <Badge variant="outline">
                                            {cryptoNeeded.toFixed(selectedCrypto.decimals)}{" "} {selectedCrypto.symbol}
                                        </Badge>
                                    ) : (
                                        "--"
                                    )}
                                </span>
                            </div>
                        </div>
                    )}
                    
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
                        txStatus === 'backendSuccess' ? "Data Delivered!" :
                        txStatus === 'backendError' ? "Order Failed - Try Again" :
                        txStatus === 'error' ? "Transaction Failed - Try Again" :
                        !isConnected ? "Wallet Not Connected" :
                        isFormValid ? "Purchase Internet Data" :
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
    );
}