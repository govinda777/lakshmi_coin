import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ProposalCard from '../components/proposal/ProposalCard';
import { useProposals } from '../hooks/useProposals'; // Your custom hook
import { Proposal } from '../components/proposal/ProposalCard'; // Type for proposal

const PROPOSALS_PER_PAGE = 9;

const ProposalsPage: React.FC = () => {
  const {
    proposals,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    error,
    refetchProposals,
  } = useProposals(PROPOSALS_PER_PAGE); // Use the hook

  const [filterStatus, setFilterStatus] = useState<Proposal['status'] | 'All'>('All');

  const filteredProposals = proposals.filter(proposal =>
    filterStatus === 'All' ? true : proposal.status === filterStatus
  );

  // Placeholder: In a real app, you might want to fetch based on filter if your backend/contract supports it.
  // For now, filtering is client-side.

  if (isLoading && !proposals.length) { // Show initial loading state
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-lg text-gray-600">Loading proposals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-500">
        <p>Error loading proposals: {error.message}</p>
        <button
          onClick={() => refetchProposals()}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-4 border-b border-gray-200">
        <h1 className="text-4xl font-bold text-gray-800 mb-4 sm:mb-0">DAO Proposals</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as Proposal['status'] | 'All')}
              className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-indigo-500 shadow"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Active">Active</option>
              <option value="Succeeded">Succeeded</option>
              <option value="Executed">Executed</option>
              <option value="Defeated">Defeated</option>
              <option value="Canceled">Canceled</option>
            </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
          <Link
            to="/proposals/new"
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-300"
          >
            Create Proposal
          </Link>
        </div>
      </div>

      {filteredProposals.length === 0 && !isLoading && (
        <div className="text-center py-10">
          <img src="/placeholder-no-proposals.svg" alt="No proposals" className="mx-auto h-40 w-40 text-gray-400 mb-4" /> {/* Replace with actual SVG or image */}
          <p className="text-xl text-gray-500">
            No proposals found matching your criteria.
            {filterStatus === 'All' && " Why not create one?"}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredProposals.map((proposal) => (
          <ProposalCard key={proposal.id.toString()} proposal={proposal} />
        ))}
      </div>

      {hasNextPage && (
        <div className="mt-10 text-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors duration-300 disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading more...' : 'Load More Proposals'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProposalsPage;
