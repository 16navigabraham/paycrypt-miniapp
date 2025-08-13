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
    // 🔧 Proper Farcaster frame metadata
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
        
        {/* 🔧 Universal MiniApp SDK Script */}
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: `
              // Universal MiniApp initialization for both Farcaster and Base
              (async function() {
                try {
                  console.log('🚀 Universal MiniApp SDK initialization...');
                  
                  // Detect environment
                  const userAgent = navigator.userAgent || '';
                  const referrer = document.referrer || '';
                  const hasParent = window.parent !== window;
                  
                  let miniAppType = 'web';
                  
                  if (userAgent.includes('Farcaster') || referrer.includes('farcaster') || referrer.includes('warpcast')) {
                    miniAppType = 'farcaster';
                    console.log('🟪 Detected Farcaster MiniApp environment');
                  } else if (userAgent.includes('Base') || userAgent.includes('Coinbase') || referrer.includes('base.org') || referrer.includes('coinbase')) {
                    miniAppType = 'base';
                    console.log('🔵 Detected Base MiniApp environment');
                  } else if (hasParent) {
                    miniAppType = 'base'; // Default unknown iframes to base
                    console.log('🔲 Unknown iframe detected, defaulting to Base');
                  }

                  if (miniAppType === 'web') {
                    console.log('🌐 Regular web app, no SDK needed');
                    return;
                  }

                  // Initialize based on detected type
                  if (miniAppType === 'farcaster') {
                    await initializeFarcasterSDK();
                  } else if (miniAppType === 'base') {
                    await initializeBaseSDK();
                  }

                } catch (error) {
                  console.error('❌ Universal SDK initialization failed:', error);
                  // Fallback ready calls
                  sendFallbackReady();
                }
              })();

              // Farcaster SDK initialization
              async function initializeFarcasterSDK() {
                try {
                  console.log('🟪 Loading Farcaster MiniApp SDK...');
                  
                  // Try to load from CDN
                  const module = await import('https://esm.sh/@farcaster/miniapp-sdk@0.2.0');
                  const sdk = module.sdk;
                  
                  if (sdk?.actions?.ready) {
                    await sdk.actions.ready();
                    console.log('✅ Farcaster SDK ready() called successfully');
                    window.farcasterMiniAppSDK = sdk; // Make available globally
                  }
                  
                } catch (error) {
                  console.warn('⚠️ Farcaster SDK load failed:', error);
                  sendFarcasterFallbackReady();
                }
              }

              // Base SDK initialization  
              async function initializeBaseSDK() {
                try {
                  console.log('🔵 Loading Base MiniApp SDK...');
                  
                  // Try multiple Base SDK options
                  const sdkOptions = [
                    '@coinbase/miniapp-sdk',
                    '@base/miniapp-sdk'
                  ];
                  
                  for (const sdkName of sdkOptions) {
                    try {
                      const module = await import(\`https://esm.sh/\${sdkName}@latest\`);
                      if (module.sdk?.actions?.ready) {
                        await module.sdk.actions.ready();
                        console.log(\`✅ \${sdkName} ready() called successfully\`);
                        window.baseMiniAppSDK = module.sdk;
                        return;
                      }
                    } catch (e) {
                      console.log(\`⚠️ \${sdkName} not available\`);
                    }
                  }
                  
                  throw new Error('No Base SDK available');
                  
                } catch (error) {
                  console.warn('⚠️ Base SDK load failed:', error);
                  sendBaseFallbackReady();
                }
              }

              // Fallback ready calls for Farcaster
              function sendFarcasterFallbackReady() {
                if (window.parent && window.parent !== window) {
                  const messages = [
                    { type: 'ready' },
                    { type: 'frame_ready' },
                    { type: 'sdk_ready' },
                    { type: 'miniapp_ready' },
                    { action: 'ready' },
                    { event: 'ready' }
                  ];
                  
                  messages.forEach(msg => {
                    try {
                      window.parent.postMessage(msg, '*');
                      console.log('📤 Farcaster fallback message sent:', msg.type || msg.action);
                    } catch (e) {
                      console.warn('⚠️ Farcaster fallback failed:', e);
                    }
                  });
                }
              }

              // Fallback ready calls for Base
              function sendBaseFallbackReady() {
                if (window.parent && window.parent !== window) {
                  const messages = [
                    { type: 'ready' },
                    { type: 'base_ready' },
                    { type: 'miniapp_ready' },
                    { type: 'wallet_ready' },
                    { type: 'app_ready', platform: 'base' },
                    { action: 'ready' },
                    { event: 'ready' }
                  ];
                  
                  messages.forEach(msg => {
                    try {
                      window.parent.postMessage(msg, '*');
                      console.log('📤 Base fallback message sent:', msg.type || msg.action);
                    } catch (e) {
                      console.warn('⚠️ Base fallback failed:', e);
                    }
                  });
                }
              }

              // Generic fallback
              function sendFallbackReady() {
                if (window.parent && window.parent !== window) {
                  try {
                    window.parent.postMessage({ type: 'ready' }, '*');
                    window.parent.postMessage({ action: 'ready' }, '*');
                    console.log('📤 Generic fallback ready messages sent');
                  } catch (e) {
                    console.warn('⚠️ Generic fallback failed:', e);
                  }
                }
              }
            `,
          }}
        />
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