'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 Error Boundary caught an error:', error, errorInfo);
    
    // Check if it's a wagmi provider error
    if (error.message.includes('WagmiProvider') || error.message.includes('useConfig')) {
      console.log('🔧 Detected WagmiProvider error - will retry component mount');
      
      // Auto-retry after a short delay for provider errors
      setTimeout(() => {
        this.setState({ hasError: false, error: undefined });
      }, 1000);
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback for mini app context
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="text-center max-w-md mx-auto px-4">
            <img src="/paycrypt.png" alt="Paycrypt" className="h-16 w-16 mx-auto mb-4 rounded-lg shadow-lg" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Initializing Paycrypt</h2>
            <p className="text-gray-600 mb-4">
              Setting up your secure connection...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">
              This may take a moment in mini app mode
            </p>
            <button 
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}