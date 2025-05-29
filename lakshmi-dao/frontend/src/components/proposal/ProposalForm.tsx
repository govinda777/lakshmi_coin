import React, { useState } from 'react';
import { useContractWrite, useWaitForTransaction, useAccount } from 'wagmi';
// TODO: Import your GovernanceDAO ABI and address
// import { GOVERNANCE_DAO_ABI, GOVERNANCE_DAO_ADDRESS } from '../../constants/contracts';

interface ProposalFormProps {
  onProposalCreated?: (proposalId: string) => void; // Callback after successful creation
}

const ProposalForm: React.FC<ProposalFormProps> = ({ onProposalCreated }) => {
  const { address } = useAccount();
  const [description, setDescription] = useState('');
  const [targetContract, setTargetContract] = useState('');
  const [callData, setCallData] = useState('');
  const [ethValue, setEthValue] = useState('0'); // ETH value to send with the proposal execution

  const { data: writeData, isLoading: isWriteLoading, write } = useContractWrite({
    // address: GOVERNANCE_DAO_ADDRESS,
    // abi: GOVERNANCE_DAO_ABI,
    functionName: 'createProposal',
  });

  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransaction({
    hash: writeData?.hash,
    onSuccess: (data) => {
      // TODO: Parse proposalId from transaction events
      // const proposalId = data.logs[...].proposalId;
      // if (proposalId && onProposalCreated) {
      //   onProposalCreated(proposalId.toString());
      // }
      console.log('Proposal creation transaction successful:', data);
      // Reset form or redirect
      setDescription('');
      setTargetContract('');
      setCallData('');
      setEthValue('0');
    },
    onError: (error) => {
      console.error('Proposal creation transaction error:', error);
    }
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!address) {
      alert('Please connect your wallet.');
      return;
    }
    if (!write) {
        alert('Contract write function not available. Check contract setup.');
        return;
    }

    console.log({
      description,
      targetContract,
      callData,
      ethValue: ethers.utils.parseEther(ethValue || "0").toString(),
    });


    // TODO: Ensure correct formatting for callData (bytes) and ethValue (uint256)
    // This is a placeholder, actual ABI and address are needed.
    // write({
    //   args: [
    //     description,
    //     targetContract, // address
    //     callData,       // bytes
    //     ethers.utils.parseEther(ethValue || "0") // uint256 value
    //   ],
    // });
    alert("Proposal submission is currently disabled. Please integrate ABI and contract address.");
  };

  if (!address) {
    return <p className="text-center text-red-500">Please connect your wallet to create a proposal.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 shadow-xl rounded-lg">
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Proposal Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={4}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Clearly describe the purpose and details of your proposal."
        />
      </div>

      <div>
        <label htmlFor="targetContract" className="block text-sm font-medium text-gray-700">
          Target Contract Address
        </label>
        <input
          type="text"
          id="targetContract"
          value={targetContract}
          onChange={(e) => setTargetContract(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="0x..."
        />
        <p className="mt-1 text-xs text-gray-500">The address of the contract this proposal will interact with (e.g., DonationVault).</p>
      </div>

      <div>
        <label htmlFor="callData" className="block text-sm font-medium text-gray-700">
          Call Data
        </label>
        <textarea
          id="callData"
          value={callData}
          onChange={(e) => setCallData(e.target.value)}
          required
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="0x... (ABI-encoded function call)"
        />
        <p className="mt-1 text-xs text-gray-500">The ABI-encoded data for the function to be called on the target contract.</p>
      </div>

      <div>
        <label htmlFor="ethValue" className="block text-sm font-medium text-gray-700">
          ETH Value (Optional)
        </label>
        <input
          type="text"
          id="ethValue"
          value={ethValue}
          onChange={(e) => setEthValue(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="0.0"
        />
        <p className="mt-1 text-xs text-gray-500">Amount of ETH (in Ether) to send with the proposal's execution, if any.</p>
      </div>

      <div>
        <button
          type="submit"
          disabled={isWriteLoading || isTxLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isWriteLoading && 'Waiting for wallet confirmation...'}
          {isTxLoading && 'Creating Proposal...'}
          {!isWriteLoading && !isTxLoading && 'Create Proposal'}
        </button>
      </div>

      {isTxSuccess && (
        <p className="text-green-600 text-center">Proposal submitted successfully! Transaction Hash: {writeData?.hash}</p>
      )}
      {/* TODO: Add more specific error messages from contract interaction if available */}
    </form>
  );
};

// Placeholder for ethers if not globally available (e.g. through window object by RainbowKit/Wagmi)
// Ensure ethers is correctly imported or available in your project context
const ethers = require('ethers');

export default ProposalForm;
