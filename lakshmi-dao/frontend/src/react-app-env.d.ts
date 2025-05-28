/// <reference types="react-scripts" />

// Example: Adding environment variable typings
declare namespace NodeJS {
  interface ProcessEnv {
    REACT_APP_ALCHEMY_API_KEY?: string;
    REACT_APP_WALLETCONNECT_PROJECT_ID?: string;
    // Add other environment variables used by your React app here
  }
}
