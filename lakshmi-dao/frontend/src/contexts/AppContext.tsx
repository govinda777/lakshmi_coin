import React, { createContext, useContext, ReactNode } from 'react'; // Removed useState for now as it's unused
// import { Proposal } from '../components/proposal/ProposalCard'; // Assuming Proposal type is defined here, commented if not used directly in this file now

// Define the shape of your context state
import { useAccount } from 'wagmi';

// Define the shape of your context state
interface AppContextState {
  userAddress?: `0x${string}`;
  isWalletConnected: boolean;
  // Example state (commented out as not implemented):
  // proposals: Proposal[];
  // isLoadingProposals: boolean;
  // error: string | null;
  // fetchProposals: () => Promise<void>;
}

// Create the context with a default undefined value
// We will provide a proper default value in the Provider
const AppContext = createContext<AppContextState | undefined>(undefined);

// Define the props for your context provider
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Example state management (replace with your actual logic)
  // const [proposals, setProposals] = useState<Proposal[]>([]);
  // const [isLoadingProposals, setIsLoadingProposals] = useState(false);
  // const [error, setError] = useState<string | null>(null);

  // const fetchProposals = async () => {
  //   setIsLoadingProposals(true);
  //   setError(null);
  //   try {
  //     // Replace with actual fetching logic (e.g., from your smart contract via wagmi/ethers)
  //     // const fetchedProposals = await someAsyncFunctionToGetProposals();
  //     // setProposals(fetchedProposals);
  //     console.log("Fetching proposals (placeholder)...")
  //     // Simulating a fetch
  //     setTimeout(() => {
  //        setProposals([
  //          {id: '1', title: 'Sample Proposal 1 from Context', status: 'Active', description: 'This is a test.'},
  //          {id: '2', title: 'Sample Proposal 2 from Context', status: 'Succeeded', description: 'Another test.'}
  //        ]);
  //        setIsLoadingProposals(false);
  //     }, 1000);
  //   } catch (e) {
  //     setError(e instanceof Error ? e.message : "An unknown error occurred");
  //     setIsLoadingProposals(false);
  //   }
  // };

  const { address, isConnected } = useAccount();

  const contextValue: AppContextState = {
    userAddress: address,
    isWalletConnected: isConnected,
    // proposals,
    // isLoadingProposals,
    // error,
    // fetchProposals,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the AppContext
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Note:
// This is a basic structure. You'll need to integrate with wagmi/ethers for actual blockchain interactions.
// For example, `fetchProposals` would use `useContractRead` or `useContractInfiniteReads` from wagmi
// to get data from your GovernanceDAO contract.
// The `userAddress` could be populated using `useAccount` from wagmi at a higher level if needed throughout the context.
