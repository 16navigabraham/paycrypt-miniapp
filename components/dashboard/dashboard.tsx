"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { PortfolioOverview } from "./portfolio-overview"
import { QuickActions } from "./quick-actions"
import RecentTransactions from "./recent-transactions"
import { MarketData } from "./market-data"
import { Button } from "@/components/ui/button"
import { Menu, User, LogOut, Copy, CheckCircle } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { Badge } from "@/components/ui/badge"

interface UserData {
  fid: string;
  username: string;
  displayName: string;
  walletAddress: string;
  pfpUrl: string;
}

interface FarcasterWallet {
  address: string;
  chainId: string;
  connectedAt: string;
}

// AuthGuard Component
function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check wallet-based authentication
    const walletAddress = localStorage.getItem('paycrypt_wallet_address');
    
    if (!walletAddress) {
      // Not authenticated, redirect to home
      router.replace('/');
      return;
    }
    
    setIsAuthenticated(true);
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // AuthGuard will redirect
  }

  return <>{children}</>;
}

// Dashboard Component with Farcaster Integration
function Dashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [connectedWallet, setConnectedWallet] = useState<FarcasterWallet | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Load user data from localStorage
    const walletAddress = localStorage.getItem('paycrypt_wallet_address');
    const fid = localStorage.getItem('paycrypt_fid');
    const username = localStorage.getItem('paycrypt_username');
    const displayName = localStorage.getItem('paycrypt_display_name');
    const pfpUrl = localStorage.getItem('paycrypt_pfp');
    
    if (walletAddress) {
      setUserData({
        fid: fid || '',
        username: username || '',
        displayName: displayName || username || 'Base User',
        walletAddress,
        pfpUrl: pfpUrl || ''
      });
      
      // Create wallet object compatible with existing components
      setConnectedWallet({
        address: walletAddress,
        chainId: '8453', // Base chain ID
        connectedAt: new Date().toISOString()
      });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('paycrypt_wallet_address');
    localStorage.removeItem('paycrypt_fid');
    localStorage.removeItem('paycrypt_username');
    localStorage.removeItem('paycrypt_display_name');
    localStorage.removeItem('paycrypt_pfp');
    router.replace('/');
  };

  const copyAddress = async () => {
    if (userData?.walletAddress) {
      await navigator.clipboard.writeText(userData.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const authenticated = !!userData;
  const ready = true;

  return (
    <MainLayout>
      {/* Desktop overlay when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 hidden lg:block" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Your existing Sidebar component */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      <div className="space-y-6">
        {/* Enhanced Header Section with Farcaster User Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Toggle Button - Inline with header */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="bg-background border shadow-md hover:bg-accent"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                {userData && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0">
                    Farcaster Connected
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <p className="text-muted-foreground">
                  {authenticated && connectedWallet
                    ? (
                      <span className="flex items-center space-x-2">
                        <span>Base Wallet: {formatAddress(connectedWallet.address)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyAddress}
                          className="h-6 w-6 p-0"
                        >
                          {copied ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </span>
                    )
                    : "Connect your wallet to get started."}
                </p>
              </div>
            </div>
          </div>

          {/* Farcaster User Profile Section */}
          {userData && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                {userData.pfpUrl ? (
                  <img 
                    src={userData.pfpUrl} 
                    alt="Profile" 
                    className="h-10 w-10 rounded-full object-cover border-2 border-blue-200"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="text-sm">
                  <div className="font-medium">{userData.displayName}</div>
                  <div className="text-gray-500">@{userData.username} • FID: {userData.fid}</div>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>

        {/* Welcome Message for Farcaster User */}
        {userData && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-1">
              Welcome back, {userData.displayName}! 👋
            </h2>
            <p className="text-purple-700 dark:text-purple-200 text-sm">
              Your Base wallet is connected and ready for transactions. Start paying your bills with crypto!
            </p>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Portfolio Overview (Takes 3/4 width on lg screens) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Portfolio Overview Card */}
            <div className="bg-lightblue rounded-xl shadow-sm border border-lightblue-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-black-900">
                  Portfolio Overview
                </h2>
                <div className="text-sm text-gray-500">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
              <PortfolioOverview wallet={connectedWallet} />
            </div>

            {/* Recent Transactions Card */}
            <div className="bg-lightblue rounded-xl shadow-sm border border-lightblue-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-black-900">
                  Recent Transactions
                </h2>
              </div>
              <RecentTransactions wallet={connectedWallet} />
            </div>

            {/* Market Data Card */}
            <div className="bg-lightblue rounded-xl shadow-sm border border-lightblue-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-black-900">
                  Market Data
                </h2>
                <div className="text-sm text-gray-500">
                  Real-time data
                </div>
              </div>
              <MarketData />
            </div>
          </div>

          {/* Right Sidebar - Quick Actions */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Farcaster Account Info Card */}
              {userData && (
                <div className="bg-lightblue rounded-xl shadow-sm border border-lightblue-200 p-6">
                  <h2 className="text-xl font-semibold text-black-900 mb-4">
                    Farcaster Account
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Display Name</label>
                      <p className="font-medium">{userData.displayName}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Username</label>
                      <p className="font-medium">@{userData.username}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Farcaster ID</label>
                      <p className="font-mono text-sm">{userData.fid}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Connected Network</label>
                      <Badge variant="outline" className="text-xs">Base Mainnet</Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions Card */}
              <div className="bg-lightblue rounded-xl shadow-sm border border-lightblue-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-black-900">
                    Quick Actions
                  </h2>
                </div>
                <QuickActions wallet={connectedWallet} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

// Main Dashboard Page Component
export default function DashboardPage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}