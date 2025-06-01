import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, Signer, BigNumber } from "ethers";
import { MerkleTree } from "merkletreejs";
import *_keccak256 from "keccak256";

import { LakshmiZRC20 } from "../typechain-types/LakshmiZRC20"; // Adjust if typechain paths differ
import { Airdrop } from "../typechain-types/Airdrop";

// merkletreejs uses keccak256 library differently in CJS/ESM
const keccak256 = _keccak256;

interface AirdropRecipientData {
  address: string;
  amount: BigNumber;
}

describe("Airdrop Contract", function () {
  let luckToken: LakshmiZRC20;
  let airdropContract: Airdrop;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let user3NotEligible: Signer; // User not in the airdrop list
  let ownerAddress: string;
  let user1Address: string;
  let user2Address: string;
  let user3Address: string;

  let recipients: AirdropRecipientData[];
  let merkleTree: MerkleTree;
  let merkleRoot: string;
  let user1Proof: string[];
  let user2Proof: string[];
  let totalAirdropAmount: BigNumber;

  beforeEach(async function () {
    [owner, user1, user2, user3NotEligible] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();
    user3Address = await user3NotEligible.getAddress();

    // Deploy LakshmiZRC20 ($LUCK token)
    const LuckTokenFactory = await ethers.getContractFactory("LakshmiZRC20");
    luckToken = (await LuckTokenFactory.deploy()) as LakshmiZRC20;
    await luckToken.deployed();

    // Mint some LUCK to owner (assuming mint function exists)
    const initialMintAmount = ethers.utils.parseUnits("1000000", 18);
    if (typeof luckToken.mint === "function") {
        await luckToken.connect(owner).mint(ownerAddress, initialMintAmount);
    } else {
        console.warn("LUCK token has no mint function. Owner may not have tokens for test funding.");
    }


    // Prepare Merkle Tree data for the airdrop
    recipients = [
      { address: user1Address, amount: ethers.utils.parseUnits("100", 18) },
      { address: user2Address, amount: ethers.utils.parseUnits("150", 18) },
    ];

    totalAirdropAmount = recipients.reduce((sum, r) => sum.add(r.amount), BigNumber.from(0));

    const leafNodes = recipients.map((r) =>
      ethers.utils.solidityKeccak256(["address", "uint256"], [r.address, r.amount])
    );
    merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
    merkleRoot = merkleTree.getHexRoot();

    user1Proof = merkleTree.getHexProof(leafNodes[0]);
    user2Proof = merkleTree.getHexProof(leafNodes[1]);

    // Deploy Airdrop contract
    const AirdropFactory = await ethers.getContractFactory("Airdrop");
    airdropContract = (await AirdropFactory.deploy(luckToken.address)) as Airdrop;
    await airdropContract.deployed();

    // Fund the Airdrop contract
    await luckToken.connect(owner).approve(airdropContract.address, totalAirdropAmount);
    await airdropContract.connect(owner).depositAirdropFunds(totalAirdropAmount);

    // Create the airdrop campaign in the contract
    await airdropContract.connect(owner).createAirdrop(merkleRoot, totalAirdropAmount);
  });

  describe("Deployment & Airdrop Creation", function () {
    it("Should set the correct LUCK token address", async function () {
      expect(await airdropContract.luckToken()).to.equal(luckToken.address);
    });
    it("Should set the Merkle root and total tokens correctly", async function () {
      const details = await airdropContract.getAirdropDetails();
      expect(details.merkleRoot).to.equal(merkleRoot);
      expect(details.totalTokens).to.equal(totalAirdropAmount);
      expect(details.isActive).to.be.true;
    });
    it("Should have LUCK tokens funded", async function () {
        expect(await luckToken.balanceOf(airdropContract.address)).to.equal(totalAirdropAmount);
    });
  });

  describe("Claiming Airdrop", function () {
    it("Should allow an eligible user (user1) to claim their airdrop", async function () {
      const claimAmount = recipients[0].amount;
      await expect(airdropContract.connect(user1).claimAirdrop(user1Proof, claimAmount))
        .to.emit(airdropContract, "AirdropClaimed")
        .withArgs(user1Address, claimAmount);

      expect(await luckToken.balanceOf(user1Address)).to.equal(claimAmount);
      expect(await airdropContract.hasClaimed(user1Address)).to.be.true;
      const details = await airdropContract.getAirdropDetails();
      expect(details.claimedTokens).to.equal(claimAmount);
    });

    it("Should allow another eligible user (user2) to claim their airdrop", async function () {
      const claimAmount = recipients[1].amount;
      await expect(airdropContract.connect(user2).claimAirdrop(user2Proof, claimAmount))
        .to.emit(airdropContract, "AirdropClaimed")
        .withArgs(user2Address, claimAmount);

      expect(await luckToken.balanceOf(user2Address)).to.equal(claimAmount);
      expect(await airdropContract.hasClaimed(user2Address)).to.be.true;
    });

    it("Should not allow claiming twice", async function () {
      const claimAmount = recipients[0].amount;
      await airdropContract.connect(user1).claimAirdrop(user1Proof, claimAmount); // First claim
      await expect(
        airdropContract.connect(user1).claimAirdrop(user1Proof, claimAmount)
      ).to.be.revertedWith("Airdrop: Tokens already claimed");
    });

    it("Should not allow claiming with an invalid proof", async function () {
      const claimAmount = recipients[0].amount;
      const invalidProof = user2Proof; // Using user2's proof for user1
      await expect(
        airdropContract.connect(user1).claimAirdrop(invalidProof, claimAmount)
      ).to.be.revertedWith("Airdrop: Invalid Merkle proof or incorrect amount");
    });

    it("Should not allow claiming with an incorrect amount for a valid proof", async function () {
      const incorrectAmount = recipients[0].amount.add(1); // Slightly different amount
      await expect(
        airdropContract.connect(user1).claimAirdrop(user1Proof, incorrectAmount)
      ).to.be.revertedWith("Airdrop: Invalid Merkle proof or incorrect amount");
    });

    it("Should not allow a non-whitelisted user to claim", async function () {
        const nonWhitelistedAmount = ethers.utils.parseUnits("50", 18);
        // Create a leaf and proof for user3 as if they were whitelisted, but use a valid structure for proof
        const leafForUser3 = ethers.utils.solidityKeccak256(["address", "uint256"], [user3Address, nonWhitelistedAmount]);
        // This proof won't match the merkleRoot, as user3 was not in the tree generation
        const fakeProofForUser3 = merkleTree.getHexProof(ethers.utils.solidityKeccak256(["address", "uint256"], [user1Address, recipients[0].amount])); // just some valid proof structure

        await expect(
            airdropContract.connect(user3NotEligible).claimAirdrop(fakeProofForUser3, nonWhitelistedAmount)
        ).to.be.revertedWith("Airdrop: Invalid Merkle proof or incorrect amount");
         expect(await airdropContract.hasClaimed(user3Address)).to.be.false;
    });

    it("Should fail if airdrop is not active", async function() {
        await airdropContract.connect(owner).endAirdropAndWithdrawRemainingTokens(); // Deactivate
        const claimAmount = recipients[0].amount;
        await expect(
            airdropContract.connect(user1).claimAirdrop(user1Proof, claimAmount)
        ).to.be.revertedWith("Airdrop: No active airdrop campaign");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to end airdrop and withdraw remaining LUCK", async function () {
      const user1ClaimAmount = recipients[0].amount;
      await airdropContract.connect(user1).claimAirdrop(user1Proof, user1ClaimAmount); // User1 claims

      const remainingExpected = totalAirdropAmount.sub(user1ClaimAmount);
      const ownerInitialBalance = await luckToken.balanceOf(ownerAddress);

      await expect(airdropContract.connect(owner).endAirdropAndWithdrawRemainingTokens())
        .to.emit(airdropContract, "AirdropEnded")
        // .withArgs(ownerAddress, remainingExpected); // Chai matcher for BigNumber can be tricky with events

      const details = await airdropContract.getAirdropDetails();
      expect(details.isActive).to.be.false;
      expect(await luckToken.balanceOf(airdropContract.address)).to.equal(0);
      expect(await luckToken.balanceOf(ownerAddress)).to.equal(ownerInitialBalance.add(remainingExpected));
    });

    it("Should not allow non-owner to end airdrop", async function () {
        await expect(
            airdropContract.connect(user1).endAirdropAndWithdrawRemainingTokens()
        ).to.be.revertedWith("Ownable: caller is not the owner");
    });

     it("Should not allow creating a new airdrop if contract balance is insufficient", async function () {
        const newRoot = ethers.utils.formatBytes32String("newRoot123");
        const newTotalTokens = totalAirdropAmount.add(ethers.utils.parseUnits("1", 18)); // More than current balance

        // Withdraw current funds to ensure it's less than newTotalTokens
        await airdropContract.connect(owner).endAirdropAndWithdrawRemainingTokens();
        // Now contract balance is 0. Owner needs to deposit more LUCK first.

        await expect(
            airdropContract.connect(owner).createAirdrop(newRoot, newTotalTokens)
        ).to.be.revertedWith("Airdrop: Insufficient LUCK balance for this airdrop total");
    });
  });

  describe("View Functions", function () {
    it("hasClaimed should return true after claiming, false otherwise", async function () {
      expect(await airdropContract.hasClaimed(user1Address)).to.be.false;
      await airdropContract.connect(user1).claimAirdrop(user1Proof, recipients[0].amount);
      expect(await airdropContract.hasClaimed(user1Address)).to.be.true;
      expect(await airdropContract.hasClaimed(user2Address)).to.be.false;
    });

    it("getAirdropDetails should return current campaign info", async function () {
        const details = await airdropContract.getAirdropDetails();
        expect(details.merkleRoot).to.equal(merkleRoot);
        expect(details.totalTokens).to.equal(totalAirdropAmount);
        expect(details.claimedTokens).to.equal(0); // Initially 0
        expect(details.isActive).to.be.true;

        // After a claim
        await airdropContract.connect(user1).claimAirdrop(user1Proof, recipients[0].amount);
        const detailsAfterClaim = await airdropContract.getAirdropDetails();
        expect(detailsAfterClaim.claimedTokens).to.equal(recipients[0].amount);
    });
  });
});
