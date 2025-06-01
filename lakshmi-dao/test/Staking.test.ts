import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Contract, Signer, BigNumber } from "ethers"; // Import types
import { LakshmiZRC20 } from "../typechain-types/LakshmiZRC20"; // Adjust if typechain generates different paths
import { Staking } from "../typechain-types/Staking";

describe("Staking Contract", function () {
  let luckToken: LakshmiZRC20;
  let stakingContract: Staking;
  let owner: Signer;
  let staker1: Signer;
  let staker2: Signer;
  let ownerAddress: string;
  let staker1Address: string;
  let staker2Address: string;
  let initialLuckSupply: BigNumber; // Moved to beforeEach
  const rewardRateForTests = BigNumber.from("3170979198"); // Approx 10% APY (0.000000003170979198 LUCK per LUCK per second)
  const REWARD_PRECISION = ethers.constants.WeiPerEther; // 1e18

  async function increaseTime(duration: number) {
    await network.provider.send("evm_increaseTime", [duration]);
    await network.provider.send("evm_mine");
  }

  beforeEach(async function () {
    [owner, staker1, staker2] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    staker1Address = await staker1.getAddress();
    staker2Address = await staker2.getAddress();
    initialLuckSupply = ethers.utils.parseUnits("10000000", 18); // Initialize here
    const chainId = (await ethers.provider.getNetwork()).chainId;

    // Deploy LakshmiZRC20 ($LUCK token)
    const LuckTokenFactory = await ethers.getContractFactory("LakshmiZRC20");
    luckToken = (await LuckTokenFactory.deploy(
        initialLuckSupply,
        ownerAddress, // treasuryAddress
        chainId,
        2000000, // gasLimit
        ethers.constants.AddressZero, // systemContract
        ethers.constants.AddressZero  // gatewayAddress
    )) as LakshmiZRC20;
    await luckToken.deployed();

    // Initial supply is minted to owner (deployer) in LakshmiZRC20 constructor.

    // Distribute some LUCK to stakers for testing
    await luckToken.connect(owner).transfer(staker1Address, ethers.utils.parseUnits("10000", 18));
    await luckToken.connect(owner).transfer(staker2Address, ethers.utils.parseUnits("10000", 18));

    // Deploy Staking contract
    const StakingFactory = await ethers.getContractFactory("Staking");
    stakingContract = (await StakingFactory.deploy(luckToken.address)) as Staking;
    await stakingContract.deployed();

    // Set a predictable reward rate for testing
    await stakingContract.connect(owner).setRewardRate(rewardRateForTests);

    // Fund the staking contract with LUCK for rewards
    const rewardPoolAmount = ethers.utils.parseUnits("1000000", 18); // 1 million LUCK for rewards
    await luckToken.connect(owner).approve(stakingContract.address, rewardPoolAmount);
    await stakingContract.connect(owner).depositRewardFunds(rewardPoolAmount);
  });

  describe("Deployment & Configuration", function () {
    it("Should set the correct LUCK token address", async function () {
      expect(await stakingContract.luckToken()).to.equal(luckToken.address);
    });
    it("Should set the owner correctly", async function () {
      expect(await stakingContract.owner()).to.equal(ownerAddress);
    });
    it("Should have reward funds deposited", async function () {
      const balance = await luckToken.balanceOf(stakingContract.address);
      expect(balance).to.be.gt(0);
    });
    it("Should allow owner to set reward rate", async function () {
        const newRate = rewardRateForTests.add(100);
        await stakingContract.connect(owner).setRewardRate(newRate);
        expect(await stakingContract.rewardRatePerSecond()).to.equal(newRate);
    });
  });

  describe("Staking", function () {
    const stakeAmount = ethers.utils.parseUnits("1000", 18); // 1000 LUCK

    it("Should allow a user to stake LUCK tokens", async function () {
      await luckToken.connect(staker1).approve(stakingContract.address, stakeAmount);

      const initialTotalStaked = await stakingContract.totalStaked();
      const initialStakerStake = (await stakingContract.getStakeInfo(staker1Address)).currentStake;

      await expect(stakingContract.connect(staker1).stake(stakeAmount))
        .to.emit(stakingContract, "Staked")
        .withArgs(staker1Address, stakeAmount);

      const finalTotalStaked = await stakingContract.totalStaked();
      const finalStakerStake = (await stakingContract.getStakeInfo(staker1Address)).currentStake;

      expect(finalTotalStaked.sub(initialTotalStaked)).to.equal(stakeAmount);
      expect(finalStakerStake.sub(initialStakerStake)).to.equal(stakeAmount);
      expect(await luckToken.balanceOf(stakingContract.address)).to.contain(stakeAmount.add(ethers.utils.parseUnits("1000000", 18))); // Initial deposit + stake
    });

    it("Should require approval before staking", async function () {
      await expect(stakingContract.connect(staker1).stake(stakeAmount)).to.be.revertedWith(
        "ERC20: transfer amount exceeds allowance" // Or similar based on IERC20
      );
    });
     it("Should not allow staking 0 tokens", async function () {
      await expect(stakingContract.connect(staker1).stake(0)).to.be.revertedWith(
        "Staking: Cannot stake 0 tokens"
      );
    });
  });

  describe("Reward Calculation", function () {
    const stakeAmount = ethers.utils.parseUnits("1000", 18); // 1000 LUCK
    const oneYearInSeconds = 365 * 24 * 60 * 60;

    it("Should calculate rewards correctly over time", async function () {
      await luckToken.connect(staker1).approve(stakingContract.address, stakeAmount);
      await stakingContract.connect(staker1).stake(stakeAmount);

      const stakeInfoBefore = await stakingContract.getStakeInfo(staker1Address);
      expect(stakeInfoBefore.currentReward).to.equal(0);

      await increaseTime(oneYearInSeconds);

      const calculatedReward = await stakingContract.calculateReward(staker1Address);
      // Expected = amount * time * rate / precision
      const expectedReward = stakeAmount.mul(oneYearInSeconds).mul(rewardRateForTests).div(REWARD_PRECISION);

      expect(calculatedReward).to.be.closeTo(expectedReward, ethers.utils.parseUnits("0.1", 18)); // Allow small deviation due to block timing
    });

    it("Accrued rewards should update on next stake", async function() {
        await luckToken.connect(staker1).approve(stakingContract.address, stakeAmount.mul(2));
        await stakingContract.connect(staker1).stake(stakeAmount);

        await increaseTime(oneYearInSeconds / 2); // Half a year

        // Stake more
        await stakingContract.connect(staker1).stake(stakeAmount);

        const stakeInfo = await stakingContract.getStakeInfo(staker1Address);
        const expectedRewardForFirstPeriod = stakeAmount.mul(oneYearInSeconds / 2).mul(rewardRateForTests).div(REWARD_PRECISION);

        // The currentReward (which is stake.accruedReward + newly calculated) should be close to this
        // Note: getStakeInfo calls calculateReward which adds pending to accrued.
        // The internal `stake.accruedReward` would be what was banked.
        // Let's check the internal `accruedReward` by fetching the struct directly (not typical in frontend but good for testing)
        const rawStakeData = await stakingContract.stakers(staker1Address);
        expect(rawStakeData.accruedReward).to.be.closeTo(expectedRewardForFirstPeriod, ethers.utils.parseUnits("0.1", 18));
        expect(rawStakeData.amount).to.equal(stakeAmount.mul(2));
    });
  });

  describe("Unstaking", function () {
    const stakeAmount = ethers.utils.parseUnits("1000", 18);
    const unstakeAmount = ethers.utils.parseUnits("500", 18);
    const oneMonthInSeconds = (365 * 24 * 60 * 60) / 12;

    beforeEach(async function () {
      await luckToken.connect(staker1).approve(stakingContract.address, stakeAmount);
      await stakingContract.connect(staker1).stake(stakeAmount);
      await increaseTime(oneMonthInSeconds);
    });

    it("Should allow a user to unstake tokens and receive rewards", async function () {
      const initialStakerLuckBalance = await luckToken.balanceOf(staker1Address);
      const expectedReward = stakeAmount.mul(oneMonthInSeconds).mul(rewardRateForTests).div(REWARD_PRECISION);

      await expect(stakingContract.connect(staker1).unstake(unstakeAmount))
        .to.emit(stakingContract, "Unstaked")
        // We can't easily check exact rewardPaid in .withArgs due to JS BigNumber complexities in Chai matchers for events
        // So we check balances and other effects.

      const finalStakerLuckBalance = await luckToken.balanceOf(staker1Address);
      const stakeInfo = await stakingContract.getStakeInfo(staker1Address);

      expect(stakeInfo.currentStake).to.equal(stakeAmount.sub(unstakeAmount));
      // User gets back unstakeAmount + rewards.
      // (final - initial) should be unstakeAmount + expectedReward
      const balanceChange = finalStakerLuckBalance.sub(initialStakerLuckBalance);
      expect(balanceChange).to.be.closeTo(unstakeAmount.add(expectedReward), ethers.utils.parseUnits("0.1", 18));

      // Accrued rewards in struct should be 0 after unstake (since it pays out all pending)
       const rawStakeData = await stakingContract.stakers(staker1Address);
       expect(rawStakeData.accruedReward).to.equal(0);
    });

    it("Should not allow unstaking more than staked", async function () {
      await expect(
        stakingContract.connect(staker1).unstake(stakeAmount.add(1))
      ).to.be.revertedWith("Staking: Insufficient staked amount");
    });

    it("Should unstake all if amount is equal to staked amount and pay rewards", async function () {
        const initialStakerLuckBalance = await luckToken.balanceOf(staker1Address);
        const expectedReward = stakeAmount.mul(oneMonthInSeconds).mul(rewardRateForTests).div(REWARD_PRECISION);

        await stakingContract.connect(staker1).unstake(stakeAmount);

        const finalStakerLuckBalance = await luckToken.balanceOf(staker1Address);
        const stakeInfo = await stakingContract.getStakeInfo(staker1Address);

        expect(stakeInfo.currentStake).to.equal(0);
        const balanceChange = finalStakerLuckBalance.sub(initialStakerLuckBalance);
        expect(balanceChange).to.be.closeTo(stakeAmount.add(expectedReward), ethers.utils.parseUnits("0.1", 18));

        const rawStakeData = await stakingContract.stakers(staker1Address);
        expect(rawStakeData.accruedReward).to.equal(0); // Rewards paid out
        expect(await stakingContract.totalStaked()).to.equal(0); // Assuming only staker1
    });
  });

  describe("Claiming Rewards", function () {
    const stakeAmount = ethers.utils.parseUnits("1000", 18);
    const sixMonthsInSeconds = (365 * 24 * 60 * 60) / 2;

    beforeEach(async function () {
      await luckToken.connect(staker1).approve(stakingContract.address, stakeAmount);
      await stakingContract.connect(staker1).stake(stakeAmount);
      await increaseTime(sixMonthsInSeconds);
    });

    it("Should allow a user to claim rewards without unstaking", async function () {
      const initialStakerLuckBalance = await luckToken.balanceOf(staker1Address);
      const stakeInfoBeforeClaim = await stakingContract.getStakeInfo(staker1Address);
      const expectedReward = stakeAmount.mul(sixMonthsInSeconds).mul(rewardRateForTests).div(REWARD_PRECISION);
      expect(stakeInfoBeforeClaim.currentReward).to.be.closeTo(expectedReward, ethers.utils.parseUnits("0.1",18));

      await expect(stakingContract.connect(staker1).claimReward())
        .to.emit(stakingContract, "RewardClaimed");
        // .withArgs(staker1Address, expectedReward); // Approximate check

      const finalStakerLuckBalance = await luckToken.balanceOf(staker1Address);
      const stakeInfoAfterClaim = await stakingContract.getStakeInfo(staker1Address);

      expect(stakeInfoAfterClaim.currentStake).to.equal(stakeAmount); // Stake amount unchanged
      const balanceChange = finalStakerLuckBalance.sub(initialStakerLuckBalance);
      expect(balanceChange).to.be.closeTo(expectedReward, ethers.utils.parseUnits("0.1", 18));

      // currentReward should be near 0 right after claim (small amount might accrue due to block progression)
      expect(stakeInfoAfterClaim.currentReward).to.be.lt(ethers.utils.parseUnits("0.001", 18));

      const rawStakeData = await stakingContract.stakers(staker1Address);
      expect(rawStakeData.accruedReward).to.equal(0); // Internal accrued is reset
    });

    it("Should not allow claiming 0 rewards", async function () {
        // Claim whatever is there first
        await stakingContract.connect(staker1).claimReward();
        // Try to claim again immediately
        await expect(stakingContract.connect(staker1).claimReward()).to.be.revertedWith("Staking: No rewards to claim");
    });
  });

  describe("Contract Reward Funding", function() {
    it("Should revert reward claim if contract has insufficient LUCK balance", async function() {
        const stakeAmount = ethers.utils.parseUnits("1000", 18);
        await luckToken.connect(staker1).approve(stakingContract.address, stakeAmount);
        await stakingContract.connect(staker1).stake(stakeAmount);

        // Burn most of the Staking contract's LUCK tokens to simulate shortage
        // This is a bit artificial for a test; usually, you'd just not fund it enough.
        const contractBalance = await luckToken.balanceOf(stakingContract.address);
        // Assuming LakshmiZRC20 has a burn function callable by anyone for owned tokens,
        // or owner can withdraw. For simplicity, let's assume owner withdraws reward funds.
        // This requires a withdraw function on Staking.sol, which is not best practice for reward funds.
        // Alternative: Deploy with very little reward funding initially.

        // For this test, let's just try to claim a huge reward that cannot be fulfilled.
        // We'll modify the reward rate to be extremely high temporarily.
        await stakingContract.connect(owner).setRewardRate(rewardRateForTests.mul(1000000)); // Massive rate
        await increaseTime(60 * 60 * 24); // 1 day with massive rate

        const calculatedReward = await stakingContract.calculateReward(staker1Address);
        const currentContractBalance = await luckToken.balanceOf(stakingContract.address);
        expect(calculatedReward).to.be.gt(currentContractBalance); // Ensure reward > balance

        await expect(stakingContract.connect(staker1).claimReward()).to.be.revertedWith(
            "Staking: Contract has insufficient LUCK for rewards"
        );
    });
  });

});
