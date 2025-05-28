import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white py-8 mt-auto">
      <div className="container mx-auto px-6 text-center">
        <p>&copy; {new Date().getFullYear()} Lakshmi DAO. All rights reserved.</p>
        <p className="text-sm text-gray-400 mt-2">
          A decentralized platform for transparent charitable giving.
        </p>
        {/* Optional: Add links to social media, GitHub, etc. */}
        {/* <div className="mt-4">
          <a href="#" className="text-gray-400 hover:text-white px-2">GitHub</a>
          <a href="#" className="text-gray-400 hover:text-white px-2">Twitter</a>
        </div> */}
      </div>
    </footer>
  );
};

export default Footer;
