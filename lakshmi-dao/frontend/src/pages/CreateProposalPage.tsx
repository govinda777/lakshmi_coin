import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProposalForm from '../components/proposal/ProposalForm';

const CreateProposalPage: React.FC = () => {
  const navigate = useNavigate();

  const handleProposalCreated = (proposalId: string) => {
    // Navigate to the new proposal's detail page
    // This assumes your ProposalForm calls this function with the new ID
    navigate(`/proposals/${proposalId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800">Create a New Proposal</h1>
          <p className="text-lg text-gray-600 mt-2">
            Shape the future of Lakshmi DAO by submitting your proposal.
          </p>
        </div>
        <ProposalForm onProposalCreated={handleProposalCreated} />
        <p className="text-sm text-gray-500 mt-6 text-center">
          Ensure your proposal is clear, concise, and provides all necessary information for voters.
          You will need LAK tokens to submit a proposal.
        </p>
      </div>
    </div>
  );
};

export default CreateProposalPage;
