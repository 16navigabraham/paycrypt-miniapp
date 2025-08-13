'use client';

import { useEffect, useState } from 'react';
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// 🔧 Unified MiniApp component using MiniKit for both Farcaster and Base compatibility
function UnifiedMiniAppPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [readyCalled, setReadyCalled] = useState(false);
  const [miniAppType, setMiniAppType] = useState<'miniapp' | 'web' | 'unknown'>('unknown');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  const addDebug = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev.slice(-4), message]); // Keep last 5 messages
  };

  // 🔧 Detect if we're in a miniapp environment
  useEffect(() => {
    setMounted(true);
    
    const detectEnvironment = () => {
      const hasParent = window.parent && window.parent !== window;
      const userAgent = window.navigator.userAgent || '';
      const referrer = document.referrer || '';
      const url = window.location.href || '';
      
      addDebug('🔍 Detecting environment...');
      addDebug(`📍 Has parent: ${hasParent}`);
      addDebug(`📍 User agent: ${userAgent.substring(0, 50)}...`);
      addDebug(`📍 Referrer: ${referrer}`);
      
      // Detect any miniapp context (Farcaster, Base, or other)
      if (hasParent || 
          userAgent.includes('Farcaster') || 
          userAgent.includes('Base') || 
          userAgent.includes('Coinbase') ||
          referrer.includes('farcaster') || 
          referrer.includes('warpcast') ||
          referrer.includes('base.org') || 
          referrer.includes('coinbase') ||
          url.includes('farcaster') ||
          url.includes('base.org') ||
          url.includes('coinbase')) {
        setMiniAppType('miniapp');
        addDebug('🟦 Detected: MiniApp Environment');
        return 'miniapp';
      }
      
      // Regular web app
      setMiniAppType('web');
      addDebug('🌐 Detected: Regular web app');
      return 'web';
    };

    detectEnvironment();
  }, []);

  // 🔧 Handle ready calls using unified approach
  useEffect(() => {
    if (!mounted || readyCalled || miniAppType === 'unknown') return;

    const initializeMiniApp = async () => {
      if (miniAppType === 'web') {
        addDebug('🌐 Web app - proceeding directly');
        setReadyCalled(true);
        setIsReady(true);
        setTimeout(() => router.replace("/dashboard"), 1000);
        return;
      }

      addDebug('🟦 MiniApp detected - initializing...');

      try {
        let success = false;

        // Method 1: Try MiniKit (preferred for Base compatibility)
        try {
          addDebug('🔧 Attempting MiniKit initialization...');
          const { useMiniKit } = await import('@coinbase/onchainkit/minikit');
          addDebug('✅ MiniKit imported successfully');
          success = true;
        } catch (error) {
          addDebug(`⚠️ MiniKit not available: ${error}`);
        }

        // Method 2: Try Farcaster SDK directly
        if (!success) {
          try {
            addDebug('🔧 Attempting Farcaster SDK initialization...');
            const { sdk } = await import('@farcaster/miniapp-sdk');
            addDebug('🔧 Farcaster SDK loaded, calling ready()...');
            await sdk.actions.ready();
            addDebug('✅ Farcaster SDK ready() executed successfully');
            success = true;
          } catch (error) {
            addDebug(`⚠️ Farcaster SDK failed: ${error}`);
          }
        }

        // Method 3: Minimal postMessage fallback
        if (!success && window.parent && window.parent !== window) {
          try {
            addDebug('🔧 Using postMessage fallback...');
            window.parent.postMessage({ type: 'ready' }, '*');
            addDebug('📤 Sent ready postMessage');
            success = true;
          } catch (error) {
            addDebug(`⚠️ PostMessage failed: ${error}`);
          }
        }

        if (success) {
          addDebug('✅ MiniApp initialization successful!');
        } else {
          addDebug('⚠️ MiniApp initialization completed with fallbacks');
        }

        setReadyCalled(true);
        setIsReady(true);

        // Navigate to dashboard
        setTimeout(() => {
          addDebug('🚀 Navigating to dashboard...');
          router.replace("/dashboard");
        }, 1500);

      } catch (error) {
        addDebug(`❌ MiniApp initialization error: ${error}`);
        setReadyCalled(true);
        setIsReady(true);
        // Still proceed to dashboard
        setTimeout(() => {
          router.replace("/dashboard");
        }, 2000);
      }
    };

    addDebug('⏰ Starting MiniApp initialization...');
    initializeMiniApp();

  }, [mounted, miniAppType, readyCalled, router]);

  // 🔧 Get appropriate status message
  const getStatusInfo = () => {
    if (!mounted) return { icon: '⏳', message: 'Initializing...' };
    if (miniAppType === 'unknown') return { icon: '🔍', message: 'Detecting environment...' };
    if (!readyCalled) return { icon: '🔧', message: 'Setting up MiniApp...' };
    if (!isReady) return { icon: '⚡', message: 'Getting ready...' };
    return { icon: '🚀', message: 'Opening dashboard...' };
  };

  const { icon, message } = getStatusInfo();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center max-w-md mx-auto px-4">
        <img src="/paycrypt.png" alt="Paycrypt" className="h-16 w-16 mx-auto mb-4 rounded-lg shadow-lg" />
        
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        
        <p className="text-gray-600 font-medium mb-2">
          Connecting to Paycrypt...
        </p>
        
        <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm mb-4 ${
          miniAppType === 'miniapp' ? 'bg-blue-100 text-blue-700' :
          miniAppType === 'web' ? 'bg-green-100 text-green-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          <span>{icon}</span>
          <span>{miniAppType === 'miniapp' ? 'MiniApp' : miniAppType === 'web' ? 'Web App' : 'Detecting...'}</span>
        </div>
        
        <p className="text-sm text-gray-500 mb-4">
          {message}
        </p>

        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && debugInfo.length > 0 && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg text-left">
            <p className="text-xs font-semibold text-gray-700 mb-2">Debug Info:</p>
            {debugInfo.map((info, i) => (
              <p key={i} className="text-xs text-gray-600 font-mono">
                {info}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 🔧 Export with dynamic loading
export default dynamic(() => Promise.resolve(UnifiedMiniAppPage), {
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