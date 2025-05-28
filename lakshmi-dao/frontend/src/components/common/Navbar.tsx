import React from 'react';
import { Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/" className="text-2xl font-bold text-white hover:text-gray-200">
              Lakshmi DAO
            </Link>
          </div>
          <div className="flex items-center">
            <Link to="/" className="text-gray-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
              Home
            </Link>
            <Link to="/donate" className="text-gray-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
              Donate
            </Link>
            <Link to="/proposals" className="text-gray-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
              Proposals
            </Link>
            <Link to="/proposals/new" className="text-gray-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
              Create Proposal
            </Link>
            {/* Optional: Admin link */}
            {/* <Link to="/admin" className="text-gray-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Admin</Link> */}
            <div className="ml-4">
              <ConnectButton
                accountStatus="address"
                chainStatus="icon"
                showBalance={false}
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
