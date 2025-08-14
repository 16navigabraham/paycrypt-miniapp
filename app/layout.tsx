import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ClientProviders } from "@/components/ClientProviders"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ["latin"] })

export async function generateMetadata(): Promise<Metadata> {
  const URL = process.env.NEXT_PUBLIC_URL || 'https://miniapp.paycrypt.org';
  const projectName = process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'Paycrypt';
  
  return {
    title: projectName,
    description: "Convert cryptocurrency to pay for airtime, TV subscriptions, electricity bills, and more. Built by Team Memevibe.",
    generator: 'TEAM MEMEVIBE',
    applicationName: projectName,
    openGraph: {
      title: `${projectName} - Crypto to Utilities`,
      description: 'Convert cryptocurrency to pay for airtime, TV subscriptions, electricity bills, and more',
      url: URL,
      siteName: projectName,
      locale: 'en_US',
      type: 'website',
      images: [
        {
          url: `${URL}/Og-image.png`,
          width: 1200,
          height: 630,
          alt: projectName,
          type: 'image/png',
        },
      ],
    },
    // Proper Farcaster frame metadata
    other: {
      'fc:frame': JSON.stringify({
        version: 'next',
        imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE || `${URL}/Og-image.png`,
        button: {
          title: `Launch ${projectName}`,
          action: {
            type: 'launch_frame',
            name: projectName,
            url: URL,
            splashImageUrl: process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE || `${URL}/paycrypt.png`,
            splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR || '#3B82F6',
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <meta name="google-site-verification" content="pCijtRPRcIw7lEvQNXnUtUE4WReAEAgiFl2FURDGrz0" />
        <link rel="icon" href="/paycrypt.png" type="image/png" sizes="32x32" />
        <link rel="shortcut icon" href="/paycrypt.png" type="image/png" />
      </head>
      <body>
        <ErrorBoundary>
          <ClientProviders>
            {children}
          </ClientProviders>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  )
}