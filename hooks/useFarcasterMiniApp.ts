// hooks/useFarcasterMiniApp.ts
import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export function useFarcasterMiniApp() {
  const [isAdded, setIsAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMiniApp = async () => {
    if (isAdded || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await sdk.actions.addMiniApp();
      setIsAdded(true);
      console.log('✅ Mini app added to Farcaster successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add mini app';
      setError(errorMessage);
      console.error('❌ Failed to add mini app:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    addMiniApp,
    isAdded,
    isLoading,
    error
  };
}