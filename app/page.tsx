'use client';

import { useEffect, useState } from 'react';
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// 🔧 Simplified client component that focuses on MiniApp ready calls first
function HomePageClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [readyCalled, setReadyCalled] = useState(false);
  const [isMiniApp, setIsMiniApp] = useState(false);

  // 🔧 Mount and detect environment
  useEffect(() => {
    setMounted(true);
    
    // Detect mini app environment
    const hasParent = window.parent && window.parent !== window;
    const hasIndicators = window.location.href.includes('farcaster') || 
                         window.location.href.includes('base.org') ||
                         document.referrer.includes('farcaster') ||
                         document.referrer.includes('base.org');
    
    const miniAppDetected = hasParent || hasIndicators;
    setIsMiniApp(miniAppDetected);
    console.log('🔍 Environment:', miniAppDetected ? 'MiniApp' : 'Web App');
  }, []);

  // 🔧 Handle ready calls for MiniApp
  useEffect(() => {
    if (!mounted || readyCalled) return;

    const callReady = async () => {
      if (!isMiniApp) {
        // Regular web app - proceed directly
        console.log('🌐 Web app mode - redirecting to dashboard');
        setReadyCalled(true);
        setTimeout(() => router.replace("/dashboard"), 1000);
        return;
      }

      console.log('📱 MiniApp mode - calling ready...');

      try {
        // Try multiple ready call methods
        const readyMethods = [
          // Method 1: Try Farcaster SDK from global
          async () => {
            if ((window as any).farcasterMiniAppSDK?.actions?.ready) {
              await (window as any).farcasterMiniAppSDK.actions.ready();
              console.log('✅ Global Farcaster SDK ready() called');
              return true;
            }
            return false;
          },
          
          // Method 2: PostMessage ready calls
          () => {
            if (window.parent && window.parent !== window) {
              const messages = [
                { type: 'ready' },
                { type: 'frame_ready' },
                { type: 'sdk_ready' },
                { type: 'miniapp_ready' },
                { type: 'base_ready' },
                { action: 'ready' },
                { event: 'ready' },
                { status: 'ready' }
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

          // Method 3: Try other global SDK objects
          () => {
            const globals = [
              () => (window as any).sdk?.actions?.ready?.(),
              () => (window as any).farcasterSDK?.actions?.ready?.(),
              () => (window as any).miniAppSDK?.actions?.ready?.()
            ];

            let success = false;
            globals.forEach((fn, i) => {
              try {
                fn();
                console.log(`📤 Global ready method ${i + 1} executed`);
                success = true;
              } catch (e) {
                // Silent fail
              }
            });
            return success;
          }
        ];

        // Execute all methods
        let anySuccess = false;
        for (const method of readyMethods) {
          try {
            const result = await method();
            if (result) anySuccess = true;
          } catch (error) {
            console.warn('⚠️ Ready method failed:', error);
          }
        }

        console.log(anySuccess ? '✅ Ready calls completed' : '⚠️ Ready calls had issues');
        setReadyCalled(true);

        // Proceed to dashboard after ready calls
        setTimeout(() => {
          console.log('🚀 Proceeding to dashboard...');
          router.replace("/dashboard");
        }, 2000);

      } catch (error) {
        console.error('❌ Ready call error:', error);
        setReadyCalled(true);
        // Still proceed even if ready fails
        setTimeout(() => router.replace("/dashboard"), 3000);
      }
    };

    // Start ready calls
    const timer = setTimeout(callReady, 300);
    return () => clearTimeout(timer);

  }, [mounted, isMiniApp, readyCalled, router]);

  // 🔧 Show loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <img src="/paycrypt.png" alt="Paycrypt" className="h-16 w-16 mx-auto mb-4 rounded-lg shadow-lg" />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">
          {isMiniApp ? 'Connecting to Paycrypt MiniApp...' : 'Loading Paycrypt...'}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {!mounted ? 'Initializing...' : 
           !readyCalled ? (isMiniApp ? 'Calling MiniApp ready...' : 'Setting up...') : 
           'Opening dashboard...'}
        </p>
        {isMiniApp && (
          <div className="mt-4 text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block">
            🔗 MiniApp Mode
          </div>
        )}
      </div>
    </div>
  );
}

// 🔧 Export with dynamic loading
export default dynamic(() => Promise.resolve(HomePageClient), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <img src="/paycrypt.png" alt="Paycrypt" className="h-16 w-16 mx-auto mb-4 rounded-lg shadow-lg" />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Loading Paycrypt...</p>
      </div>
    </div>
  )
});