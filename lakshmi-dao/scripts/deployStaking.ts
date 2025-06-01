import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // 1. Deploy LakshmiZRC20 ($LUCK token) if not already deployed
  // For this script, we'll assume it needs to be deployed or its address is known.
  // If LakshmiZRC20 is already deployed, replace the deployment with:
  // const luckTokenAddress = "YOUR_DEPLOYED_LUCK_TOKEN_ADDRESS";
  // const luckToken = await ethers.getContractAt("LakshmiZRC20", luckTokenAddress);

  // For demonstration, deploying LakshmiZRC20 again.
  // In a real scenario, you'd deploy it once.
  const LuckTokenFactory = await ethers.getContractFactory("LakshmiZRC20");
  const luckToken = await LuckTokenFactory.deploy(); // Add constructor arguments if any
  await luckToken.deployed();
  console.log("LakshmiZRC20 ($LUCK) token deployed to:", luckToken.address);

  // 2. Deploy Staking contract
  const StakingFactory = await ethers.getContractFactory("Staking");
  const stakingContract = await StakingFactory.deploy(luckToken.address);
  await stakingContract.deployed();

  console.log("Staking contract deployed to:", stakingContract.address);
  console.log("Staking contract owner (deployer):", await stakingContract.owner());
  console.log("Staking contract LUCK token set to:", await stakingContract.luckToken());
  console.log("Initial rewardRatePerSecond:", (await stakingContract.rewardRatePerSecond()).toString());

  // 3. Initial Setup (Optional but recommended)
  // Mint some LUCK tokens to the deployer (if not done in LakshmiZRC20 constructor)
  // and approve the Staking contract to spend them for reward deposits.
  const rewardFundAmount = ethers.utils.parseUnits("100000", 18); // 100,000 LUCK for reward pool

  try {
    // Assuming 'mint' function exists on LakshmiZRC20 and is callable by the deployer.
    // This part is specific to your LakshmiZRC20 implementation.
    if (typeof (luckToken as any).mint === "function") {
      const mintTx = await (luckToken as any).connect(deployer).mint(deployer.address, rewardFundAmount.mul(2)); // Mint more for staking too
      await mintTx.wait();
      console.log(`Minted LUCK tokens to deployer`);
    } else {
      console.warn("LakshmiZRC20 does not have a `mint` function or it's not callable by deployer. Manual LUCK token setup required.");
    }

    // Approve the Staking contract to spend deployer's LUCK tokens for reward funding
    const approveTx = await luckToken.connect(deployer).approve(stakingContract.address, rewardFundAmount);
    await approveTx.wait();
    console.log(`Approved Staking contract (${stakingContract.address}) to spend ${ethers.utils.formatUnits(rewardFundAmount, 18)} LUCK from deployer for rewards.`);

    // Deposit some LUCK tokens into the Staking contract for rewards
    const depositTx = await stakingContract.connect(deployer).depositRewardFunds(rewardFundAmount);
    await depositTx.wait();
    console.log(`Deposited ${ethers.utils.formatUnits(rewardFundAmount, 18)} LUCK into Staking contract for rewards.`);
    console.log(`Staking contract LUCK balance for rewards: ${ethers.utils.formatUnits(await luckToken.balanceOf(stakingContract.address), 18)}`);

    // The owner might want to set a more accurate reward rate:
    // Example: 10% APY. Rate = (0.1 * 10^18) / (365 * 24 * 60 * 60)
    // const desiredAPY_PERCENT = 10; // 10%
    // const REWARD_PRECISION_FROM_CONTRACT = await stakingContract.REWARD_PRECISION(); // 1e18
    // const secondsInYear = BigInt(365 * 24 * 60 * 60);
    // const newRewardRate = (BigInt(desiredAPY_PERCENT) * REWARD_PRECISION_FROM_CONTRACT / BigInt(100)) / secondsInYear;
    // await stakingContract.connect(deployer).setRewardRate(newRewardRate.toString());
    // console.log(`Reward rate updated to represent ~${desiredAPY_PERCENT}% APY: ${newRewardRate.toString()}`);

  } catch (error: any) {
    if (error.message.includes("is not a function") || error.message.includes("no matching function")) {
        console.warn(`Warning: Function missing in LakshmiZRC20 (e.g., mint) or Staking contract, or deployer is not authorized. Details: ${error.message}`);
    } else {
        console.error("Error during initial LUCK token setup for Staking contract:", error);
    }
     console.log("Manual setup of LUCK tokens for Staking contract reward pool might be required.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
