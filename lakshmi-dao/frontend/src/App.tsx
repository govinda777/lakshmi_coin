import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WagmiConfig, configureChains, createConfig, Chain } from 'wagmi'; // Import Chain type
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
import AboutPage from './pages/AboutPage';
import TokenomicsPage from './pages/TokenomicsPage';
import RoadmapPage from './pages/RoadmapPage';
import MissionsPage from './pages/MissionsPage';
import StakingPage from './pages/StakingPage';
import AirdropPage from './pages/AirdropPage';
import MembershipPage from './pages/MembershipPage'; // Import MembershipPage
import { AppProvider } from './contexts/AppContext';

// Configure chains & providers
// Replace with your Alchemy API key or use other providers
const alchemyApiKey = process.env.REACT_APP_ALCHEMY_API_KEY || ""; // Ensure you have this in .env

// Define ZetaChain Athens 3 Testnet configuration
const zetaChainAthens3Testnet: Chain = {
  id: 7001,
  name: 'ZetaChain Athens 3 Testnet',
  network: 'zetachain-athens-3',
  nativeCurrency: {
    name: 'ZETA',
    symbol: 'ZETA',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'] },
    public: { http: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://zetachain-athens-3.blockscout.com/' },
  },
  testnet: true,
};

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [sepolia, zetaChainAthens3Testnet], // Add ZetaChain to the list of supported chains
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
        <AppProvider>
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
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/tokenomics" element={<TokenomicsPage />} />
                  <Route path="/roadmap" element={<RoadmapPage />} />
                  <Route path="/missions" element={<MissionsPage />} />
                  <Route path="/staking" element={<StakingPage />} />
                  <Route path="/airdrop" element={<AirdropPage />} />
                  <Route path="/membership" element={<MembershipPage />} /> {/* Add Membership route */}
                  <Route path="/admin" element={<AdminPage />} /> {/* Optional */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </Router>
        </AppProvider>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default App;
