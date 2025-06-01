import React, { useState } from 'react';
import { useAccount, useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi';
// TODO: Import your GovernanceDAO ABI and address
// import { GOVERNANCE_DAO_ABI, GOVERNANCE_DAO_ADDRESS } from '../constants/contracts';
import { formatEther, parseEther } from 'ethers/lib/utils';

// Placeholder - replace with your actual contract details
const GOVERNANCE_DAO_ADDRESS_PLACEHOLDER = "0x0000000000000000000000000000000000000000"; // Using zero address as a valid placeholder
const GOVERNANCE_DAO_ABI_PLACEHOLDER: any[] = [
    // Ownable
    { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    // DonationVault related (in GovernanceDAO)
    { "inputs": [], "name": "donationVault", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "_donationVaultAddress", "type": "address" }], "name": "setDonationVault", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    // Parameters
    { "inputs": [], "name": "votingPeriod", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "uint256", "name": "_newVotingPeriodInSeconds", "type": "uint256" }], "name": "setVotingPeriod", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [], "name": "quorumPercentage", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "uint256", "name": "_newQuorumPercentage", "type": "uint256" }], "name": "setQuorumPercentage", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [], "name": "approvalThresholdPercentage", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "uint256", "name": "_newApprovalThresholdPercentage", "type": "uint256" }], "name": "setApprovalThreshold", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
];

