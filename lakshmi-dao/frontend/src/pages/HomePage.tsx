import React from 'react';
import { Link } from 'react-router-dom';
// import { useProposals } from '../hooks/useProposals'; // Example: if showing recent proposals
// import ProposalCard from '../components/proposal/ProposalCard'; // Example

const HomePage: React.FC = () => {
  // const { proposals, isLoading, error } = useProposals(3); // Fetch 3 most recent proposals

  return (
    <div className="text-center">
      <header className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white py-20 px-6 rounded-lg shadow-xl mb-12">
        <h1 className="text-5xl font-bold mb-4">Welcome to Lakshmi DAO</h1>
        <p className="text-xl mb-8">
          A transparent and community-governed platform for charitable donations.
        </p>
        <div className="space-x-4">
          <Link
            to="/donate"
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-3 px-8 rounded-lg text-lg shadow-md transition-transform transform hover:scale-105"
          >
            Make a Donation
          </Link>
          <Link
            to="/proposals"
            className="bg-white hover:bg-gray-100 text-indigo-700 font-semibold py-3 px-8 rounded-lg text-lg shadow-md transition-transform transform hover:scale-105"
          >
            View Proposals
          </Link>
        </div>
      </header>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 text-left">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-indigo-600 mb-2">1. Donate</h3>
            <p className="text-gray-700">
              Contribute ETH or ZRC20 tokens to the community vault. All donations are transparently recorded on the blockchain.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-indigo-600 mb-2">2. Propose & Vote</h3>
            <p className="text-gray-700">
              LAK token holders can create proposals for charitable projects and vote on how funds are allocated.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-indigo-600 mb-2">3. Fund Impact</h3>
            <p className="text-gray-700">
              Successfully voted proposals are executed, releasing funds from the vault to support chosen causes.
            </p>
          </div>
        </div>
      </section>

      {/* Example: Display a few recent proposals - uncomment and implement hook if needed
      <section>
        <h2 className="text-3xl font-semibold text-gray-800 mb-6">Recent Proposals</h2>
        {isLoading && <p>Loading proposals...</p>}
        {error && <p className="text-red-500">Error loading proposals: {error.message}</p>}
        {!isLoading && !error && proposals.length === 0 && <p>No active proposals at the moment.</p>}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {proposals.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
        {proposals.length > 0 && (
          <div className="mt-8">
            <Link to="/proposals" className="text-indigo-600 hover:text-indigo-800 font-semibold">
              View All Proposals &rarr;
            </Link>
          </div>
        )}
      </section>
      */}
    </div>
  );
};

export default HomePage;
