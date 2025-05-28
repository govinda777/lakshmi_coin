import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAccount, useContractWrite, useWaitForTransaction, useBalance } from 'wagmi';
import { formatEther, parseEther } from 'ethers/lib/utils';
import { useProposal } from '../hooks/useProposals'; // Your custom hook to fetch a single proposal
// TODO: Import your GovernanceDAO ABI and address
// import { GOVERNANCE_DAO_ABI, GOVERNANCE_DAO_ADDRESS } from '../constants/contracts';
import { Proposal } from '../components/proposal/ProposalCard'; // Type

// Placeholder - replace with your actual contract details
const GOVERNANCE_DAO_ADDRESS_PLACEHOLDER = "0xYourGovernanceDAOContractAddress";
const GOVERNANCE_DAO_ABI_PLACEHOLDER: any[] = [
    { "inputs": [{ "internalType": "uint256", "name": "proposalId", "type": "uint256" }, { "internalType": "uint8", "name": "voteType", "type": "uint8" }], "name": "vote", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "internalType": "uint256", "name": "proposalId", "type": "uint256" }], "name": "executeProposal", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "internalType": "uint256", "name": "proposalId", "type": "uint256" }], "name": "updateProposalStateAfterVoting", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    // Add other relevant functions like getVote, hasVotedOnProposal
];


const getStatusColorClass = (status: Proposal['status'] | undefined) => {
  switch (status) {
    case 'Active': return 'text-blue-600 bg-blue-100';
    case 'Succeeded': return 'text-green-600 bg-green-100';
    case 'Executed': return 'text-emerald-700 bg-emerald-100';
    case 'Defeated': return 'text-red-600 bg-red-100';
    case 'Canceled': return 'text-gray-600 bg-gray-100';
    case 'Pending': return 'text-yellow-600 bg-yellow-100';
    default: return 'text-gray-500 bg-gray-100';
  }
};

