import { ethers } from "ethers"; // Using ethers v5 for abi.encodePacked and keccak256
import { MerkleTree } from "merkletreejs";
import *_keccak256 from "keccak256"; // merkletreejs uses keccak256 library
import fs from "fs";
import path from "path";

// Make sure keccak256 is treated as a function for CJS/ESM interop with merkletreejs
const keccak256 = _keccak256;

interface AirdropRecipient {
  address: string;
  amount: string; // Use string for big numbers (uint256)
}

// Example: Load data from a JSON file
// The JSON file should be an array of AirdropRecipient objects
// e.g., [{"address": "0x...", "amount": "100000000000000000000"}, ...]
const dataFilePath = path.join(__dirname, "airdrop-list.json");

function generateMerkleTree() {
  let recipients: AirdropRecipient[];
  try {
    const fileContent = fs.readFileSync(dataFilePath, "utf-8");
    recipients = JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading or parsing airdrop data from ${dataFilePath}:`, error);
    // Fallback to sample data if file not found or invalid, for demonstration
    console.log("Using sample data for Merkle tree generation as fallback.");
    recipients = [
      { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", amount: ethers.utils.parseUnits("100", 18).toString() }, // Sample Hardhat address 1
      { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", amount: ethers.utils.parseUnits("150", 18).toString() }, // Sample Hardhat address 2
      { address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", amount: ethers.utils.parseUnits("200", 18).toString() }, // Sample Hardhat address 3
      // Add more recipients as needed for testing
    ];
  }

  if (!recipients || recipients.length === 0) {
    console.error("No recipient data found. Exiting.");
    return;
  }

  console.log(`Processing ${recipients.length} recipients...`);

  // 1. Create leaf nodes
  const leafNodes = recipients.map((recipient) => {
    // Ensure address is a valid Ethereum address
    if (!ethers.utils.isAddress(recipient.address)) {
        throw new Error(`Invalid Ethereum address found: ${recipient.address}`);
    }
    // Ensure amount is a non-negative integer string
    try {
        ethers.BigNumber.from(recipient.amount); // Validates if it's a number-like string
        if (ethers.BigNumber.from(recipient.amount).isNegative()) {
            throw new Error("Amount cannot be negative.");
        }
    } catch (e) {
        throw new Error(`Invalid amount for address ${recipient.address}: ${recipient.amount}. Must be a non-negative integer string. Error: ${e}`);
    }

    // Leaf is keccak256(abi.encodePacked(address, amount))
    return ethers.utils.solidityKeccak256(["address", "uint256"], [recipient.address, recipient.amount]);
  });

  // 2. Create Merkle Tree
  const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });

  // 3. Get Merkle Root
  const merkleRoot = merkleTree.getHexRoot();
  console.log("\nMerkle Root (Hex):");
  console.log(merkleRoot);

  // 4. Generate proofs for each recipient and store them (optional, for distribution)
  const proofs: { [address: string]: { amount: string; proof: string[] } } = {};
  recipients.forEach((recipient, index) => {
    const leaf = leafNodes[index];
    const proof = merkleTree.getHexProof(leaf);
    proofs[recipient.address] = {
      amount: recipient.amount,
      proof: proof,
    };
  });

  // Output proofs to a file or console
  const proofsFilePath = path.join(__dirname, "airdrop-proofs.json");
  fs.writeFileSync(proofsFilePath, JSON.stringify(proofs, null, 2));
  console.log(`\nProofs generated and saved to: ${proofsFilePath}`);

  // For manual testing, print one proof:
  if (recipients.length > 0) {
    const sampleAddress = recipients[0].address;
    console.log(`\nExample Proof for ${sampleAddress} (amount: ${proofs[sampleAddress].amount}):`);
    console.log(proofs[sampleAddress].proof);
  }

  console.log("\n--- How to use this in your tests/deployment ---");
  console.log("1. Merkle Root: Use the Merkle Root above when deploying/configuring your Airdrop.sol contract.");
  console.log("2. Proofs: For each user claiming, they will need their specific address, amount, and the generated proof array.");
  console.log("   The leaf for contract verification is: keccak256(abi.encodePacked(userAddress, amount))");
  console.log("   The MerkleProof.verify function in Solidity will use this leaf and the proof array against the stored Merkle Root.\n");
}

// Create a dummy airdrop-list.json if it doesn't exist for the script to run with sample data
if (!fs.existsSync(dataFilePath)) {
    const sampleRecipients = [
      { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", amount: ethers.utils.parseUnits("100", 18).toString() },
      { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", amount: ethers.utils.parseUnits("150", 18).toString() },
    ];
    fs.writeFileSync(dataFilePath, JSON.stringify(sampleRecipients, null, 2));
    console.log(`Created sample ${dataFilePath} for demonstration.`);
}


try {
    generateMerkleTree();
} catch (error) {
    console.error("Error during Merkle tree generation script:", error);
}
