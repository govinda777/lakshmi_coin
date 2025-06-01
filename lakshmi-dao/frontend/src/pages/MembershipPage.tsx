import React, { useState, useEffect } from 'react';
// import { useAccount, useContractRead } from 'wagmi';
// import { membershipContractAbi, membershipContractAddress } from '../constants/contracts'; // Define these
// import { ethers } from 'ethers';
// import { useAppContext } from '../contexts/AppContext';

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{ trait_type: string; value: string | number }>;
}

interface OwnedNFT {
  tokenId: string;
  metadata?: NFTMetadata; // Will be fetched
  tokenURI?: string;
}

const MembershipPage: React.FC = () => {
  const [ownedNFTs, setOwnedNFTs] = useState<OwnedNFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // const { address: userAddress, isConnected } = useAccount();
  // const { isWalletConnected } = useAppContext(); // Or use isConnected from useAccount

  // --- Fetch owned NFTs ---
  // const { data: balanceData, isLoading: isLoadingBalance } = useContractRead({
  //   address: membershipContractAddress,
  //   abi: membershipContractAbi,
  //   functionName: 'balanceOf',
  //   args: [userAddress],
  //   enabled: !!userAddress,
  //   watch: true,
  // });

  // This effect would then fetch token IDs and their metadata
  useEffect(() => {
    // const fetchOwnedNFTs = async () => {
    //   if (!userAddress || !balanceData || balanceData.eq(0)) {
    //     setOwnedNFTs([]);
    //     setIsLoading(false);
    //     if (userAddress && balanceData && balanceData.eq(0)) {
    //         setInfoMessage("You do not own any Membership NFTs yet.");
    //     }
    //     return;
    //   }
    //   setIsLoading(true);
    //   setInfoMessage(null);
    //   try {
    //     const numOwned = balanceData.toNumber();
    //     const nfts: OwnedNFT[] = [];
    //     for (let i = 0; i < numOwned; i++) {
    //       // const tokenId = await readContract({ ... tokenOfOwnerByIndex ... args: [userAddress, i] });
    //       // const tokenURI = await readContract({ ... tokenURI ... args: [tokenId] });
    //       // nfts.push({ tokenId: tokenId.toString(), tokenURI });
    //     }
    //     setOwnedNFTs(nfts);
    //     // Then, another effect could fetch metadata for these URIs
    //   } catch (e) {
    //     console.error("Error fetching owned NFTs:", e);
    //     setError("Could not load your Membership NFTs.");
    //   }
    //   setIsLoading(false);
    // };
    // fetchOwnedNFTs();

    // Mock data for now
    setIsLoading(true);
    setTimeout(() => {
      setOwnedNFTs([
        { tokenId: "1", tokenURI: "https://api.example.com/nfts/lakshmi-membership/1" },
        { tokenId: "42", tokenURI: "https://api.example.com/nfts/lakshmi-membership/42" },
      ]);
      setIsLoading(false);
    }, 1000);
  }, []); // Dependencies: [userAddress, balanceData]

  // Effect to fetch metadata for NFTs that have tokenURIs but no metadata yet
  useEffect(() => {
    ownedNFTs.forEach((nft) => {
      if (nft.tokenURI && !nft.metadata) {
        fetch(nft.tokenURI)
          .then((res) => {
            if (!res.ok) { throw new Error(`HTTP error! status: ${res.status} for ${nft.tokenURI}`); }
            return res.json();
          })
          .then((data: NFTMetadata) => {
            setOwnedNFTs((prevNfts) =>
              prevNfts.map((prevNft) =>
                prevNft.tokenId === nft.tokenId ? { ...prevNft, metadata: data } : prevNft
              )
            );
          })
          .catch((e) => {
            console.error(`Failed to fetch metadata for token ${nft.tokenId} from ${nft.tokenURI}:`, e);
            // Optionally set an error state on the specific NFT
             setOwnedNFTs((prevNfts) =>
              prevNfts.map((prevNft) =>
                prevNft.tokenId === nft.tokenId ? { ...prevNft, metadata: { name: `Error loading metadata for #${nft.tokenId}`, description: e.message, image: '', attributes: [] } } : prevNft
              )
            );
          });
      }
    });
  }, [ownedNFTs]);


  const handleMintRequest = () => {
    // This would be for a scenario where users can request minting,
    // or if there's a public mint function (not in current contract V1).
    // For admin mint, admin would use a separate interface or direct contract interaction.
    alert("Membership NFTs are currently minted by DAO admins for contributors and active members. Get involved in the DAO to be eligible!");
  };

  // Placeholder for userAddress for display purposes
  const userAddress = "0xYourConnectedAddress";

  if (isLoading && ownedNFTs.length === 0) { // Show loading only if still fetching initial list
    return <div className="text-center py-10">Loading membership information...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-bold text-purple-600">DAO Membership NFTs</h1>
        <p className="text-xl text-gray-600 mt-2">
          Unlock exclusive benefits and showcase your commitment to Lakshmi DAO.
        </p>
      </header>

      <div className="bg-white p-8 rounded-lg shadow-xl mb-10">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">What are Membership NFTs?</h2>
        <p className="text-gray-700 mb-3">
          Lakshmi DAO Membership NFTs are unique digital collectibles (ERC721 tokens) that signify your active role and standing within our community. Holding a Membership NFT can grant you access to:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4 pl-4">
          <li>Enhanced voting power in DAO governance proposals.</li>
          <li>Exclusive channels in our community Discord server.</li>
          <li>Early access to new features and platform updates.</li>
          <li>Special recognition and roles within the DAO.</li>
          {/* Add more benefits as defined */}
        </ul>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">How to Get One?</h3>
        <p className="text-gray-700">
          Currently, Membership NFTs are awarded by DAO administrators to individuals who have shown significant contribution, completed key missions, or staked a substantial amount of $LUCK tokens. Stay active, contribute, and you might be selected for the next minting round!
        </p>
        <div className="mt-6 text-center">
            <button
                onClick={handleMintRequest}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors"
            >
                Learn More About Eligibility
            </button>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-3xl font-semibold text-gray-800 mb-8 text-center">Your Membership NFTs</h2>
        {/* {isLoadingBalance && <p className="text-center">Checking your NFT balance...</p>} */}
        {!userAddress && <p className="text-center text-gray-600">Please connect your wallet to see your Membership NFTs.</p>}
        {userAddress && infoMessage && <p className="text-center text-gray-600">{infoMessage}</p>}

        {ownedNFTs.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {ownedNFTs.map((nft) => (
              <div key={nft.tokenId} className="bg-gray-50 p-6 rounded-lg shadow-lg border border-purple-200">
                <h3 className="text-xl font-bold text-purple-700 mb-3">
                    {nft.metadata ? nft.metadata.name : `Membership NFT #${nft.tokenId}`}
                </h3>
                {nft.metadata ? (
                  <>
                    {nft.metadata.image && (
                        <img
                            src={nft.metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/")} // Basic IPFS gateway
                            alt={nft.metadata.name}
                            className="w-full h-48 object-cover rounded-md mb-3 shadow"
                        />
                    )}
                    <p className="text-sm text-gray-600 mb-2 h-16 overflow-y-auto">{nft.metadata.description}</p>
                    {nft.metadata.attributes && nft.metadata.attributes.length > 0 && (
                        <div className="mt-2">
                            <h4 className="font-semibold text-sm text-gray-500 mb-1">Attributes:</h4>
                            {nft.metadata.attributes.map(attr => (
                                <div key={attr.trait_type} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full inline-block mr-1 mb-1">
                                    <strong>{attr.trait_type}:</strong> {attr.value}
                                </div>
                            ))}
                        </div>
                    )}
                  </>
                ) : nft.tokenURI ? (
                  <p className="text-sm text-gray-500">Loading metadata for NFT #{nft.tokenId}...</p>
                ) : (
                  <p className="text-sm text-gray-500">Metadata URI not available for NFT #{nft.tokenId}.</p>
                )}
              </div>
            ))}
          </div>
        ) : (
           userAddress && !isLoading && !infoMessage && <p className="text-center text-gray-600">No Membership NFTs found for your address: {userAddress}.</p>
        )}
      </div>
    </div>
  );
};

export default MembershipPage;
