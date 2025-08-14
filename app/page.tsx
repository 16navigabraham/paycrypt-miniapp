'use client';

import { useEffect, useState } from 'react';
import { useRouter } from "next/navigation";
import { useMiniKit } from '@coinbase/onchainkit/minikit';

export default function HomePage() {
  const router = useRouter();
  const { setFrameReady, isFrameReady } = useMiniKit();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize MiniKit when component mounts
  useEffect(() => {
    if (!mounted) return;

    // Set frame ready when the app is fully loaded
    if (!isFrameReady) {
      console.log('Setting frame ready...');
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady, mounted]);

  // Redirect to dashboard when ready
  useEffect(() => {
    if (mounted && isFrameReady) {
      console.log('Frame is ready, redirecting to dashboard...');
      router.replace('/dashboard');
    }
  }, [isFrameReady, router, mounted]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <img src="/paycrypt.png" alt="Paycrypt" className="h-20 w-20 mx-auto mb-6 rounded-2xl shadow-lg" />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <img src="/paycrypt.png" alt="Paycrypt" className="h-20 w-20 mx-auto mb-6 rounded-2xl shadow-lg" />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">
          {isFrameReady ? 'Redirecting to dashboard...' : 'Initializing Paycrypt...'}
        </p>
      </div>
    </div>
  );
}