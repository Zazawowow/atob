// Global error handler for WebSocket and Nostr errors
export class NostrErrorHandler {
  private static instance: NostrErrorHandler;
  private errorCount = 0;
  private lastErrorTime = 0;
  private maxErrors = 5;
  private errorWindow = 60000; // 1 minute

  static getInstance(): NostrErrorHandler {
    if (!NostrErrorHandler.instance) {
      NostrErrorHandler.instance = new NostrErrorHandler();
    }
    return NostrErrorHandler.instance;
  }

  // Install global error handler
  static install(): void {
    if (typeof window === 'undefined') return;

    const handler = NostrErrorHandler.getInstance();

    // Handle unhandled rejections (WebSocket errors)
    window.addEventListener('unhandledrejection', (event) => {
      console.log('🔍 Unhandled rejection:', event.reason);
      if (handler.isWebSocketError(event.reason)) {
        console.warn('🔌 WebSocket error caught and handled:', event.reason);
        event.preventDefault(); // Prevent the error from crashing the app
        handler.handleError(event.reason);
        return;
      }
      
      // Also check if it's a simple "websocket error" string
      if (String(event.reason) === 'websocket error') {
        console.warn('🔌 Generic WebSocket error caught and handled');
        event.preventDefault();
        handler.handleError(event.reason);
        return;
      }
    });

    // Handle general errors
    window.addEventListener('error', (event) => {
      console.log('🔍 General error:', event.error);
      if (handler.isWebSocketError(event.error)) {
        console.warn('🔌 WebSocket error caught and handled:', event.error);
        event.preventDefault();
        handler.handleError(event.error);
        return;
      }
      
      // Also check if it's a simple "websocket error" string
      if (String(event.error) === 'websocket error') {
        console.warn('🔌 Generic WebSocket error caught and handled');
        event.preventDefault();
        handler.handleError(event.error);
        return;
      }
    });

    console.log('✅ NostrErrorHandler installed with comprehensive WebSocket error catching');
  }

  private isWebSocketError(error: any): boolean {
    if (!error) return false;
    
    const message = error.message || error.toString() || '';
    const errorString = String(error);
    
    // Check for exact match first (the error we're seeing)
    if (errorString === 'websocket error' || message === 'websocket error') {
      return true;
    }
    
    return (
      message.includes('websocket') ||
      message.includes('WebSocket') ||
      message.includes('Connection timeout') ||
      message.includes('Failed to connect') ||
      message.includes('relay') ||
      message.includes('network') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ENOTFOUND') ||
      errorString.includes('websocket') ||
      errorString.includes('WebSocket') ||
      error.name === 'WebSocketError' ||
      error.code === 'WEBSOCKET_ERROR' ||
      error.type === 'websocket'
    );
  }

  private handleError(error: any): void {
    const now = Date.now();
    
    // Reset error count if enough time has passed
    if (now - this.lastErrorTime > this.errorWindow) {
      this.errorCount = 0;
    }
    
    this.errorCount++;
    this.lastErrorTime = now;
    
    // If too many errors in short time, suggest refresh
    if (this.errorCount >= this.maxErrors) {
      console.warn('🚨 Multiple WebSocket errors detected. Consider refreshing the page.');
      // Could show a toast here if needed
    }
  }

  // Wrapper for async functions that might fail due to WebSocket issues
  static async withErrorHandling<T>(
    fn: () => Promise<T>,
    fallback: T,
    errorMessage?: string
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const handler = NostrErrorHandler.getInstance();
      if (handler.isWebSocketError(error)) {
        console.warn(errorMessage || 'WebSocket operation failed, using fallback:', error);
        return fallback;
      }
      throw error; // Re-throw non-WebSocket errors
    }
  }
}

// Auto-install when imported
if (typeof window !== 'undefined') {
  NostrErrorHandler.install();
}