const AdminPage: React.FC = () => {
  const { address, isConnected } = useAccount();

  // State for form inputs
  const [newDonationVaultAddr, setNewDonationVaultAddr] = useState('');
  const [newVotingPeriod, setNewVotingPeriod] = useState('');
  const [newQuorum, setNewQuorum] = useState('');
  const [newApprovalThreshold, setNewApprovalThreshold] = useState('');
  const [newOwnerAddr, setNewOwnerAddr] = useState('');

  // --- Read current values ---
  const governanceDAOContractConfig = {
    address: GOVERNANCE_DAO_ADDRESS_PLACEHOLDER as `0x${string}`,
    abi: GOVERNANCE_DAO_ABI_PLACEHOLDER,
  };

  const { data: currentOwner, status: ownerStatus, error: ownerError } = useContractRead({
    ...governanceDAOContractConfig,
    functionName: 'owner',
    enabled: isConnected && GOVERNANCE_DAO_ADDRESS_PLACEHOLDER !== "0x0000000000000000000000000000000000000000" && GOVERNANCE_DAO_ADDRESS_PLACEHOLDER !== "0xYourGovernanceDAOContractAddress",
    watch: true,
  });
  const { data: currentDonationVault, status: dvStatus } = useContractRead({
    ...governanceDAOContractConfig,
    functionName: 'donationVault',
    enabled: isConnected && GOVERNANCE_DAO_ADDRESS_PLACEHOLDER !== "0x0000000000000000000000000000000000000000" && GOVERNANCE_DAO_ADDRESS_PLACEHOLDER !== "0xYourGovernanceDAOContractAddress",
    watch: true,
  });
  const { data: currentVotingPeriod, status: vpStatus } = useContractRead({
    ...governanceDAOContractConfig,
    functionName: 'votingPeriod',
    enabled: isConnected && GOVERNANCE_DAO_ADDRESS_PLACEHOLDER !== "0x0000000000000000000000000000000000000000" && GOVERNANCE_DAO_ADDRESS_PLACEHOLDER !== "0xYourGovernanceDAOContractAddress",
    watch: true,
  });
  const { data: currentQuorum, status: qStatus } = useContractRead({
    ...governanceDAOContractConfig,
    functionName: 'quorumPercentage',
    enabled: isConnected && GOVERNANCE_DAO_ADDRESS_PLACEHOLDER !== "0x0000000000000000000000000000000000000000" && GOVERNANCE_DAO_ADDRESS_PLACEHOLDER !== "0xYourGovernanceDAOContractAddress",
    watch: true,
  });
  const { data: currentApprovalThreshold, status: atStatus } = useContractRead({
    ...governanceDAOContractConfig,
    functionName: 'approvalThresholdPercentage',
    enabled: isConnected && GOVERNANCE_DAO_ADDRESS_PLACEHOLDER !== "0x0000000000000000000000000000000000000000" && GOVERNANCE_DAO_ADDRESS_PLACEHOLDER !== "0xYourGovernanceDAOContractAddress",
    watch: true,
  });

  const isOwner = isConnected && ownerStatus === 'success' && currentOwner === address;

  // --- Contract Write Hooks ---
  const { write: setDonationVault, data: dvData, isLoading: dvLoading } = useContractWrite({ address: GOVERNANCE_DAO_ADDRESS_PLACEHOLDER as `0x${string}`, abi: GOVERNANCE_DAO_ABI_PLACEHOLDER, functionName: 'setDonationVault' });
  const { isLoading: dvTxLoading } = useWaitForTransaction({ hash: dvData?.hash });

  const { write: setVotingPeriod, data: vpData, isLoading: vpLoading } = useContractWrite({ address: GOVERNANCE_DAO_ADDRESS_PLACEHOLDER as `0x${string}`, abi: GOVERNANCE_DAO_ABI_PLACEHOLDER, functionName: 'setVotingPeriod' });
  const { isLoading: vpTxLoading } = useWaitForTransaction({ hash: vpData?.hash });

  const { write: setQuorum, data: qData, isLoading: qLoading } = useContractWrite({ address: GOVERNANCE_DAO_ADDRESS_PLACEHOLDER as `0x${string}`, abi: GOVERNANCE_DAO_ABI_PLACEHOLDER, functionName: 'setQuorumPercentage' });
  const { isLoading: qTxLoading } = useWaitForTransaction({ hash: qData?.hash });

  const { write: setApproval, data: atData, isLoading: atLoading } = useContractWrite({ address: GOVERNANCE_DAO_ADDRESS_PLACEHOLDER as `0x${string}`, abi: GOVERNANCE_DAO_ABI_PLACEHOLDER, functionName: 'setApprovalThreshold' });
  const { isLoading: atTxLoading } = useWaitForTransaction({ hash: atData?.hash });

  const { write: transferOwnership, data: toData, isLoading: toLoading } = useContractWrite({ address: GOVERNANCE_DAO_ADDRESS_PLACEHOLDER as `0x${string}`, abi: GOVERNANCE_DAO_ABI_PLACEHOLDER, functionName: 'transferOwnership' });
  const { isLoading: toTxLoading } = useWaitForTransaction({ hash: toData?.hash });


  const handleSetDonationVault = () => setDonationVault && setDonationVault({ args: [newDonationVaultAddr] });
  const handleSetVotingPeriod = () => setVotingPeriod && setVotingPeriod({ args: [BigInt(newVotingPeriod)] });
  const handleSetQuorum = () => setQuorum && setQuorum({ args: [BigInt(newQuorum)] });
  const handleSetApprovalThreshold = () => setApproval && setApproval({ args: [BigInt(newApprovalThreshold)] });
  const handleTransferOwnership = () => transferOwnership && transferOwnership({ args: [newOwnerAddr] });


  if (!isConnected) {
    return <p className="text-center text-red-500 mt-10">Please connect your wallet.</p>;
  }

  const isContractAddressConfigured = GOVERNANCE_DAO_ADDRESS_PLACEHOLDER !== "0x0000000000000000000000000000000000000000" && GOVERNANCE_DAO_ADDRESS_PLACEHOLDER !== "0xYourGovernanceDAOContractAddress";

  if (!isContractAddressConfigured) {
    return <p className="text-center text-red-500 mt-10">Admin page not available. GovernanceDAO contract address not configured.</p>;
  }

  // Display loading or error for owner data specifically
  let ownerDisplay: string;
  if (ownerStatus === 'loading') {
    ownerDisplay = 'Loading owner...';
  } else if (ownerStatus === 'error') {
    ownerDisplay = `Error loading owner: ${ownerError?.message || 'Unknown error'}`;
  } else if (ownerStatus === 'success' && currentOwner) {
    ownerDisplay = currentOwner.toString();
  } else {
    ownerDisplay = 'Not available';
  }

  // Restrict access if not owner, after owner data has been successfully fetched
  if (ownerStatus === 'success' && !isOwner) {
    return <p className="text-center text-orange-500 mt-10">You are not the owner of the GovernanceDAO contract. Admin functions are restricted.</p>;
  }
  // Show loading for the page if owner data is still loading and contract is configured
  if (ownerStatus === 'loading' && isContractAddressConfigured) {
      return <p className="text-center text-gray-500 mt-10">Loading admin data...</p>;
  }


  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-xl rounded-lg mt-10">
      <h1 className="text-3xl font-bold text-center text-red-700 mb-8">DAO Admin Panel</h1>
      <p className="text-center text-sm text-gray-600 mb-2">Current Owner: <span className="font-mono">{ownerDisplay}</span></p>

      {/* Set Donation Vault */}
      <div className="mb-6 p-4 border rounded-md">
        <h2 className="text-xl font-semibold mb-2">Donation Vault Address</h2>
        <p className="text-sm text-gray-500 mb-1">Current: <span className="font-mono">{dvStatus === 'success' && currentDonationVault ? currentDonationVault.toString() : 'Loading...'}</span></p>
        <input type="text" value={newDonationVaultAddr} onChange={e => setNewDonationVaultAddr(e.target.value)} placeholder="New Vault Address (0x...)" className="w-full p-2 border rounded mb-2" />
        <button onClick={handleSetDonationVault} disabled={!setDonationVault || dvLoading || dvTxLoading} className="w-full bg-blue-500 hover:bg-blue-600 text-white p-2 rounded disabled:opacity-50">
          {dvLoading || dvTxLoading ? 'Setting...' : 'Set Donation Vault'}
        </button>
      </div>

      {/* Set Voting Period */}
      <div className="mb-6 p-4 border rounded-md">
        <h2 className="text-xl font-semibold mb-2">Voting Period (seconds)</h2>
        <p className="text-sm text-gray-500 mb-1">Current: {vpStatus === 'success' && currentVotingPeriod ? currentVotingPeriod.toString() : 'Loading...'} seconds</p>
        <input type="number" value={newVotingPeriod} onChange={e => setNewVotingPeriod(e.target.value)} placeholder="New Voting Period (e.g., 604800 for 7 days)" className="w-full p-2 border rounded mb-2" />
        <button onClick={handleSetVotingPeriod} disabled={!setVotingPeriod || vpLoading || vpTxLoading} className="w-full bg-blue-500 hover:bg-blue-600 text-white p-2 rounded disabled:opacity-50">
          {vpLoading || vpTxLoading ? 'Setting...' : 'Set Voting Period'}
        </button>
      </div>

      {/* Set Quorum Percentage */}
      <div className="mb-6 p-4 border rounded-md">
        <h2 className="text-xl font-semibold mb-2">Quorum Percentage (1-100)</h2>
        <p className="text-sm text-gray-500 mb-1">Current: {qStatus === 'success' && currentQuorum ? currentQuorum.toString() : 'Loading...'}%</p>
        <input type="number" value={newQuorum} onChange={e => setNewQuorum(e.target.value)} placeholder="New Quorum % (e.g., 10 for 10%)" className="w-full p-2 border rounded mb-2" />
        <button onClick={handleSetQuorum} disabled={!setQuorum || qLoading || qTxLoading} className="w-full bg-blue-500 hover:bg-blue-600 text-white p-2 rounded disabled:opacity-50">
          {qLoading || qTxLoading ? 'Setting...' : 'Set Quorum Percentage'}
        </button>
      </div>

      {/* Set Approval Threshold Percentage */}
      <div className="mb-6 p-4 border rounded-md">
        <h2 className="text-xl font-semibold mb-2">Approval Threshold Percentage (1-100)</h2>
        <p className="text-sm text-gray-500 mb-1">Current: {atStatus === 'success' && currentApprovalThreshold ? currentApprovalThreshold.toString() : 'Loading...'}%</p>
        <input type="number" value={newApprovalThreshold} onChange={e => setNewApprovalThreshold(e.target.value)} placeholder="New Approval % (e.g., 66 for 66%)" className="w-full p-2 border rounded mb-2" />
        <button onClick={handleSetApprovalThreshold} disabled={!setApproval || atLoading || atTxLoading} className="w-full bg-blue-500 hover:bg-blue-600 text-white p-2 rounded disabled:opacity-50">
          {atLoading || atTxLoading ? 'Setting...' : 'Set Approval Threshold'}
        </button>
      </div>

      {/* Transfer Ownership */}
      <div className="mb-6 p-4 border rounded-md bg-red-50">
        <h2 className="text-xl font-semibold mb-2 text-red-600">Transfer Ownership</h2>
        <input type="text" value={newOwnerAddr} onChange={e => setNewOwnerAddr(e.target.value)} placeholder="New Owner Address (0x...)" className="w-full p-2 border rounded mb-2" />
        <button onClick={handleTransferOwnership} disabled={!transferOwnership || toLoading || toTxLoading} className="w-full bg-red-500 hover:bg-red-600 text-white p-2 rounded disabled:opacity-50">
          {toLoading || toTxLoading ? 'Transferring...' : 'Transfer Ownership'}
        </button>
        <p className="text-xs text-red-700 mt-2">Warning: Transferring ownership is irreversible and will grant full control to the new address.</p>
      </div>
    </div>
  );
};

export default AdminPage;
