// components/ClientProviders.tsx
"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { MiniKitProvider } from '@coinbase/onchainkit/minikit'
import { base } from 'wagmi/chains'
import { Toaster } from 'sonner'

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <MiniKitProvider
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