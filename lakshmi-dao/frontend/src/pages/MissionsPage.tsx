import React, { useEffect, useState } from 'react';
// Assuming you'll have a way to interact with your smart contract
// For example, using wagmi hooks or a custom service
// import { useContractRead, useContractWrite, usePrepareContractWrite, useAccount } from 'wagmi';
// import { missionsContractAbi, missionsContractAddress } from '../constants/contracts'; // You'll need to define these
// import { useAppContext } from '../contexts/AppContext'; // To get userAddress

// Placeholder for Mission type, should match your smart contract struct
interface Mission {
  id: number; // Using number for simplicity, but BigNumber or string might be from contract
  name: string;
  description: string;
  rewardAmount: string; // Keep as string to display, can be BigNumber initially
  isActive: boolean;
  // creator: string; // if needed
}

// Mock data for missions - replace with actual contract fetching
const mockMissions: Mission[] = [
  { id: 1, name: "Community Participation", description: "Attend 3 community calls and submit notes.", rewardAmount: "100 LUCK", isActive: true },
  { id: 2, name: "Spread the Word", description: "Write a blog post about Lakshmi DAO.", rewardAmount: "250 LUCK", isActive: true },
  { id: 3, name: "Content Creation", description: "Create a video tutorial for using the platform.", rewardAmount: "500 LUCK", isActive: false },
  { id: 4, name: "Bug Bounty", description: "Find and report a critical bug in the smart contracts.", rewardAmount: "1000 LUCK", isActive: true },
];


const MissionsPage: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // const { address: userAddress } = useAccount();
  // const { isWalletConnected } = useAppContext(); // Assuming AppContext provides this

  // --- Fetching Missions ---
  // Example using useContractRead from wagmi (conceptual)
  // const { data: missionIds, isLoading: isLoadingIds, error: errorIds } = useContractRead({
  //   address: missionsContractAddress,
  //   abi: missionsContractAbi,
  //   functionName: 'getAllMissionIds',
  //   watch: true,
  // });

  // In a real scenario, you would then fetch details for each missionId
  // This is a simplified effect for mock data
  useEffect(() => {
    setIsLoading(true);
    // Simulate fetching data
    setTimeout(() => {
      setMissions(mockMissions);
      setIsLoading(false);
    }, 1000);
    // In a real app:
    // if (missionIds) {
    //   // Fetch details for each ID, handle errors, update state
    // } else if (errorIds) {
    //   setError("Failed to load mission IDs.");
    //   setIsLoading(false);
    // }
  }, []); // [missionIds, errorIds] would be dependencies

  const handleCompleteMission = (missionId: number) => {
    console.log(`Attempting to complete mission ${missionId}`);
    // Placeholder for contract interaction
    // const { config } = usePrepareContractWrite({
    //   address: missionsContractAddress,
    //   abi: missionsContractAbi,
    //   functionName: 'completeMission',
    //   args: [missionId],
    // });
    // const { write } = useContractWrite(config);
    // write?.();
    alert(`Frontend: Complete Mission ${missionId} (contract call placeholder)`);
  };

  const handleClaimReward = (missionId: number) => {
    console.log(`Attempting to claim reward for mission ${missionId}`);
    // Placeholder for contract interaction
    // const { config } = usePrepareContractWrite({
    //   address: missionsContractAddress,
    //   abi: missionsContractAbi,
    //   functionName: 'claimReward',
    //   args: [missionId],
    // });
    // const { write } = useContractWrite(config);
    // write?.();
    alert(`Frontend: Claim Reward for Mission ${missionId} (contract call placeholder)`);
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading missions...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  }

  if (missions.length === 0) {
    return <div className="text-center py-10">No missions available at the moment. Check back soon!</div>;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-bold text-teal-600">Missions Hub</h1>
        <p className="text-xl text-gray-600 mt-2">
          Complete tasks, contribute to the DAO, and earn $LUCK rewards!
        </p>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {missions.map((mission) => (
          <div
            key={mission.id}
            className={`bg-white p-6 rounded-lg shadow-lg border-l-4 ${
              mission.isActive ? 'border-teal-500' : 'border-gray-400'
            } flex flex-col justify-between`}
          >
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">{mission.name}</h2>
              <p className="text-gray-700 mb-3 h-24 overflow-y-auto">{mission.description}</p>
              <div className="mb-3">
                <span className="font-semibold">Reward:</span> {mission.rewardAmount}
              </div>
              <div className="mb-4">
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  mission.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-800"
                }`}>
                  {mission.isActive ? "Active" : "Inactive"}
                </span>
                {/* Placeholder for completion status - would require checking `hasClaimedReward` for the user */}
                {/* <span className="ml-2 px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">Not Claimed</span> */}
              </div>
            </div>

            {mission.isActive && ( // Only show buttons for active missions
              <div className="mt-auto space-y-2">
                <button
                  onClick={() => handleCompleteMission(mission.id)}
                  // disabled={!isWalletConnected} // Example
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  Signal Completion
                </button>
                <button
                  onClick={() => handleClaimReward(mission.id)}
                  // disabled={!isWalletConnected} // Example: or if already claimed
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  Claim Reward
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-gray-600 mt-12">
        Note: Mission completion and reward claims are subject to on-chain verification and $LUCK token availability in the Missions contract.
      </p>
    </div>
  );
};

export default MissionsPage;
