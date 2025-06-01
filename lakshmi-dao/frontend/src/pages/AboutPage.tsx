import React from 'react';
import { Link } from 'react-router-dom';

const AboutPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-bold text-indigo-700">About Lakshmi DAO</h1>
        <p className="text-xl text-gray-600 mt-2">
          Empowering global charity through transparent, community-driven blockchain governance.
        </p>
      </header>

      <section className="mb-12 bg-white p-8 rounded-lg shadow-xl">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6">Our Vision</h2>
        <p className="text-lg text-gray-700 mb-4">
          Lakshmi DAO envisions a world where charitable giving is transparent, efficient, and accessible to everyone. We aim to bridge the gap between donors and impactful causes by leveraging the power of decentralized autonomous organizations (DAOs) and blockchain technology. We believe that by putting governance in the hands of a global community, we can ensure that resources are directed to where they are most needed, fostering a new era of trust and accountability in philanthropy.
        </p>
        <p className="text-lg text-gray-700">
          Our platform is built on the principles of direct democracy, where every LAK token holder has a voice in shaping the future of the DAO and the projects it supports. We are committed to continuous innovation and collaboration to maximize our positive impact on society.
        </p>
      </section>

      <section className="mb-12 bg-indigo-50 p-8 rounded-lg shadow-xl">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6">Our Mission & Social Purpose</h2>
        <p className="text-lg text-gray-700 mb-4">
          The core mission of Lakshmi DAO is to create a more equitable and effective means of philanthropy. We achieve this by:
        </p>
        <ul className="list-disc list-inside text-lg text-gray-700 space-y-3 mb-6 pl-4">
          <li><strong>Facilitating Transparent Donations:</strong> All contributions (ETH and ZRC20 tokens) are recorded on the blockchain, providing an immutable and publicly verifiable ledger.</li>
          <li><strong>Community-Led Governance:</strong> LAK token holders propose, discuss, and vote on charitable projects, ensuring that funding decisions are democratic and aligned with community values.</li>
          <li><strong>Reducing Overheads:</strong> By utilizing smart contracts, we aim to minimize administrative costs typically associated with traditional charities, allowing more funds to reach the intended beneficiaries.</li>
          <li><strong>Supporting Diverse Causes:</strong> We are dedicated to funding a wide array of charitable initiatives. While our initial focus areas include education, healthcare, environmental conservation, and poverty alleviation, the DAO can adapt and support other causes based on community consensus.</li>
          <li><strong>Fostering Trust:</strong> We provide clear mechanisms for tracking the allocation and disbursement of funds, building confidence among donors that their contributions are making a tangible difference.</li>
        </ul>
        <p className="text-lg text-gray-700">
          Lakshmi DAO is more than just a platform; it's a community of like-minded individuals passionate about making a positive impact. We invite everyone to join us in our mission to redefine charitable giving for the 21st century.
        </p>
      </section>

      <section className="mb-12 text-center">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6">Get Involved</h2>
        <p className="text-lg text-gray-700 mb-8">
          Whether you're a donor, a potential project proposer, or simply interested in our mission, there are many ways to contribute to Lakshmi DAO's success.
        </p>
        <div className="space-x-0 md:space-x-4 space-y-4 md:space-y-0">
          <Link
            to="/donate"
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-3 px-8 rounded-lg text-lg shadow-md transition-transform transform hover:scale-105"
          >
            Make a Donation
          </Link>
          <Link
            to="/proposals"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg text-lg shadow-md transition-transform transform hover:scale-105"
          >
            View Proposals
          </Link>
          <Link
            to="/#community" // Assuming a community section link on HomePage or a future CommunityPage
            className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-8 rounded-lg text-lg shadow-md transition-transform transform hover:scale-105"
          >
            Join Our Community
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
