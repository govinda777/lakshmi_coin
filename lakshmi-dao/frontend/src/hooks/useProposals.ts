import { useState, useEffect, useCallback } from 'react';
import { useContractRead, useAccount, useContractInfiniteReads } from 'wagmi';
// TODO: Import your GovernanceDAO ABI and address
// import { GOVERNANCE_DAO_ABI, GOVERNANCE_DAO_ADDRESS } from '../constants/contracts';
import { Proposal } from '../components/proposal/ProposalCard'; // Assuming type definition
import { BigNumber } from 'ethers'; // For handling BigNumber from contracts

// Placeholder ABI and Address - replace with your actual contract details
const GOVERNANCE_DAO_ABI_PLACEHOLDER: any[] = [
    { "inputs": [], "name": "nextProposalId", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "proposals", "outputs": [{ "internalType": "uint256", "name": "id", "type": "uint256" }, { "internalType": "address", "name": "proposer", "type": "address" }, { "internalType": "string", "name": "description", "type": "string" }, { "internalType": "uint256", "name": "votingStartTime", "type": "uint256" }, { "internalType": "uint256", "name": "votingEndTime", "type": "uint256" }, { "internalType": "uint256", "name": "forVotes", "type": "uint256" }, { "internalType": "uint256", "name": "againstVotes", "type": "uint256" }, { "internalType": "uint256", "name": "abstainVotes", "type": "uint256" }, { "internalType": "bool", "name": "executed", "type": "bool" }, { "internalType": "uint8", "name": "state", "type": "uint8" }, { "internalType": "address", "name": "targetContract", "type": "address" }, { "internalType": "bytes", "name": "callData", "type": "bytes" }, { "internalType": "uint256", "name": "value", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    // Add other relevant functions like getProposal, etc.
];
const GOVERNANCE_DAO_ADDRESS_PLACEHOLDER = "0xYourGovernanceDAOContractAddress"; // Replace!

// Helper to map numeric state to string
const mapProposalState = (stateEnum: number): Proposal['status'] => {
    // Enum ProposalState { Pending, Active, Succeeded, Defeated, Executed, Canceled }
    switch (stateEnum) {
        case 0: return 'Pending';
        case 1: return 'Active';
        case 2: return 'Succeeded';
        case 3: return 'Defeated';
        case 4: return 'Executed';
        case 5: return 'Canceled';
        default: return 'Pending'; // Or throw an error for unknown state
    }
};

// Hook to fetch a single proposal
export const useProposal = (proposalId: string | number) => {
    const { data: proposalData, isLoading, error, refetch } = useContractRead({
        address: GOVERNANCE_DAO_ADDRESS_PLACEHOLDER,
        abi: GOVERNANCE_DAO_ABI_PLACEHOLDER,
        functionName: 'proposals', // Assuming 'proposals' mapping is public
        args: [proposalId],
        enabled: !!proposalId && GOVERNANCE_DAO_ADDRESS_PLACEHOLDER !== "0xYourGovernanceDAOContractAddress", // Only run if ID is valid and address is set
        select: (data: any) => { // `data` will be an array/tuple based on struct output
            if (!data) return undefined;
            return {
                id: BigNumber.from(data.id).toString(),
                proposer: data.proposer,
                title: data.description, // Using description as title for now
                description: data.description,
                votingStartTime: BigNumber.from(data.votingStartTime).toNumber(),
                votingEndTime: BigNumber.from(data.votingEndTime).toNumber(),
                forVotes: BigNumber.from(data.forVotes).toString(),
                againstVotes: BigNumber.from(data.againstVotes).toString(),
                abstainVotes: BigNumber.from(data.abstainVotes).toString(),
                executed: data.executed,
                status: mapProposalState(data.state),
                targetContract: data.targetContract,
                callData: data.callData,
                value: BigNumber.from(data.value).toString(),
            } as Proposal;
        }
    });

    return { proposal: proposalData, isLoading, error, refetchProposal: refetch };
};


import { InfiniteData } from 'wagmi'; // Import InfiniteData

// Define the return type for the useProposals hook
interface UseProposalsReturn {
  proposals: Proposal[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  error: Error | null;
  fetchNextPage: (options?: any) => Promise<any>;
  hasNextPage?: boolean;
  refetchProposals: (options?: any) => Promise<any>;
}

// Hook to fetch all proposals (or a paginated list)
// This is a more complex example using useContractInfiniteReads for pagination
export const useProposals = (pageSize: number = 10): UseProposalsReturn => {
    const { address } = useAccount();

    // Get total number of proposals to determine pagination
    const { data: nextProposalIdData } = useContractRead({
        address: GOVERNANCE_DAO_ADDRESS_PLACEHOLDER,
        abi: GOVERNANCE_DAO_ABI_PLACEHOLDER,
        functionName: 'nextProposalId', // Assuming this gives the count of total proposals + 1
        enabled: GOVERNANCE_DAO_ADDRESS_PLACEHOLDER !== "0xYourGovernanceDAOContractAddress",
        watch: true,
    });
    const totalProposals = nextProposalIdData ? BigNumber.from(nextProposalIdData).toNumber() -1 : 0;


    const {
        data, // data.pages will be an array of arrays of proposals
        fetchNextPage,
        hasNextPage,
        isLoading,
        isFetchingNextPage,
        error,
        refetch, // To refetch all pages
    } = useContractInfiniteReads({
        cacheKey: 'allProposals',
        enabled: totalProposals > 0 && GOVERNANCE_DAO_ADDRESS_PLACEHOLDER !== "0xYourGovernanceDAOContractAddress",
        async getNextPageParam(lastPage, allPages) { // Renamed getPageParam to getNextPageParam
            const proposalsFetched = allPages.flat().length;
            if (proposalsFetched < totalProposals) {
                // The "page param" here is the starting index for the next batch of proposal IDs to fetch
                // We fetch proposals in reverse order (newest first)
                return Math.max(0, totalProposals - proposalsFetched - pageSize);
            }
            return undefined; // No more pages
        },
        contracts(pageParam = 0) {
            // `pageParam` is the starting index (from the end, effectively)
            // We need to generate an array of contract calls for proposal IDs
            // e.g., if totalProposals = 25, pageSize = 10
            // Page 1: pageParam = max(0, 25 - 0 - 10) = 15. Fetch IDs [16..25] (reversed: 25 down to 16)
            // Page 2: pageParam = max(0, 25 - 10 - 10) = 5. Fetch IDs [6..15] (reversed: 15 down to 6)
            // Page 3: pageParam = max(0, 25 - 20 - 10) = 0. Fetch IDs [1..5] (reversed: 5 down to 1)

            // This logic assumes proposal IDs are sequential (1, 2, 3, ... up to nextProposalId - 1)
            // And we want to fetch them in batches, newest first.
            const contractsConfig = [];
            const firstIdToFetch = totalProposals - pageParam; // e.g. 25 - 15 = 10. So we want to fetch from ID 10 down to 1 (if pageSize allows)
                                                                // Or, if pageParam is like an offset from the start for reverse order:
                                                                // if pageParam = 0 (first page), fetch from totalProposals down to totalProposals - pageSize + 1
                                                                // if pageParam = 10 (second page), fetch from totalProposals - 10 down to totalProposals - 10 - pageSize + 1

            const startId = totalProposals - (pageParam || 0); // ID to start fetching from (highest ID in this batch)
            const endId = Math.max(1, startId - pageSize + 1);   // ID to end fetching at (lowest ID in this batch)


            for (let i = startId; i >= endId; i--) {
                if (i > 0) { // Proposal IDs are likely 1-indexed
                    contractsConfig.push({
                        address: GOVERNANCE_DAO_ADDRESS_PLACEHOLDER as `0x${string}`,
                        abi: GOVERNANCE_DAO_ABI_PLACEHOLDER,
                        functionName: 'proposals',
                        args: [i],
                    });
                }
            }
            return contractsConfig;
        },
        select: (pageData: { pages: { result?: any; status: "success" | "failure"; error?: Error }[][] , pageParams: any[] }) => {
            if (!pageData || !pageData.pages) return { pages: [] as Proposal[][], pageParams: pageData?.pageParams || [] };

            const newPages: Proposal[][] = pageData.pages.map((pageResults) =>
                pageResults.map((data) => {
                    if (data.status === "failure" || !data.result) return null;
                    const result = data.result;
                    return {
                        id: BigNumber.from(result.id).toString(),
                            proposer: result.proposer,
                            title: result.description,
                            description: result.description,
                            votingStartTime: BigNumber.from(result.votingStartTime).toNumber(),
                            votingEndTime: BigNumber.from(result.votingEndTime).toNumber(),
                            forVotes: BigNumber.from(result.forVotes).toString(),
                            againstVotes: BigNumber.from(result.againstVotes).toString(),
                            abstainVotes: BigNumber.from(result.abstainVotes).toString(),
                            executed: result.executed,
                            status: mapProposalState(result.state),
                            targetContract: result.targetContract,
                            callData: result.callData,
                            value: BigNumber.from(result.value).toString(),
                        } as Proposal;
                    }).filter(p => p !== null) as Proposal[] // Ensure inner map results in Proposal[]
            );
            return { pages: newPages, pageParams: pageData.pageParams };
        },
    });

    const proposals: Proposal[] = data?.pages.flat() || []; // Explicitly type proposals

    // If the contract address is not set, return a message or empty state
    if (GOVERNANCE_DAO_ADDRESS_PLACEHOLDER === "0xYourGovernanceDAOContractAddress") {
        return {
            proposals: [],
            isLoading: false,
            error: new Error("GovernanceDAO contract address not set in frontend/src/hooks/useProposals.ts"),
            fetchNextPage: async () => {}, // Make async to match expected type
            hasNextPage: false,
            isFetchingNextPage: false,
            refetchProposals: async () => {}, // Make async to match expected type
        };
    }

    // Type assertion for the data returned by useContractInfiniteReads after select
    const typedData = data as InfiniteData<{ pages: Proposal[][], pageParams: any[] }> | undefined;
    const fetchedProposals: Proposal[] = typedData?.pages.flat() || [];


    return {
        proposals: fetchedProposals, // Use a different name for the returned property value
        isLoading: isLoading && !typedData, // True initial loading
        isFetchingNextPage,
        error,
        fetchNextPage,
        hasNextPage,
        refetchProposals: refetch,
    };
};

// Note: This hook is a starting point.
// - Error handling can be improved.
// - Consider adding a `useContractEvent` to listen for new proposals and trigger `refetchProposals`.
// - The pagination logic fetches newest proposals first. Adjust if different order is needed.
// - Replace placeholder ABI and address with your actual contract details.
// - Ensure your GovernanceDAO contract has a way to get total proposals (like `nextProposalId` or a dedicated counter)
//   and that proposal data can be fetched by ID via a public mapping or getter.
