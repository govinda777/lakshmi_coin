import React from 'react';
import { Link } from 'react-router-dom';

// Define a type for the proposal data for better type safety
export interface Proposal {
  id: string | number; // Assuming proposal ID can be string or number
  title: string;
  proposer?: string; // Optional: if you want to display it
  status: 'Active' | 'Succeeded' | 'Defeated' | 'Executed' | 'Pending' | 'Canceled'; // Example statuses
  description?: string; // Short description
  forVotes?: number | string; // Can be formatted string or number
  againstVotes?: number | string;
  endDate?: string; // Formatted date string
}

interface ProposalCardProps {
  proposal: Proposal;
}

const getStatusColor = (status: Proposal['status']) => {
  switch (status) {
    case 'Active': return 'bg-blue-500';
    case 'Succeeded': return 'bg-green-500';
    case 'Executed': return 'bg-emerald-600';
    case 'Defeated': return 'bg-red-500';
    case 'Canceled': return 'bg-gray-500';
    case 'Pending': return 'bg-yellow-500';
    default: return 'bg-gray-400';
  }
};

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal }) => {
  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden transform hover:scale-105 transition-transform duration-300 ease-in-out">
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{proposal.title}</h3>
          <span className={`px-3 py-1 text-xs font-semibold text-white rounded-full ${getStatusColor(proposal.status)}`}>
            {proposal.status}
          </span>
        </div>
        {proposal.description && (
          <p className="text-gray-600 text-sm mb-4 truncate">{proposal.description}</p>
        )}
        {proposal.proposer && (
          <p className="text-xs text-gray-500 mb-1">Proposed by: <span className="font-medium truncate">{proposal.proposer}</span></p>
        )}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          {proposal.forVotes !== undefined && (
            <p className="text-green-600">For: {proposal.forVotes?.toString()}</p>
          )}
          {proposal.againstVotes !== undefined && (
            <p className="text-red-600">Against: {proposal.againstVotes?.toString()}</p>
          )}
        </div>
        {proposal.endDate && (
          <p className="text-xs text-gray-500 mb-4">Ends: {proposal.endDate}</p>
        )}
        <Link
          to={`/proposals/${proposal.id}`}
          className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md text-sm transition-colors duration-300"
        >
          View Details
        </Link>
      </div>
    </div>
  );
};

export default ProposalCard;
