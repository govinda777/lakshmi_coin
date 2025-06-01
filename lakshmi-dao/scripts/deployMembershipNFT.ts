import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const nftName = "Lakshmi DAO Membership";
  const nftSymbol = "LKM";
  // Example initial base URI. This should point to where your metadata files will be hosted.
  // Ensure it ends with a slash if token IDs are directly appended.
  const initialBaseURI = "https://api.example.com/nfts/lakshmi-membership/";
  // Or for IPFS: "ipfs://YOUR_METADATA_FOLDER_CID/"

  console.log(`Deploying MembershipNFT with Name: "${nftName}", Symbol: "${nftSymbol}", BaseURI: "${initialBaseURI}"`);

  const MembershipNFTFactory = await ethers.getContractFactory("MembershipNFT");
  const membershipNFT = await MembershipNFTFactory.deploy(nftName, nftSymbol, initialBaseURI);
  await membershipNFT.deployed();

  console.log("MembershipNFT deployed to:", membershipNFT.address);
  console.log("MembershipNFT owner (deployer):", await membershipNFT.owner());
  console.log("MembershipNFT name:", await membershipNFT.name());
  console.log("MembershipNFT symbol:", await membershipNFT.symbol());
  console.log("MembershipNFT initial baseURI (though not directly readable, it's set):", initialBaseURI); // _baseTokenURI is private
  // To verify baseURI, you might need a getter or check tokenURI output.
  // Let's try minting one and checking its tokenURI.

  try {
    // Mint a test NFT to the deployer
    console.log("\nAttempting to mint a test NFT to the deployer...");
    const mintTx = await membershipNFT.connect(deployer).adminMint(deployer.address);
    const receipt = await mintTx.wait();

    // Find tokenId from event (if your contract emits it like in the example MembershipNFT.sol)
    // Or, if using OZ's counter, it would be 1 for the first mint.
    let tokenId = BigInt(0); // Default
    const mintEvent = receipt.events?.find(event => event.event === 'AdminMint');
    if (mintEvent && mintEvent.args) {
        tokenId = mintEvent.args.tokenId;
        console.log(`Successfully minted NFT with Token ID: ${tokenId} to ${deployer.address}`);
    } else {
        // Fallback if event not found or structured differently - try with tokenId 1 if it's the first.
        // This depends on how _tokenIdCounter is initialized and incremented.
        // The provided MembershipNFT.sol increments first, then uses current(), so first ID is 1.
        tokenId = BigInt(1);
        console.log(`Mint transaction successful. Assuming Token ID: ${tokenId} for the first mint.`);
    }


    if (tokenId > 0) {
        const tokenURIFull = await membershipNFT.tokenURI(tokenId);
        console.log(`Token URI for NFT #${tokenId}: ${tokenURIFull}`);
        if (tokenURIFull !== `${initialBaseURI}${tokenId.toString()}`) {
             console.warn(`Warning: Constructed tokenURI ("${tokenURIFull}") does not match expected pattern ("${initialBaseURI}${tokenId.toString()}"). Check contract logic.`);
        }
    }

    console.log("\nMembershipNFT deployment and initial mint test complete.");
    console.log("Next steps: ");
    console.log("1. Prepare your NFT metadata files (JSON) according to the structure.");
    console.log("2. Upload metadata to IPFS or your chosen hosting solution.");
    console.log(`3. Update the baseURI in the contract if needed using setBaseURI (current: "${initialBaseURI}").`);
    console.log("   Example: await membershipNFT.connect(deployer).setBaseURI(\"ipfs://NEW_CID_HASH/\");");

  } catch (error) {
    console.error("\nError during initial mint test or tokenURI check:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
