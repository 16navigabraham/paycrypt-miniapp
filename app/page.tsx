'use client';

import { useEffect, useState } from 'react';
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// 🔧 Universal MiniApp component that works with both Farcaster and Base
function UniversalMiniAppPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [readyCalled, setReadyCalled] = useState(false);
  const [miniAppType, setMiniAppType] = useState<'farcaster' | 'base' | 'web' | 'unknown'>('unknown');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebug = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev.slice(-4), message]); // Keep last 5 messages
  };

  // 🔧 Detect MiniApp environment and type
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
      
      // Detect Farcaster
      if (userAgent.includes('Farcaster') || 
          referrer.includes('farcaster') || 
          url.includes('farcaster') ||
          referrer.includes('warpcast')) {
        setMiniAppType('farcaster');
        addDebug('🟪 Detected: FARCASTER MiniApp');
        return 'farcaster';
      }
      
      // Detect Base/Coinbase
      if (userAgent.includes('Base') || 
          userAgent.includes('Coinbase') ||
          referrer.includes('base.org') || 
          referrer.includes('coinbase') ||
          url.includes('base.org') ||
          url.includes('coinbase') ||
          url.includes('platform=base')) { // Added URL parameter detection
        setMiniAppType('base');
        addDebug('🔵 Detected: BASE MiniApp');
        return 'base';
      }
      
      // Generic iframe detection
      if (hasParent) {
        setMiniAppType('base'); // Default to base for unknown iframes
        addDebug('🔲 Detected: Generic iframe (defaulting to Base)');
        return 'base';
      }
      
      // Regular web app
      setMiniAppType('web');
      addDebug('🌐 Detected: Regular web app');
      return 'web';
    };

    detectEnvironment();
  }, []);

  // 🔧 Handle ready calls based on detected type
  useEffect(() => {
    if (!mounted || readyCalled || miniAppType === 'unknown') return;

    const callReady = async () => {
      if (miniAppType === 'web') {
        addDebug('🌐 Web app - proceeding directly');
        setReadyCalled(true);
        setTimeout(() => router.replace("/dashboard"), 1000);
        return;
      }

      addDebug(`📱 ${miniAppType.toUpperCase()} MiniApp - calling ready NOW...`);

      try {
        let success = false;

        if (miniAppType === 'farcaster') {
          // FARCASTER-SPECIFIC ready calls
          success = await callFarcasterReady();
        } else if (miniAppType === 'base') {
          // BASE-SPECIFIC ready calls
          success = await callBaseReady();
        }

        if (success) {
          addDebug('✅ Ready calls executed successfully!');
        } else {
          addDebug('⚠️ Ready calls executed but with warnings');
        }

        setReadyCalled(true);

        // Proceed to dashboard after ready
        setTimeout(() => {
          addDebug('🚀 Proceeding to dashboard...');
          router.replace("/dashboard");
        }, 1500);

      } catch (error) {
        addDebug(`❌ Ready call error: ${error}`);
        setReadyCalled(true);
        // Still proceed even if ready fails
        setTimeout(() => router.replace("/dashboard"), 2000);
      }
    };

    // Call ready immediately, no delays
    addDebug('⏰ Starting ready call process...');
    callReady();

  }, [mounted, miniAppType, readyCalled, router]);

  // 🔧 Farcaster-specific ready calls
  const callFarcasterReady = async (): Promise<boolean> => {
    let success = false;
    addDebug('🟪 EXECUTING Farcaster ready calls...');

    // Method 1: Try to load and use Farcaster SDK
    try {
      addDebug('🟪 Loading Farcaster SDK...');
      const { sdk } = await import('@farcaster/miniapp-sdk');
      addDebug('🟪 Farcaster SDK loaded, calling ready()...');
      await sdk.actions.ready();
      addDebug('✅ Farcaster SDK ready() EXECUTED successfully');
      success = true;
    } catch (error) {
      addDebug(`⚠️ Farcaster SDK failed: ${error}`);
    }

    // Method 2: Try global Farcaster SDK
    try {
      if ((window as any).farcasterMiniAppSDK?.actions?.ready) {
        addDebug('🟪 Found global Farcaster SDK, calling ready()...');
        await (window as any).farcasterMiniAppSDK.actions.ready();
        addDebug('✅ Global Farcaster SDK ready() EXECUTED');
        success = true;
      }
    } catch (error) {
      addDebug(`⚠️ Global Farcaster SDK failed: ${error}`);
    }

    // Method 3: Farcaster-specific postMessages - ALWAYS EXECUTE
    if (window.parent && window.parent !== window) {
      addDebug('🟪 SENDING Farcaster postMessages...');
      const farcasterMessages = [
        { type: 'ready' },
        { type: 'frame_ready' },
        { type: 'sdk_ready' },
        { type: 'miniapp_ready' },
        { action: 'ready' },
        { event: 'ready' },
        { status: 'ready' }
      ];

      farcasterMessages.forEach((msg, index) => {
        try {
          window.parent.postMessage(msg, '*');
          addDebug(`📤 SENT Farcaster message ${index + 1}: ${msg.type || msg.action || msg.event}`);
          success = true;
        } catch (e) {
          addDebug(`⚠️ Farcaster postMessage ${index + 1} failed: ${e}`);
        }
      });
    } else {
      addDebug('⚠️ No parent window for Farcaster postMessages');
    }

    addDebug(`🟪 Farcaster ready calls completed. Success: ${success}`);
    return success;
  };

  // 🔧 Base-specific ready calls
  const callBaseReady = async (): Promise<boolean> => {
    let success = false;
    addDebug('🔵 EXECUTING Base ready calls...');

    // Method 1: Try MiniKit from OnchainKit
    try {
      addDebug('🔵 Loading OnchainKit MiniKit...');
      const miniKitModule = await import('@coinbase/onchainkit/minikit');
      addDebug('📦 OnchainKit MiniKit loaded');
      
      // Check for global MiniKit objects
      if ((window as any).miniKit?.setFrameReady) {
        addDebug('🔵 Found MiniKit, calling setFrameReady()...');
        (window as any).miniKit.setFrameReady();
        addDebug('✅ MiniKit setFrameReady() EXECUTED');
        success = true;
      }
    } catch (error) {
      addDebug(`⚠️ OnchainKit MiniKit failed: ${error}`);
    }

    // Method 2: Base-specific postMessages - ALWAYS EXECUTE
    if (window.parent && window.parent !== window) {
      addDebug('🔵 SENDING Base postMessages...');
      const baseMessages = [
        { type: 'ready' },
        { type: 'base_ready' },
        { type: 'miniapp_ready' },
        { type: 'wallet_ready' },
        { type: 'app_ready', platform: 'base' },
        { type: 'frame_ready' },
        { action: 'ready' },
        { event: 'ready' },
        { status: 'ready' }
      ];

      baseMessages.forEach((msg, index) => {
        try {
          window.parent.postMessage(msg, '*');
          addDebug(`📤 SENT Base message ${index + 1}: ${msg.type || msg.action}`);
          success = true;
        } catch (e) {
          addDebug(`⚠️ Base postMessage ${index + 1} failed: ${e}`);
        }
      });
    } else {
      addDebug('⚠️ No parent window for Base postMessages');
    }

    // Method 3: Try global SDK objects - ALWAYS TRY
    addDebug('🔵 TRYING global SDK methods...');
    const globalMethods = [
      { name: 'window.sdk.actions.ready', fn: () => (window as any).sdk?.actions?.ready?.() },
      { name: 'window.baseSDK.actions.ready', fn: () => (window as any).baseSDK?.actions?.ready?.() },
      { name: 'window.coinbaseSDK.actions.ready', fn: () => (window as any).coinbaseSDK?.actions?.ready?.() },
      { name: 'window.miniAppSDK.actions.ready', fn: () => (window as any).miniAppSDK?.actions?.ready?.() },
      { name: 'window.miniKit.setFrameReady', fn: () => (window as any).miniKit?.setFrameReady?.() }
    ];

    globalMethods.forEach(({ name, fn }) => {
      try {
        const result = fn();
        if (result !== undefined) {
          addDebug(`✅ ${name} EXECUTED`);
          success = true;
        }
      } catch (e) {
        // Silent fail for globals
      }
    });

    addDebug(`🔵 Base ready calls completed. Success: ${success}`);
    return success;
  };

  // 🔧 Get appropriate emoji and message
  const getMiniAppInfo = () => {
    switch (miniAppType) {
      case 'farcaster':
        return { emoji: '🟪', name: 'Farcaster MiniApp', color: 'purple' };
      case 'base':
        return { emoji: '🔵', name: 'Base MiniApp', color: 'blue' };
      case 'web':
        return { emoji: '🌐', name: 'Web App', color: 'green' };
      default:
        return { emoji: '🔍', name: 'Detecting...', color: 'gray' };
    }
  };

  const { emoji, name, color } = getMiniAppInfo();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center max-w-md mx-auto px-4">
        <img src="/paycrypt.png" alt="Paycrypt" className="h-16 w-16 mx-auto mb-4 rounded-lg shadow-lg" />
        
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        
        <p className="text-gray-600 font-medium mb-2">
          Connecting to Paycrypt...
        </p>
        
        <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm mb-4 ${
          color === 'purple' ? 'bg-purple-100 text-purple-700' :
          color === 'blue' ? 'bg-blue-100 text-blue-700' :
          color === 'green' ? 'bg-green-100 text-green-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          <span>{emoji}</span>
          <span>{name}</span>
        </div>
        
        <p className="text-sm text-gray-500 mb-4">
          {!mounted ? 'Initializing...' : 
           miniAppType === 'unknown' ? 'Detecting environment...' :
           !readyCalled ? `Calling ${miniAppType} ready...` : 
           'Opening dashboard...'}
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
export default dynamic(() => Promise.resolve(UniversalMiniAppPage), {
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