import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, Signer } from "ethers"; // Import Contract and Signer types
import { LakshmiZRC20 } from "../typechain-types/LakshmiZRC20"; // Adjust path if necessary
import { Missions } from "../typechain-types/Missions"; // Adjust path if necessary

describe("Missions Contract", function () {
  let luckToken: LakshmiZRC20;
  let missionsContract: Missions;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let ownerAddress: string;
  let user1Address: string;
  let user2Address: string;

  const initialLuckSupply = ethers.utils.parseUnits("1000000", 18); // 1 million LUCK

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();

    // Deploy LakshmiZRC20 ($LUCK token)
    const LuckTokenFactory = await ethers.getContractFactory("LakshmiZRC20");
    // Assuming constructor for LakshmiZRC20 might take initial supply or mint to deployer
    // For this test, let's assume it mints to the deployer (owner)
    luckToken = (await LuckTokenFactory.deploy()) as LakshmiZRC20; // Or pass initialSupply if constructor expects it
    await luckToken.deployed();

    // Manually mint tokens to owner if constructor doesn't, or ensure supply exists
    // This depends on LakshmiZRC20.sol. If it has `mint(address, amount)`:
    if (typeof luckToken.mint === "function") {
        await luckToken.connect(owner).mint(ownerAddress, initialLuckSupply);
    } else {
        // If no mint function or it's not standard, ensure owner has tokens some other way for tests
        // This might involve a different constructor for LakshmiZRC20 for testing
        console.warn("LakshmiZRC20 mint function not found or owner has no initial supply. Assuming owner has LUCK tokens through other means for tests.");
        // As a fallback, try a common pattern if it exists:
        // await luckToken.transfer(ownerAddress, initialLuckSupply); // If tokens are minted to contract first
    }


    // Deploy Missions contract
    const MissionsFactory = await ethers.getContractFactory("Missions");
    missionsContract = (await MissionsFactory.deploy(luckToken.address)) as Missions;
    await missionsContract.deployed();

    // Transfer some LUCK tokens to user1 for testing purposes if needed, or have them earn it
    // For now, owner will fund the Missions contract
  });

  describe("Deployment", function () {
    it("Should set the right owner for Missions contract", async function () {
      expect(await missionsContract.owner()).to.equal(ownerAddress);
    });

    it("Should set the correct LUCK token address", async function () {
      expect(await missionsContract.luckToken()).to.equal(luckToken.address);
    });

    it("Owner should have LUCK tokens", async function () {
        const ownerBalance = await luckToken.balanceOf(ownerAddress);
        // This check depends on how LakshmiZRC20 mints initial supply
        // For now, we check if it's greater than 0, assuming minting happened.
        expect(ownerBalance).to.be.gt(0, "Owner should have LUCK tokens after deployment and minting");
    });
  });

  describe("Mission Creation", function () {
    const missionName = "Test Mission 1";
    const missionDesc = "Complete task X";
    const rewardAmount = ethers.utils.parseUnits("100", 18); // 100 LUCK

    it("Should allow owner to create a mission", async function () {
      await expect(
        missionsContract.connect(owner).createMission(missionName, missionDesc, rewardAmount)
      ).to.emit(missionsContract, "MissionCreated")
        .withArgs(1, missionName, missionDesc, rewardAmount, ownerAddress);

      const mission = await missionsContract.getMission(1);
      expect(mission.name).to.equal(missionName);
      expect(mission.rewardAmount).to.equal(rewardAmount);
      expect(mission.isActive).to.be.true;
    });

    it("Should not allow non-owner to create a mission", async function () {
      await expect(
        missionsContract.connect(user1).createMission(missionName, missionDesc, rewardAmount)
      ).to.be.revertedWith("Missions: Caller is not the owner");
    });

    it("Should require mission name", async function () {
      await expect(
        missionsContract.connect(owner).createMission("", missionDesc, rewardAmount)
      ).to.be.revertedWith("Missions: Name cannot be empty");
    });

    it("Should require reward amount > 0", async function () {
      await expect(
        missionsContract.connect(owner).createMission(missionName, missionDesc, 0)
      ).to.be.revertedWith("Missions: Reward amount must be greater than 0");
    });
  });

  describe("Mission Completion and Reward Claiming", function () {
    const missionName = "Test Mission for Claim";
    const missionDesc = "Claim test";
    const rewardAmount = ethers.utils.parseUnits("100", 18);
    const missionId = 1;

    beforeEach(async function () {
      // Create a mission
      await missionsContract.connect(owner).createMission(missionName, missionDesc, rewardAmount);

      // Fund the Missions contract with LUCK tokens
      const totalRewardFund = ethers.utils.parseUnits("500", 18);
      await luckToken.connect(owner).approve(missionsContract.address, totalRewardFund);
      await missionsContract.connect(owner).depositRewardTokens(totalRewardFund);
    });

    it("Should allow a user to complete a mission (emit event)", async function () {
        await expect(missionsContract.connect(user1).completeMission(missionId))
            .to.emit(missionsContract, "MissionCompleted")
            .withArgs(missionId, user1Address);
    });

    it("Should allow a user to claim a reward for an active mission", async function () {
      const initialUserBalance = await luckToken.balanceOf(user1Address);

      // User "completes" (signals intent or fulfills off-chain criteria)
      // await missionsContract.connect(user1).completeMission(missionId); // Optional step depending on flow

      await expect(missionsContract.connect(user1).claimReward(missionId))
        .to.emit(missionsContract, "RewardClaimed")
        .withArgs(missionId, user1Address, rewardAmount);

      const finalUserBalance = await luckToken.balanceOf(user1Address);
      expect(finalUserBalance.sub(initialUserBalance)).to.equal(rewardAmount);
      expect(await missionsContract.hasClaimedReward(missionId, user1Address)).to.be.true;
    });

    it("Should not allow claiming reward if mission is not active", async function () {
      await missionsContract.connect(owner).toggleMissionActiveStatus(missionId); // Deactivate
      await expect(
        missionsContract.connect(user1).claimReward(missionId)
      ).to.be.revertedWith("Missions: Mission is not active");
    });

    it("Should not allow claiming reward twice", async function () {
      await missionsContract.connect(user1).claimReward(missionId); // First claim
      await expect(
        missionsContract.connect(user1).claimReward(missionId)
      ).to.be.revertedWith("Missions: Reward already claimed");
    });

    it("Should not allow claiming reward if contract has insufficient LUCK balance", async function () {
        // Create a new mission with a large reward
        const largeReward = ethers.utils.parseUnits("1000", 18); // More than contract balance
        await missionsContract.connect(owner).createMission("High Reward Mission", "desc", largeReward);
        const newMissionId = 2;

        // User1's balance before attempting claim
        const initialUserBalance = await luckToken.balanceOf(user1Address);

        await expect(
            missionsContract.connect(user1).claimReward(newMissionId)
        ).to.be.revertedWith("Missions: Insufficient LUCK tokens in contract for reward");

        // Ensure user's balance did not change
        expect(await luckToken.balanceOf(user1Address)).to.equal(initialUserBalance);
    });
  });

  describe("Mission Management", function () {
    beforeEach(async function() {
        await missionsContract.connect(owner).createMission("Mission A", "Desc A", ethers.utils.parseUnits("10", 18));
        await missionsContract.connect(owner).createMission("Mission B", "Desc B", ethers.utils.parseUnits("20", 18));
    });

    it("Should return correct mission details with getMission", async function () {
        const mission = await missionsContract.getMission(1);
        expect(mission.name).to.equal("Mission A");
        expect(mission.rewardAmount).to.equal(ethers.utils.parseUnits("10", 18));
    });

    it("Should return all mission IDs with getAllMissionIds", async function () {
        const ids = await missionsContract.getAllMissionIds();
        expect(ids.length).to.equal(2);
        expect(ids[0]).to.equal(1);
        expect(ids[1]).to.equal(2);
    });

    it("Should return all missions with getAllMissions", async function () {
        const allMissions = await missionsContract.getAllMissions();
        expect(allMissions.length).to.equal(2);
        expect(allMissions[0].name).to.equal("Mission A");
        expect(allMissions[1].name).to.equal("Mission B");
    });

    it("Should allow owner to toggle mission active status", async function () {
        await missionsContract.connect(owner).toggleMissionActiveStatus(1);
        let mission = await missionsContract.getMission(1);
        expect(mission.isActive).to.be.false;

        await missionsContract.connect(owner).toggleMissionActiveStatus(1);
        mission = await missionsContract.getMission(1);
        expect(mission.isActive).to.be.true;
    });

    it("Should not allow non-owner to toggle mission active status", async function () {
        await expect(
            missionsContract.connect(user1).toggleMissionActiveStatus(1)
        ).to.be.revertedWith("Missions: Caller is not the owner");
    });
  });

  describe("Token Deposits", function() {
    it("Should allow owner to deposit reward tokens", async function() {
        const depositAmount = ethers.utils.parseUnits("200", 18);
        await luckToken.connect(owner).approve(missionsContract.address, depositAmount);

        const initialContractLuckBalance = await luckToken.balanceOf(missionsContract.address);

        await expect(missionsContract.connect(owner).depositRewardTokens(depositAmount))
            .to.emit(missionsContract, "FundsDepositedToContract")
            .withArgs(ownerAddress, depositAmount);

        const finalContractLuckBalance = await luckToken.balanceOf(missionsContract.address);
        expect(finalContractLuckBalance.sub(initialContractLuckBalance)).to.equal(depositAmount);
    });

    it("Should not allow non-owner to deposit tokens", async function() {
        const depositAmount = ethers.utils.parseUnits("100", 18);
        await luckToken.connect(owner).approve(missionsContract.address, depositAmount); // Owner approves
        // User1 attempts to call depositRewardTokens (but transferFrom will fail if user1 is not owner of tokens)
        // More accurately, the onlyAdmin modifier should stop it first.
         await expect(
            missionsContract.connect(user1).depositRewardTokens(depositAmount)
        ).to.be.revertedWith("Missions: Caller is not the owner");
    });
  });

});
