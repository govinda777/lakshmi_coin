import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WagmiConfig, configureChains, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';
import { RainbowKitProvider, getDefaultWallets, connectorsForWallets } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import HomePage from './pages/HomePage';
import DonatePage from './pages/DonatePage';
import ProposalsPage from './pages/ProposalsPage';
import CreateProposalPage from './pages/CreateProposalPage';
import ProposalDetailPage from './pages/ProposalDetailPage';
import AdminPage from './pages/AdminPage'; // Optional: For DAO admin functions
import NotFoundPage from './pages/NotFoundPage';

// Configure chains & providers
// Replace with your Alchemy API key or use other providers
const alchemyApiKey = process.env.REACT_APP_ALCHEMY_API_KEY || ""; // Ensure you have this in .env

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [sepolia], // Add other chains like mainnet, polygon, etc., if needed
  [alchemyProvider({ apiKey: alchemyApiKey }), publicProvider()]
);

// Setup connectors
const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || ""; // Get from WalletConnect Cloud
if (!projectId) {
  console.warn("REACT_APP_WALLETCONNECT_PROJECT_ID is not set. WalletConnect features might be limited.");
}

const { wallets } = getDefaultWallets({
  appName: 'Lakshmi DAO',
  projectId: projectId, // Required for WalletConnect v2
  chains,
});

const appInfo = {
  appName: 'Lakshmi DAO',
};

const connectors = connectorsForWallets(wallets);

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

function App() {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains} appInfo={appInfo} modalSize="compact">
        <Router>
          <div className="flex flex-col min-h-screen bg-gray-50">
            <Navbar />
            <main className="flex-grow container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/donate" element={<DonatePage />} />
                <Route path="/proposals" element={<ProposalsPage />} />
                <Route path="/proposals/new" element={<CreateProposalPage />} />
                <Route path="/proposals/:proposalId" element={<ProposalDetailPage />} />
                <Route path="/admin" element={<AdminPage />} /> {/* Optional */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default App;
