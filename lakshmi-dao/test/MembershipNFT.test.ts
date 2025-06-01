import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, Signer, BigNumber } from "ethers";
import { MembershipNFT } from "../typechain-types/MembershipNFT"; // Adjust if typechain paths differ

describe("MembershipNFT Contract", function () {
  let membershipNFT: MembershipNFT;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let ownerAddress: string;
  let user1Address: string;
  let user2Address: string;

  const nftName = "Lakshmi DAO Membership Test";
  const nftSymbol = "LKMT";
  const initialBaseURI = "https://api.example.com/nfts/lakshmi-test/";
  const maxSupply = 5; // Using a small maxSupply for testing

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();

    const MembershipNFTFactory = await ethers.getContractFactory("MembershipNFT");
    membershipNFT = (await MembershipNFTFactory.deploy(nftName, nftSymbol, initialBaseURI)) as MembershipNFT;
    await membershipNFT.deployed();

    // Override maxSupply for testing from the deployed contract if needed, or ensure constructor sets it.
    // The current MembershipNFT.sol has a public 'maxSupply' state variable initialized.
    // If we needed to change it per test, we'd need a setter or deploy a new contract.
    // For this test, we'll assume the `maxSupply` in the contract matches `maxSupply` here.
    // Let's update the contract's maxSupply to our test value if there's a setter,
    // or ensure the test contract is deployed with this specific max supply.
    // The current contract version has it hardcoded, so we test against that.
    // For this test suite, let's assume the constructor could take maxSupply or it's set as public for test.
    // The provided contract has `maxSupply = 10000`. We'll test against that or use a more flexible contract for testing.
    // For this test, I'll adapt to the contract's hardcoded maxSupply if no setter.
    // The provided MembershipNFT.sol has `maxSupply = 10000`. We'll use this.
    // To test maxSupply effectively, it's better if `maxSupply` is a constructor arg or settable.
    // Let's assume for this test file we are testing the provided MembershipNFT.sol as is.
    // So, the `maxSupply` variable here (5) is just for local test logic, not contract's actual max.
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await membershipNFT.name()).to.equal(nftName);
      expect(await membershipNFT.symbol()).to.equal(nftSymbol);
    });

    it("Should set the owner correctly", async function () {
      expect(await membershipNFT.owner()).to.equal(ownerAddress);
    });

    it("Should initialize with the correct baseURI (implicitly via tokenURI check)", async function () {
        await membershipNFT.connect(owner).adminMint(user1Address); // Mint token 1
        const expectedTokenURI = `${initialBaseURI}1`;
        expect(await membershipNFT.tokenURI(1)).to.equal(expectedTokenURI);
    });
  });

  describe("Minting (adminMint)", function () {
    it("Should allow owner to mint NFTs", async function () {
      await expect(membershipNFT.connect(owner).adminMint(user1Address))
        .to.emit(membershipNFT, "AdminMint")
        .withArgs(user1Address, 1); // First token ID is 1
      expect(await membershipNFT.ownerOf(1)).to.equal(user1Address);
      expect(await membershipNFT.balanceOf(user1Address)).to.equal(1);
      expect(await membershipNFT.totalSupply()).to.equal(1);
    });

    it("Should not allow non-owner to mint NFTs", async function () {
      await expect(
        membershipNFT.connect(user1).adminMint(user2Address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should increment token IDs sequentially", async function () {
      await membershipNFT.connect(owner).adminMint(user1Address); // ID 1
      await membershipNFT.connect(owner).adminMint(user2Address); // ID 2
      expect(await membershipNFT.ownerOf(2)).to.equal(user2Address);
    });

    it("Should not allow minting to the zero address", async function () {
        await expect(
            membershipNFT.connect(owner).adminMint(ethers.constants.AddressZero)
        ).to.be.revertedWith("ERC721: mint to the zero address");
    });

    it("Should respect maxSupply", async function () {
        const contractMaxSupply = (await membershipNFT.maxSupply()).toNumber(); // Get from contract
        // Mint up to maxSupply - 1
        for (let i = 0; i < contractMaxSupply -1; i++) {
            await membershipNFT.connect(owner).adminMint(ownerAddress); // Minting to owner for simplicity
        }
        // Mint the last one
        await membershipNFT.connect(owner).adminMint(ownerAddress);
        expect(await membershipNFT.totalSupply()).to.equal(contractMaxSupply);

        // Try to mint one more
        await expect(
            membershipNFT.connect(owner).adminMint(ownerAddress)
        ).to.be.revertedWith("MembershipNFT: Max supply reached");
    });
  });

  describe("Token URI", function () {
    beforeEach(async function() {
        await membershipNFT.connect(owner).adminMint(user1Address); // Token ID 1
    });

    it("Should return the correct token URI based on baseURI and token ID", async function () {
      const expectedTokenURI = `${initialBaseURI}1`;
      expect(await membershipNFT.tokenURI(1)).to.equal(expectedTokenURI);
    });

    it("Should allow owner to set a new base URI", async function () {
      const newBaseURI = "ipfs://newhash/";
      await expect(membershipNFT.connect(owner).setBaseURI(newBaseURI))
        .to.emit(membershipNFT, "BaseURISet")
        .withArgs(newBaseURI, ownerAddress);

      const expectedTokenURI = `${newBaseURI}1`;
      expect(await membershipNFT.tokenURI(1)).to.equal(expectedTokenURI);
    });

    it("Should handle empty base URI by returning tokenId as string (as per current contract)", async function () {
        await membershipNFT.connect(owner).setBaseURI("");
        expect(await membershipNFT.tokenURI(1)).to.equal("1");
    });

    it("Should revert if trying to get URI for non-existent token", async function () {
        await expect(membershipNFT.tokenURI(999)).to.be.revertedWith("ERC721: invalid token ID");
    });
  });

  describe("ERC721Enumerable features", function () {
    beforeEach(async function() {
        await membershipNFT.connect(owner).adminMint(user1Address); // Token ID 1
        await membershipNFT.connect(owner).adminMint(user2Address); // Token ID 2
        await membershipNFT.connect(owner).adminMint(user1Address); // Token ID 3
    });

    it("Should return the correct total supply", async function () {
      expect(await membershipNFT.totalSupply()).to.equal(3);
    });

    it("Should return the correct token by index", async function () {
      expect(await membershipNFT.tokenByIndex(0)).to.equal(1);
      expect(await membershipNFT.tokenByIndex(1)).to.equal(2);
      expect(await membershipNFT.tokenByIndex(2)).to.equal(3);
    });

    it("Should return the correct token of owner by index", async function () {
      expect(await membershipNFT.tokenOfOwnerByIndex(user1Address, 0)).to.equal(1);
      expect(await membershipNFT.tokenOfOwnerByIndex(user1Address, 1)).to.equal(3);
      expect(await membershipNFT.balanceOf(user1Address)).to.equal(2);
      expect(await membershipNFT.tokenOfOwnerByIndex(user2Address, 0)).to.equal(2);
      expect(await membershipNFT.balanceOf(user2Address)).to.equal(1);
    });
  });

  describe("Transfers (Standard ERC721 Behavior)", function() {
    let tokenId: BigNumber;
    beforeEach(async function() {
        const tx = await membershipNFT.connect(owner).adminMint(user1Address);
        const receipt = await tx.wait();
        const mintEvent = receipt.events?.find(event => event.event === 'AdminMint');
        tokenId = mintEvent!.args!.tokenId; // Should be 1
    });

    it("Should allow owner of NFT to transfer it", async function() {
        await membershipNFT.connect(user1).transferFrom(user1Address, user2Address, tokenId);
        expect(await membershipNFT.ownerOf(tokenId)).to.equal(user2Address);
        expect(await membershipNFT.balanceOf(user1Address)).to.equal(0);
        expect(await membershipNFT.balanceOf(user2Address)).to.equal(1);
    });

    it("Should allow approved address to transfer NFT", async function() {
        await membershipNFT.connect(user1).approve(user2Address, tokenId);
        await membershipNFT.connect(user2).transferFrom(user1Address, user2Address, tokenId);
        expect(await membershipNFT.ownerOf(tokenId)).to.equal(user2Address);
    });

    it("Should allow operator to transfer NFT", async function() {
        await membershipNFT.connect(user1).setApprovalForAll(ownerAddress, true); // User1 approves owner as operator
        await membershipNFT.connect(owner).transferFrom(user1Address, user2Address, tokenId);
        expect(await membershipNFT.ownerOf(tokenId)).to.equal(user2Address);
    });
  });
});
