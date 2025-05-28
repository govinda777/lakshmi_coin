import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div className="text-center py-20">
      <img
        src="https:// иллюстрациями.рф/media/images/not_found_artage_io_thumb_29055.png" // Replace with a relevant 404 image/SVG
        alt="404 Not Found"
        className="mx-auto mb-8 h-64 w-auto"
      />
      <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
      <p className="text-2xl text-gray-600 mb-8">
        Oops! The page you're looking for doesn't exist.
      </p>
      <Link
        to="/"
        className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-300"
      >
        Go Back to Homepage
      </Link>
    </div>
  );
};

export default NotFoundPage;
