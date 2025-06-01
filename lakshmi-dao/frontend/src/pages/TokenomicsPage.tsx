import React from 'react';
import { Link } from 'react-router-dom';

const TokenomicsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-bold text-green-600">LAK Tokenomics</h1>
        <p className="text-xl text-gray-600 mt-2">
          Understanding the engine of the Lakshmi DAO ecosystem.
        </p>
      </header>

      <section className="mb-12 bg-white p-8 rounded-lg shadow-xl">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6">The LAK Token</h2>
        <p className="text-lg text-gray-700 mb-4">
          The LAK token is the native ERC-20 (or equivalent standard on our chosen blockchain) governance and utility token that powers the Lakshmi DAO. It is designed to facilitate community-led decision-making, incentivize participation, and ensure the long-term sustainability of the DAO's charitable mission.
        </p>
        <p className="text-lg text-gray-700">
          Holding LAK tokens grants individuals a stake in the DAO's future and a voice in its operations. Our tokenomics are structured to promote decentralization, active involvement, and a shared sense of ownership over the platform and its impact.
        </p>
      </section>

      <section className="mb-12 bg-green-50 p-8 rounded-lg shadow-xl">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6">Core Utilities</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-2xl font-semibold text-green-700 mb-3">1. Governance</h3>
            <p className="text-lg text-gray-700 mb-2">
              The primary utility of LAK tokens is governance. Token holders can:
            </p>
            <ul className="list-disc list-inside text-lg text-gray-700 space-y-1 pl-4">
              <li>Propose charitable projects for funding.</li>
              <li>Vote on submitted proposals (1 token = 1 vote).</li>
              <li>Participate in decisions regarding platform upgrades and parameter changes.</li>
              <li>Elect members to DAO committees (if applicable in future governance models).</li>
            </ul>
            <p className="text-lg text-gray-700 mt-3">
              This democratic process ensures that the DAO's resources are allocated in a way that reflects the collective will of the community.
            </p>
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-green-700 mb-3">2. Staking & Incentives (Future)</h3>
            <p className="text-lg text-gray-700 mb-2">
              To encourage long-term holding and active participation, we plan to implement staking mechanisms:
            </p>
            <ul className="list-disc list-inside text-lg text-gray-700 space-y-1 pl-4">
              <li>Stake LAK tokens to earn rewards from a portion of DAO revenue or token emissions.</li>
              <li>Staked tokens may also grant enhanced voting power or access to exclusive platform features.</li>
              <li>Help secure the network and align incentives between token holders and the DAO's success.</li>
            </ul>
            <p className="text-lg text-gray-700 mt-3">
              Details of the staking program, including APY and lock-up periods, will be released closer to its implementation.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-12 bg-white p-8 rounded-lg shadow-xl">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6">Token Distribution & Supply</h2>
        <p className="text-lg text-gray-700 mb-4">
          The total supply of LAK tokens will be capped to ensure scarcity and value retention. The distribution strategy is designed to foster a wide and engaged community from the outset.
        </p>
        {/* Placeholder for a visual chart or detailed table in the future */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-lg text-gray-700">
            <thead className="border-b bg-gray-100">
              <tr>
                <th className="px-6 py-3 font-semibold">Allocation Category</th>
                <th className="px-6 py-3 font-semibold">Percentage</th>
                <th className="px-6 py-3 font-semibold">Purpose & Vesting (if any)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-6 py-4">Community Treasury (Charitable Pool)</td>
                <td className="px-6 py-4">40% - 50%</td>
                <td className="px-6 py-4">Directly funds approved charitable projects. Released based on DAO votes.</td>
              </tr>
              <tr className="border-b bg-green-50">
                <td className="px-6 py-4">Public Sale / IDO</td>
                <td className="px-6 py-4">15% - 20%</td>
                <td className="px-6 py-4">To raise initial funding and distribute tokens widely. Details TBA.</td>
              </tr>
              <tr className="border-b">
                <td className="px-6 py-4">Ecosystem & Partnership Fund</td>
                <td className="px-6 py-4">10% - 15%</td>
                <td className="px-6 py-4">For strategic partnerships, grants for tool development, and marketing.</td>
              </tr>
              <tr className="border-b bg-green-50">
                <td className="px-6 py-4">Team & Advisors</td>
                <td className="px-6 py-4">10% - 15%</td>
                <td className="px-6 py-4">Subject to vesting schedules (e.g., 2-3 year linear vesting with a cliff).</td>
              </tr>
              <tr className="border-b">
                <td className="px-6 py-4">Liquidity Provision</td>
                <td className="px-6 py-4">5% - 10%</td>
                <td className="px-6 py-4">To ensure healthy trading liquidity on decentralized exchanges.</td>
              </tr>
              <tr className="bg-green-50">
                <td className="px-6 py-4">Airdrops / Community Rewards</td>
                <td className="px-6 py-4">5% - 10%</td>
                <td className="px-6 py-4">To reward early adopters, active community members, and for promotional campaigns.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-600 mt-4">
          *Note: These percentages are indicative and subject to finalization. The detailed tokenomics, including total supply and vesting schedules, will be published in the official Lakshmi DAO whitepaper.
        </p>
      </section>

      <section className="text-center mt-12">
        <p className="text-xl text-gray-700 mb-6">
          The LAK token is integral to realizing our vision of a transparent and community-driven charitable organization.
        </p>
        <Link
          to="/donate" // Or perhaps a link to where to acquire LAK tokens in the future
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg text-lg shadow-md transition-transform transform hover:scale-105"
        >
          Support Our Mission
        </Link>
      </section>
    </div>
  );
};

export default TokenomicsPage;
