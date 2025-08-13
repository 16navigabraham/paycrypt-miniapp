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
        
        {/* 🔧 MiniApp SDK Script - Load from CDN */}
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: `
              // Load Farcaster MiniApp SDK from CDN and initialize
              (async function() {
                try {
                  // Check if we're in a MiniApp environment
                  const isMiniApp = window.parent !== window || 
                                   window.location.href.includes('farcaster') ||
                                   document.referrer.includes('farcaster');
                  
                  if (!isMiniApp) {
                    console.log('🌐 Regular web app mode');
                    return;
                  }

                  console.log('📱 MiniApp environment detected, loading SDK...');
                  
                  // Try to import Farcaster MiniApp SDK from CDN
                  let sdk;
                  try {
                    // Use the latest stable version to avoid deprecation warnings
                    const module = await import('https://esm.sh/@farcaster/miniapp-sdk@0.2.0');
                    sdk = module.sdk;
                    console.log('✅ Farcaster MiniApp SDK loaded from CDN');
                  } catch (error) {
                    console.warn('⚠️ CDN SDK load failed, using fallback:', error);
                  }

                  // Immediate ready call attempts
                  const readyAttempts = [
                    // Try SDK if loaded
                    async () => {
                      if (sdk?.actions?.ready) {
                        await sdk.actions.ready();
                        console.log('✅ SDK ready() called successfully');
                        return true;
                      }
                      return false;
                    },
                    // Fallback to postMessage
                    () => {
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
                            console.log('📤 Sent ready message:', msg.type || msg.action);
                          } catch (e) {
                            console.warn('⚠️ PostMessage failed:', e);
                          }
                        });
                        return true;
                      }
                      return false;
                    },
                    // Try global objects
                    () => {
                      const globalAttempts = [
                        () => window.sdk?.actions?.ready?.(),
                        () => window.farcasterSDK?.actions?.ready?.(),
                        () => window.miniAppSDK?.actions?.ready?.()
                      ];
                      
                      let success = false;
                      globalAttempts.forEach((attempt, i) => {
                        try {
                          attempt();
                          console.log(\`📤 Global ready attempt \${i + 1} executed\`);
                          success = true;
                        } catch (e) {
                          console.warn(\`⚠️ Global attempt \${i + 1} failed:\`, e);
                        }
                      });
                      return success;
                    }
                  ];

                  // Execute all attempts
                  let anySuccess = false;
                  for (const attempt of readyAttempts) {
                    try {
                      const result = await attempt();
                      if (result) anySuccess = true;
                    } catch (error) {
                      console.warn('⚠️ Ready attempt failed:', error);
                    }
                  }

                  if (anySuccess) {
                    console.log('✅ At least one ready call succeeded');
                  } else {
                    console.warn('⚠️ All ready attempts failed');
                  }

                  // Retry attempts after delays
                  [100, 300, 500, 1000, 2000].forEach(delay => {
                    setTimeout(async () => {
                      for (const attempt of readyAttempts) {
                        try {
                          await attempt();
                        } catch (error) {
                          // Silent retry
                        }
                      }
                    }, delay);
                  });

                  // Make SDK available globally for the React app
                  if (sdk) {
                    window.farcasterMiniAppSDK = sdk;
                  }
                  
                } catch (error) {
                  console.error('❌ MiniApp SDK initialization failed:', error);
                  
                  // Fallback ready calls even if SDK fails
                  if (window.parent && window.parent !== window) {
                    try {
                      window.parent.postMessage({ type: 'ready' }, '*');
                      window.parent.postMessage({ type: 'frame_ready' }, '*');
                      console.log('📤 Fallback ready messages sent');
                    } catch (e) {
                      console.warn('⚠️ Fallback messages failed:', e);
                    }
                  }
                }
              })();
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