import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy LakshmiZRC20 ($LUCK token) first
  // Replace "LakshmiZRC20" with the actual contract name if different, and add constructor args if any.
  // Assuming LakshmiZRC20 constructor takes initial supply or is parameterless for simplicity here.
  // For example, if it takes an initial supply for the deployer:
  // const initialSupply = ethers.utils.parseUnits("1000000", 18); // 1 million tokens
  // const LuckTokenFactory = await ethers.getContractFactory("LakshmiZRC20");
  // const luckToken = await LuckTokenFactory.deploy(initialSupply);

  // If LakshmiZRC20 has a simple constructor (e.g. mints to deployer or no initial minting):
  const LuckTokenFactory = await ethers.getContractFactory("LakshmiZRC20");
  const luckToken = await LuckTokenFactory.deploy(); // Add constructor arguments if any

  await luckToken.deployed();
  console.log("LakshmiZRC20 ($LUCK) token deployed to:", luckToken.address);

  // Now deploy Missions contract, passing the LUCK token's address
  const MissionsFactory = await ethers.getContractFactory("Missions");
  const missionsContract = await MissionsFactory.deploy(luckToken.address);
  await missionsContract.deployed();

  console.log("Missions contract deployed to:", missionsContract.address);
  console.log("Missions contract owner (deployer):", await missionsContract.owner());
  console.log("Missions contract LUCK token set to:", await missionsContract.luckToken());

  // Example: Mint some LUCK tokens to the deployer (if not done in constructor)
  // and approve the Missions contract to spend them for reward deposits.
  // This depends on LakshmiZRC20's API (e.g., if it has a mint function callable by owner).
  // Let's assume a mint function exists and is callable by the deployer.
  const mintAmount = ethers.utils.parseUnits("500000", 18); // 500,000 LUCK for rewards
  try {
    // Assuming 'mint' function takes address and amount
    const mintTx = await luckToken.connect(deployer).mint(deployer.address, mintAmount);
    await mintTx.wait();
    console.log(`Minted ${ethers.utils.formatUnits(mintAmount, 18)} LUCK to deployer`);

    // Approve the Missions contract to spend deployer's LUCK tokens
    const approveTx = await luckToken.connect(deployer).approve(missionsContract.address, mintAmount);
    await approveTx.wait();
    console.log(`Approved Missions contract (${missionsContract.address}) to spend ${ethers.utils.formatUnits(mintAmount, 18)} LUCK from deployer`);

    // Optional: Deposit some tokens into the Missions contract right away
    // const depositTx = await missionsContract.connect(deployer).depositRewardTokens(mintAmount);
    // await depositTx.wait();
    // console.log(`Deposited ${ethers.utils.formatUnits(mintAmount, 18)} LUCK into Missions contract`);
    // console.log(`Missions contract LUCK balance: ${ethers.utils.formatUnits(await luckToken.balanceOf(missionsContract.address), 18)}`);

  } catch (error: any) {
    if (error.message.includes("is not a function") || error.message.includes("no matching function")) {
        console.warn("Warning: LakshmiZRC20 contract does not have a `mint` or `approve` function with the expected signature, or deployer is not authorized. Manual setup of LUCK tokens for Missions contract will be required.");
    } else {
        console.error("Error during initial LUCK token setup for Missions contract:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