const ProposalDetailPage: React.FC = () => {
  const { proposalId } = useParams<{ proposalId: string }>();
  const { address, isConnected } = useAccount();
  const { data: lakBalanceData } = useBalance({ address, watch: true /* TODO: Add LAK token address if you have one */ });

  const { proposal, isLoading, error, refetchProposal } = useProposal(proposalId || "");

  const [selectedVote, setSelectedVote] = useState<number | null>(null); // 0: For, 1: Against, 2: Abstain

  // --- Vote Action ---
  const { data: voteData, isLoading: isVoting, write: castVote } = useContractWrite({
    address: GOVERNANCE_DAO_ADDRESS_PLACEHOLDER as `0x${string}`,
    abi: GOVERNANCE_DAO_ABI_PLACEHOLDER,
    functionName: 'vote',
    onSuccess: () => { refetchProposal(); setSelectedVote(null); },
    onError: (err) => { console.error("Vote error:", err); alert(`Vote failed: ${err.message}`);}
  });
  const { isLoading: isVoteTxLoading, isSuccess: isVoteTxSuccess } = useWaitForTransaction({ hash: voteData?.hash });

  // --- Execute Action ---
  const { data: executeData, isLoading: isExecuting, write: execute } = useContractWrite({
    address: GOVERNANCE_DAO_ADDRESS_PLACEHOLDER as `0x${string}`,
    abi: GOVERNANCE_DAO_ABI_PLACEHOLDER,
    functionName: 'executeProposal',
    onSuccess: () => { refetchProposal(); },
    onError: (err) => { console.error("Execute error:", err); alert(`Execute failed: ${err.message}`);}
  });
  const { isLoading: isExecuteTxLoading, isSuccess: isExecuteTxSuccess } = useWaitForTransaction({ hash: executeData?.hash });

  // --- Update State Action (after voting ends) ---
    const { data: updateStateData, isLoading: isUpdatingState, write: updateState } = useContractWrite({
        address: GOVERNANCE_DAO_ADDRESS_PLACEHOLDER as `0x${string}`,
        abi: GOVERNANCE_DAO_ABI_PLACEHOLDER,
        functionName: 'updateProposalStateAfterVoting',
        onSuccess: () => { refetchProposal(); },
        onError: (err) => { console.error("Update state error:", err); alert(`Update state failed: ${err.message}`); }
    });
    const { isLoading: isUpdateStateTxLoading, isSuccess: isUpdateStateTxSuccess } = useWaitForTransaction({ hash: updateStateData?.hash });


  const handleVote = () => {
    if (selectedVote === null || !proposalId) {
      alert('Please select a vote option.');
      return;
    }
     if (GOVERNANCE_DAO_ADDRESS_PLACEHOLDER === "0xYourGovernanceDAOContractAddress" || !castVote) {
        alert("Voting feature not available. Contract details missing.");
        return;
    }
    castVote({ args: [BigInt(proposalId), selectedVote] });
  };

  const handleExecute = () => {
    if (!proposalId) return;
    if (GOVERNANCE_DAO_ADDRESS_PLACEHOLDER === "0xYourGovernanceDAOContractAddress" || !execute) {
        alert("Execute feature not available. Contract details missing.");
        return;
    }
    execute({ args: [BigInt(proposalId)] });
  };

  const handleUpdateState = () => {
    if (!proposalId) return;
    if (GOVERNANCE_DAO_ADDRESS_PLACEHOLDER === "0xYourGovernanceDAOContractAddress" || !updateState) {
        alert("Update state feature not available. Contract details missing.");
        return;
    }
    updateState({ args: [BigInt(proposalId)] });
  };

  if (isLoading) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-lg text-gray-600">Loading proposal details...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Error loading proposal: {error.message}</div>;
  }

  if (!proposal) {
    return <div className="text-center py-10 text-gray-500">Proposal not found.</div>;
  }

  const canVote = proposal.status === 'Active' && isConnected; // && !hasVoted (need to implement hasVoted check)
  const canExecute = proposal.status === 'Succeeded' && !proposal.executed && isConnected;
  const canUpdateState = proposal.status === 'Active' && proposal.votingEndTime && (Date.now() / 1000 > proposal.votingEndTime) && isConnected;


  return (
    <div className="max-w-3xl mx-auto bg-white shadow-2xl rounded-lg p-8 mt-10">
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-3xl font-bold text-gray-800">{proposal.title}</h1>
        <span className={`px-4 py-2 text-sm font-semibold rounded-full ${getStatusColorClass(proposal.status)}`}>
          {proposal.status}
        </span>
      </div>

      <div className="prose max-w-none mb-6 text-gray-700">
        <p>{proposal.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-sm">
        <div>
          <h3 className="font-semibold text-gray-600">Proposer:</h3>
          <p className="text-gray-800 truncate" title={proposal.proposer}>{proposal.proposer}</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-600">Target Contract:</h3>
          <p className="text-gray-800 truncate" title={proposal.targetContract}>{proposal.targetContract || 'N/A'}</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-600">Voting Start Time:</h3>
          <p className="text-gray-800">{proposal.votingStartTime ? new Date(proposal.votingStartTime * 1000).toLocaleString() : 'N/A'}</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-600">Voting End Time:</h3>
          <p className="text-gray-800">{proposal.votingEndTime ? new Date(proposal.votingEndTime * 1000).toLocaleString() : 'N/A'}</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-600">ETH Value for Execution:</h3>
          <p className="text-gray-800">{proposal.value ? formatEther(proposal.value) : '0'} ETH</p>
        </div>
         <div>
          <h3 className="font-semibold text-gray-600">Executed:</h3>
          <p className="text-gray-800">{proposal.executed ? 'Yes' : 'No'}</p>
        </div>
      </div>

      <div className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-xl font-semibold text-gray-700 mb-4 text-center">Current Votes</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-green-500">{proposal.forVotes ? formatEther(proposal.forVotes) : '0'}</p>
            <p className="text-sm text-gray-600">For</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-red-500">{proposal.againstVotes ? formatEther(proposal.againstVotes) : '0'}</p>
            <p className="text-sm text-gray-600">Against</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-500">{proposal.abstainVotes ? formatEther(proposal.abstainVotes) : '0'}</p>
            <p className="text-sm text-gray-600">Abstain</p>
          </div>
        </div>
      </div>

      {/* Voting Section */}
      {canVote && (
        <div className="mb-8 p-6 border border-indigo-200 rounded-lg">
          <h3 className="text-xl font-semibold text-indigo-700 mb-4">Cast Your Vote</h3>
           {lakBalanceData && <p className="text-sm text-gray-600 mb-3">Your LAK voting power: {formatEther(lakBalanceData.value)} {lakBalanceData.symbol}</p>}
          <div className="flex space-x-4 mb-4">
            {(['For', 'Against', 'Abstain'] as const).map((type, index) => (
              <button
                key={type}
                onClick={() => setSelectedVote(index)}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors
                  ${selectedVote === index
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
              >
                {type}
              </button>
            ))}
          </div>
          <button
            onClick={handleVote}
            disabled={isVoting || isVoteTxLoading || selectedVote === null}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md disabled:opacity-50 transition-colors"
          >
            {isVoting ? 'Check Wallet...' : isVoteTxLoading ? 'Processing Vote...' : 'Submit Vote'}
          </button>
          {isVoteTxSuccess && <p className="text-green-600 mt-2 text-center">Vote submitted successfully!</p>}
        </div>
      )}
      {!isConnected && proposal.status === 'Active' && <p className="text-center text-red-500 mb-4">Please connect your wallet to vote.</p>}


      {/* Update State Button */}
      {canUpdateState && (
          <div className="mt-6 mb-8">
              <button
                  onClick={handleUpdateState}
                  disabled={isUpdatingState || isUpdateStateTxLoading}
                  className="w-full py-3 px-4 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg shadow-md disabled:opacity-50 transition-colors"
              >
                  {isUpdatingState ? 'Check Wallet...' : isUpdateStateTxLoading ? 'Updating State...' : 'Update Proposal State (After Voting)'}
              </button>
              {isUpdateStateTxSuccess && <p className="text-green-600 mt-2 text-center">Proposal state updated successfully!</p>}
          </div>
      )}


      {/* Execution Section */}
      {canExecute && (
        <div className="mt-6 mb-8">
          <button
            onClick={handleExecute}
            disabled={isExecuting || isExecuteTxLoading}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md disabled:opacity-50 transition-colors"
          >
            {isExecuting ? 'Check Wallet...' : isExecuteTxLoading ? 'Processing Execution...' : 'Execute Proposal'}
          </button>
          {isExecuteTxSuccess && <p className="text-green-600 mt-2 text-center">Proposal executed successfully!</p>}
        </div>
      )}
      {proposal.status === 'Succeeded' && proposal.executed && (
          <p className="text-center text-emerald-600 font-semibold mb-4">This proposal has been executed.</p>
      )}


      <div className="mt-10 text-center">
        <Link to="/proposals" className="text-indigo-600 hover:text-indigo-800 font-medium">
          &larr; Back to All Proposals
        </Link>
      </div>
       {GOVERNANCE_DAO_ADDRESS_PLACEHOLDER === "0xYourGovernanceDAOContractAddress" &&
             <p className="text-red-500 text-center mt-6 text-xs">
                 Note: Interaction features (vote, execute) are disabled because the GovernanceDAO contract address is not set in the frontend code.
             </p>}
    </div>
  );
};

export default ProposalDetailPage;
