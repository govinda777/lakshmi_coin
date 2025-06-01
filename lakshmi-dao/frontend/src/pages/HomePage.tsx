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

      <section className="mb-12 text-left">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">About Lakshmi DAO</h2>
        <p className="text-lg text-gray-700 mb-4">
          Lakshmi DAO is a decentralized autonomous organization dedicated to empowering charitable giving through blockchain technology. We believe in transparency, community governance, and directing resources to impactful causes worldwide. Our platform enables individuals to donate cryptocurrency, participate in governance by proposing and voting on charitable projects, and track the flow of funds in real-time.
        </p>
        <p className="text-lg text-gray-700">
          Our mission is to create a more equitable and effective means of philanthropy, reducing overhead costs and increasing the trust between donors and beneficiaries. By leveraging smart contracts, Lakshmi DAO ensures that donations are managed securely and disbursed according to the collective decisions of our token holders.
        </p>
      </section>

      <section className="mb-12 text-left">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Our Social Purpose</h2>
        <p className="text-lg text-gray-700 mb-4">
          Lakshmi DAO is committed to supporting a wide range of charitable causes, with a primary focus on:
        </p>
        <ul className="list-disc list-inside text-lg text-gray-700 space-y-2">
          <li><strong>Education:</strong> Funding initiatives that provide access to quality education for underprivileged children and adults.</li>
          <li><strong>Healthcare:</strong> Supporting projects that improve healthcare access, fund medical research, and provide aid during health crises.</li>
          <li><strong>Environmental Conservation:</strong> Backing efforts to protect biodiversity, combat climate change, and promote sustainable living.</li>
          <li><strong>Poverty Alleviation:</strong> Assisting organizations that work to provide basic necessities, skill development, and economic opportunities for those in need.</li>
        </ul>
        <p className="text-lg text-gray-700 mt-4">
          The community of LAK token holders will ultimately decide which specific projects and areas receive funding, ensuring that our collective efforts align with our shared values.
        </p>
      </section>

      <section className="mb-12 text-left">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Tokenomics (LAK Token)</h2>
        <p className="text-lg text-gray-700 mb-4">
          The LAK token is the native governance and utility token of the Lakshmi DAO ecosystem.
        </p>
        <ul className="list-disc list-inside text-lg text-gray-700 space-y-2">
          <li><strong>Governance:</strong> LAK token holders can propose and vote on funding proposals, platform upgrades, and other key decisions affecting the DAO. One token equals one vote.</li>
          <li><strong>Staking & Rewards:</strong> Future plans include staking mechanisms where LAK holders can stake their tokens to earn rewards and further participate in the ecosystem's security and governance.</li>
          <li><strong>Distribution:</strong> A significant portion of LAK tokens will be allocated to the community treasury for funding charitable projects. Other allocations include airdrops to early supporters, liquidity provisions, and a development fund for ongoing platform maintenance and improvement. Detailed distribution percentages will be published in our whitepaper.</li>
          <li><strong>Supply:</strong> The total supply of LAK tokens will be fixed, ensuring scarcity and long-term value. (Details to be finalized).</li>
        </ul>
      </section>

      <section className="mb-12 text-left">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Roadmap</h2>
        <p className="text-lg text-gray-700 mb-4 text-center">
          Our journey is just beginning. Here are some of our upcoming milestones:
        </p>
        {/* Placeholder for Roadmap content - will be updated */}
        <ul className="list-disc list-inside text-lg text-gray-700 space-y-2 mx-auto max-w-md">
          <li>Q3 2024: Launch of V1 platform with donation and proposal submission features.</li>
          <li>Q4 2024: First round of community voting and project funding.</li>
          <li>Q1 2025: Implementation of LAK token staking.</li>
          <li>Q2 2025: Expansion of supported charitable sectors and partnerships.</li>
        </ul>
        <p className="text-lg text-gray-700 mt-4 text-center">
          More details will be shared in our official communications.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6">Resources & Community</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-indigo-600 mb-2">Documentation</h3>
            <p className="text-gray-700 mb-3">
              Dive deeper into how Lakshmi DAO works, our governance model, and technical details.
            </p>
            {/* Placeholder for link */}
            <a href="#" className="text-indigo-600 hover:text-indigo-800 font-semibold">Read Whitepaper &rarr;</a>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-indigo-600 mb-2">DApps & Tools</h3>
            <p className="text-gray-700 mb-3">
              Access our platform DApp to donate, vote, and participate in the DAO.
            </p>
            {/* Placeholder for link */}
            <a href="#" className="text-indigo-600 hover:text-indigo-800 font-semibold">Launch DApp &rarr;</a>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-indigo-600 mb-2">Join our Community</h3>
            <p className="text-gray-700 mb-3">
              Connect with us on social media and community forums to stay updated and get involved.
            </p>
            {/* Placeholder for links */}
            <a href="#" className="text-indigo-600 hover:text-indigo-800 font-semibold block mb-1">Discord &rarr;</a>
            <a href="#" className="text-indigo-600 hover:text-indigo-800 font-semibold block">Twitter &rarr;</a>
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
