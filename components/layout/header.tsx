"use client"

import { useState } from "react"
import { Bell, Menu, Search, User, Wallet, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { useMiniAppWallet } from "@/hooks/useMiniAppWallet"
import { getExplorerAddressUrl } from "@/lib/explorer"

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const [notifications] = useState(0)
  const router = useRouter()
  const { 
    address, 
    isConnected, 
    disconnectWallet, 
    miniAppContext, 
    connectorName,
    chainIdNumber 
  } = useMiniAppWallet()

  const handleSignOut = async () => {
    // Clear any local storage data
    localStorage.removeItem("userEmail")
    
    // Disconnect wallet if connected (using proper Wagmi disconnect)
    if (isConnected) {
      disconnectWallet()
    }
    
    // Redirect to app/page.tsx ("/" is the root)
    router.push("/")
  }

  const formatAddress = (address: string) => {
    if (!address) return 'No Wallet';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  const getConnectionStatusText = () => {
    if (!isConnected) return 'No wallet connected';
    
    if (miniAppContext.isMiniApp) {
      return `Connected via ${miniAppContext.client} (${connectorName})`;
    }
    
    return `Connected via ${connectorName}`;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex h-16 items-center px-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center space-x-2 lg:space-x-4">
          <div className="flex items-center space-x-2">
            <img src="/paycrypt.png" alt="Paycrypt Logo" className="h-8 w-8 rounded-lg object-contain bg-white" />
            <span className="font-bold text-lg hidden sm:block">Paycrypt</span>
          </div>
        </div>

        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search transactions, utilities..." className="pl-10" />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => router.push("/history")}
          >
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {notifications}
              </Badge>
            )}
          </Button>

          {/* Wallet Status Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Wallet className="h-5 w-5" />
                {isConnected && (
                  <Badge className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500 border border-background" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              {isConnected ? (
                <>
                  <div className="px-3 py-2 border-b">
                    <div className="text-sm font-medium">Wallet Connected</div>
                    <div className="text-xs text-muted-foreground font-mono break-all">
                      {formatAddress(address || '')}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        Base Network
                      </Badge>
                      {miniAppContext.isMiniApp && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {miniAppContext.client}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      via {connectorName}
                    </div>
                  </div>
                  <DropdownMenuItem onClick={() => navigator.clipboard.writeText(address || '')}>
                    Copy Address
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    const explorerUrl = getExplorerAddressUrl(chainIdNumber, address || '');
                    window.open(explorerUrl, '_blank');
                  }}>
                    View on Explorer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/wallet")}>
                    Wallet Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={disconnectWallet}
                    className="text-red-600 focus:text-red-600"
                  >
                    Disconnect Wallet
                  </DropdownMenuItem>
                </>
              ) : (
                <div className="px-3 py-2">
                  <div className="text-sm text-muted-foreground">No wallet connected</div>
                  {miniAppContext.isMiniApp ? (
                    <div className="text-xs text-muted-foreground mt-1">
                      Visit dashboard to connect
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 w-full"
                      onClick={() => router.push('/dashboard')}
                    >
                      Connect Wallet
                    </Button>
                  )}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {isConnected && (
                <>
                  <div className="px-3 py-2 border-b">
                    <div className="text-sm font-medium">Connection Status</div>
                    <div className="text-xs text-muted-foreground">
                      {getConnectionStatusText()}
                    </div>
                  </div>
                </>
              )}
              <DropdownMenuItem onClick={() => router.push("/wallet")}>
                Wallet
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/portfolio")}>
                Portfolio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/support")}>
                Support
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="text-red-600 focus:text-red-600"
              >
                Sign out {isConnected && '& Disconnect'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}