import React, { useState, useEffect } from 'react';
import { useContractWrite, useWaitForTransaction, useAccount, useBalance, useSendTransaction, useNetwork } from 'wagmi';
import { parseEther, formatEther } from 'ethers/lib/utils';
import { getLakshmiZrc20Address, DONATION_VAULT_ADDRESS_DEFAULT, LAKSHMI_ZRC20_ABI_PLACEHOLDER } from '../constants/contracts'; // Corrected relative path
// TODO: Import your DonationVault ABI
// import { DONATION_VAULT_ABI } from '../constants/contracts';


// Placeholder - replace with your actual contract details
// For DonationVault, let's assume it uses the default address for now, or we can make it network-aware too.
const DONATION_VAULT_ADDRESS_PLACEHOLDER = DONATION_VAULT_ADDRESS_DEFAULT; // Using default for now
const DONATION_VAULT_ABI_PLACEHOLDER: any[] = [
    { "inputs": [], "name": "donateEther", "outputs": [], "stateMutability": "payable", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "tokenContract", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "donateERC20", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    // Add getVaultBalance, getERC20Balance if you want to display them here
];
const ERC20_ABI_PLACEHOLDER: any[] = [ // Generic ZRC20 approve function
    { "constant": false, "inputs": [{ "name": "_spender", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "approve", "outputs": [{ "name": "", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }
];


const DonatePage: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const [ethAmount, setEthAmount] = useState('');
  const [erc20Amount, setErc20Amount] = useState('');
  const [erc20TokenAddress, setErc20TokenAddress] = useState('');
  const [donationType, setDonationType] = useState<'eth' | 'erc20'>('eth'); // Toggle between ETH and ZRC20

  const [lakshmiZrc20Addr, setLakshmiZrc20Addr] = useState<`0x${string}` | undefined>(undefined);

  useEffect(() => {
    if (chain) {
      setLakshmiZrc20Addr(getLakshmiZrc20Address(chain.id));
    } else {
      setLakshmiZrc20Addr(getLakshmiZrc20Address(undefined)); // Attempt to get default if chain is undefined
    }
  }, [chain]);

  const { data: nativeBalanceData } = useBalance({ address: address, watch: true });
  const { data: luckBalanceData } = useBalance({
    address: address,
    token: lakshmiZrc20Addr,
    watch: true,
    enabled: !!lakshmiZrc20Addr, // Only fetch if address is resolved
  });

  // --- ETH Donation ---
  const { data: sendTxData, isLoading: isSendingEth, sendTransaction } = useSendTransaction({
    to: DONATION_VAULT_ADDRESS_PLACEHOLDER,
    // `value` will be set at the time of calling sendTransaction
    onSuccess: (data) => {
        console.log('ETH Donation successful (sendTransaction)', data);
        setEthAmount('');
    },
    onError: (error) => {
        console.error('ETH Donation error (sendTransaction)', error)
    }
  });
   const { isLoading: isWaitingForEthTx, isSuccess: isEthTxSuccess } = useWaitForTransaction({ hash: sendTxData?.hash });


  // --- ZRC20 Donation ---
  // 1. Approve DonationVault to spend ZRC20 token
  const { data: approveData, isLoading: isApproving, write: approveSpend } = useContractWrite({
    // address: erc20TokenAddress as `0x${string}` // This needs to be dynamic
    // abi: ERC20_ABI_PLACEHOLDER,
    functionName: 'approve',
  });
  const { isLoading: isWaitingForApproval, isSuccess: isApprovalSuccess } = useWaitForTransaction({ hash: approveData?.hash });

  // 2. Call donateERC20 on DonationVault
  const { data: donateZRC20Data, isLoading: isDonatingZRC20, write: donateZRC20 } = useContractWrite({
    address: DONATION_VAULT_ADDRESS_PLACEHOLDER as `0x${string}`,
    abi: DONATION_VAULT_ABI_PLACEHOLDER,
    functionName: 'donateERC20',
    onSuccess: () => {
      console.log('ZRC20 Donation successful');
      setErc20Amount('');
      setErc20TokenAddress(''); // Optionally reset token address
    },
    onError: (error) => {
        console.error('ZRC20 Donation error', error);
    }
  });
  const { isLoading: isWaitingForZRC20Tx, isSuccess: isZRC20TxSuccess } = useWaitForTransaction({ hash: donateZRC20Data?.hash });


  const handleEthDonate = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet.');
      return;
    }
    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      alert('Please enter a valid amount of ETH.');
      return;
    }
    if (DONATION_VAULT_ADDRESS_PLACEHOLDER === "0xYourDonationVaultContractAddress") {
        alert("DonationVault contract address not set in frontend. Cannot proceed.");
        return;
    }
    if (!sendTransaction) {
        alert("ETH donation feature not available.");
        return;
    }

    sendTransaction({
        to: DONATION_VAULT_ADDRESS_PLACEHOLDER as `0x${string}`, // Ensure 'to' is included
        value: parseEther(ethAmount).toBigInt()
    });
  };

  const handleZRC20Donate = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet.');
      return;
    }
    if (!erc20Amount || parseFloat(erc20Amount) <= 0 || !erc20TokenAddress) {
      alert('Please enter a valid ZRC20 token address and amount.');
      return;
    }
     if (DONATION_VAULT_ADDRESS_PLACEHOLDER === "0xYourDonationVaultContractAddress") {
        alert("DonationVault contract address not set in frontend. Cannot proceed.");
        return;
    }
    if (!approveSpend || !donateZRC20) {
        alert("ZRC20 donation feature not available.");
        return;
    }

    // Step 1: Approve
    // `approveSpend` needs to be called with `address` and `abi` set dynamically or through its config
    // This is a simplified approach; a more robust solution would handle dynamic contract addresses better.
    try {
        console.log(`Approving ${DONATION_VAULT_ADDRESS_PLACEHOLDER} to spend ${parseEther(erc20Amount).toString()} of ${erc20TokenAddress}`);
        // This dynamic call to approveSpend is not standard with wagmi's prepare pattern.
        // You might need a separate useContractWrite instance for each ZRC20 or manage it differently.
        // For now, this will likely fail unless approveSpend is configured for the specific erc20TokenAddress
        // A common pattern is to have one `useContractWrite` for approve and pass `address` dynamically if the ABI is generic.
        // However, `address` in `useContractWrite` config is usually static.
        // A workaround: have a generic ZRC20 approval component or manage state for which token is being approved.

        // This is a placeholder for the approval logic:
        alert("ZRC20 approval step needs to be fully implemented with dynamic token addresses.");
        // Example of how it *might* be called if `approveSpend` was more flexible or reconfigured:
        // await approveSpend({
        //   args: [DONATION_VAULT_ADDRESS_PLACEHOLDER, parseEther(erc20Amount)],
        //   // You would also need to set the `address` for `approveSpend` to `erc20TokenAddress`
        // });
        // For now, we'll assume approval happens and try to call donateZRC20 directly if needed.
        // In a real app, you'd wait for `isApprovalSuccess` before calling `donateZRC20`.

        // If using a pattern where approval is a separate step and `isApprovalSuccess` is true:
        // if (isApprovalSuccess) { // Or if approval was already given
            console.log("Approval successful or assumed. Proceeding to donate ZRC20.");
            donateZRC20({
                args: [erc20TokenAddress, parseEther(erc20Amount).toBigInt()],
            });
        // } else {
        //    console.log("Waiting for approval to complete...");
        // }

    } catch (error) {
        console.error("Error during ZRC20 approval or donation:", error);
        alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };


  if (!isConnected) {
    return <p className="text-center text-red-500 mt-10">Please connect your wallet to make a donation.</p>;
  }

  return (
    <div className="max-w-lg mx-auto p-6 bg-white shadow-xl rounded-lg mt-10">
      <h1 className="text-3xl font-bold text-center text-indigo-700 mb-8">Make a Donation</h1>

      {nativeBalanceData && (
        <p className="text-center text-gray-600 mb-2">
          Native Balance: {parseFloat(formatEther(nativeBalanceData.value)).toFixed(4)} {nativeBalanceData.symbol}
        </p>
      )}
      {lakshmiZrc20Addr && luckBalanceData && (
        <p className="text-center text-gray-600 mb-6">
          LUCK Balance: {parseFloat(formatEther(luckBalanceData.value)).toFixed(4)} {luckBalanceData.symbol}
        </p>
      )}
      {!lakshmiZrc20Addr && isConnected && (
        <p className="text-center text-orange-500 mb-6">
          LUCK token not configured for the current network.
        </p>
      )}


      <div className="mb-6">
        <label className="inline-flex items-center mr-6">
          <input
            type="radio"
            className="form-radio text-indigo-600"
            name="donationType"
            value="eth"
            checked={donationType === 'eth'}
            onChange={() => setDonationType('eth')}
          />
          <span className="ml-2">Donate ETH</span>
        </label>
        <label className="inline-flex items-center">
          <input
            type="radio"
            className="form-radio text-indigo-600"
            name="donationType"
            value="erc20"
            checked={donationType === 'erc20'}
            onChange={() => setDonationType('erc20')}
          />
          <span className="ml-2">Donate ZRC20 Token</span>
        </label>
      </div>


      {donationType === 'eth' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="ethAmount" className="block text-sm font-medium text-gray-700">
              ETH Amount
            </label>
            <input
              type="number"
              id="ethAmount"
              value={ethAmount}
              onChange={(e) => setEthAmount(e.target.value)}
              placeholder="0.1"
              step="any"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <button
            onClick={handleEthDonate}
            disabled={isSendingEth || isWaitingForEthTx || DONATION_VAULT_ADDRESS_PLACEHOLDER === "0xYourDonationVaultContractAddress"}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSendingEth && 'Check Wallet...'}
            {isWaitingForEthTx && 'Processing Donation...'}
            {!isSendingEth && !isWaitingForEthTx && 'Donate ETH'}
          </button>
          {isEthTxSuccess && <p className="text-green-600 text-center mt-2">ETH donation successful!</p>}
        </div>
      )}

      {donationType === 'erc20' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="erc20TokenAddress" className="block text-sm font-medium text-gray-700">
              ZRC20 Token Address
            </label>
            <input
              type="text"
              id="erc20TokenAddress"
              value={erc20TokenAddress}
              onChange={(e) => setErc20TokenAddress(e.target.value)}
              placeholder="0x..."
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="erc20Amount" className="block text-sm font-medium text-gray-700">
              ZRC20 Amount
            </label>
            <input
              type="number"
              id="erc20Amount"
              value={erc20Amount}
              onChange={(e) => setErc20Amount(e.target.value)}
              placeholder="100"
              step="any"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <button
            onClick={handleZRC20Donate}
            disabled={isApproving || isWaitingForApproval || isDonatingZRC20 || isWaitingForZRC20Tx || DONATION_VAULT_ADDRESS_PLACEHOLDER === "0xYourDonationVaultContractAddress"}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          >
            {isApproving && 'Approving Spend...'}
            {isWaitingForApproval && 'Waiting for Approval TX...'}
            {isDonatingZRC20 && !isWaitingForApproval && 'Check Wallet for Donation...'}
            {isWaitingForZRC20Tx && 'Processing ZRC20 Donation...'}
            {!isApproving && !isWaitingForApproval && !isDonatingZRC20 && !isWaitingForZRC20Tx && 'Donate ZRC20 Token'}
          </button>
          {isApprovalSuccess && <p className="text-green-600 text-center mt-2">Token approval successful! You can now donate.</p>}
          {isZRC20TxSuccess && <p className="text-green-600 text-center mt-2">ZRC20 donation successful!</p>}
           {DONATION_VAULT_ADDRESS_PLACEHOLDER === "0xYourDonationVaultContractAddress" &&
             <p className="text-red-500 text-center mt-2">DonationVault contract address not configured.</p>}
        </div>
      )}
       <p className="text-xs text-gray-500 mt-6 text-center">
        Note: ZRC20 donations are a two-step process: 1. Approve the vault to spend your tokens. 2. Make the donation.
        This interface attempts to simplify it, but ensure you confirm both transactions in your wallet if prompted.
        The "Donate ZRC20 Token" button currently triggers both approval (placeholder) and donation.
      </p>
    </div>
  );
};

export default DonatePage;
