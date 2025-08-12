"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { LandingPage } from "@/components/landing/landing-page";

export default function HomePage() {
  const { setFrameReady, isFrameReady } = useMiniKit();
  const router = useRouter();
  const [isFarcasterAuthenticated, setIsFarcasterAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize MiniKit frame
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Check for Farcaster authentication
  useEffect(() => {
    const checkFarcasterAuth = async () => {
      try {
        // Check if we're in a Farcaster frame context
        if (typeof window !== 'undefined' && window.parent !== window) {
          // We're in an iframe/frame context
          const urlParams = new URLSearchParams(window.location.search);
          const fid = urlParams.get('fid');
          const username = urlParams.get('username');
          
          if (fid && username) {
            // User is authenticated via Farcaster
            setIsFarcasterAuthenticated(true);
            // Store auth data in sessionStorage for the session
            sessionStorage.setItem('farcaster_fid', fid);
            sessionStorage.setItem('farcaster_username', username);
            
            // Redirect to dashboard if authenticated
            router.replace("/dashboard");
            return;
          }
        }
        
        // Check if user was previously authenticated
        const storedFid = sessionStorage.getItem('farcaster_fid');
        if (storedFid) {
          setIsFarcasterAuthenticated(true);
          router.replace("/dashboard");
          return;
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking Farcaster authentication:', error);
        setIsLoading(false);
      }
    };

    if (isFrameReady) {
      checkFarcasterAuth();
    }
  }, [isFrameReady, router]);

  const handleFarcasterAuth = () => {
    // For Farcaster mini apps, authentication is typically handled
    // by the frame context or redirect to Farcaster auth
    try {
      // If we're in a frame, post message to parent
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'FARCASTER_AUTH_REQUEST',
          source: 'paycrypt-miniapp'
        }, '*');
      } else {
        // Fallback: redirect to Farcaster auth or show instructions
        window.open('https://warpcast.com/', '_blank');
      }
    } catch (error) {
      console.error('Error initiating Farcaster auth:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Paycrypt...</p>
        </div>
      </div>
    );
  }

  return <LandingPage onGetStarted={handleFarcasterAuth} />;
}