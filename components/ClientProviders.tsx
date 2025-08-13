// components/ClientProviders.tsx
"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { MiniKitProvider } from '@coinbase/onchainkit/minikit'
import { base } from 'wagmi/chains'
import { Toaster } from 'sonner'

export function ClientProviders({ children }: { children: React.ReactNode }) {
  // 🔧 Use API key if available, otherwise undefined for development
  const apiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY || undefined;
  
  return (
    <MiniKitProvider
      apiKey={apiKey} // 🔧 Will work with undefined for basic functionality
      chain={base}
      config={{
        appearance: {
          mode: 'auto',
          theme: 'base', 
          name: 'Paycrypt',
          logo: '/paycrypt.png',
        },
      }}
    >
      <ThemeProvider 
        attribute="class" 
        defaultTheme="system" 
        enableSystem 
        disableTransitionOnChange
      >
        {children}
        {/* Sonner Toaster for displaying notifications */}
        <Toaster richColors />
      </ThemeProvider>
    </MiniKitProvider>
  )
}