import { ethers, network, run } from "hardhat";
import "dotenv/config";
import { LakshmiZRC20, DonationVault, GovernanceDAO } from "../typechain-types";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log(`Deploying to network: ${network.name}`);

  const initialLakshmiSupply = ethers.utils.parseEther("1000000"); // 1 million LAK tokens
  const treasuryAddress = deployer.address; // Default treasury to deployer

  // Network specific parameters for LakshmiZRC20
  let lakshmiConstructorArgs: any[];

  if (network.name === "zetachain_athens_testnet") {
    console.log("Using ZetaChain Athens 3 Testnet parameters for LakshmiZRC20");
    const chainId_ = 7001;
    const gasLimit_ = ethers.BigNumber.from("2000000"); // Example gas limit
    // IMPORTANT: Replace these placeholder addresses with actual ZetaChain Athens 3 addresses
    const systemContract_ = "0xSYSTEM_CONTRACT_ADDRESS_HERE_ATHENS3"; // Placeholder
    const gatewayAddress_ = "0xGATEWAY_ADDRESS_HERE_ATHENS3";     // Placeholder

    if (systemContract_ === "0xSYSTEM_CONTRACT_ADDRESS_HERE_ATHENS3" || gatewayAddress_ === "0xGATEWAY_ADDRESS_HERE_ATHENS3") {
      console.warn("WARNING: Using placeholder addresses for ZetaChain SystemContract and/or GatewayAddress. Deployment will likely fail or be non-functional.");
      console.warn("Please replace these in scripts/deploy.ts with actual addresses for Athens 3 Testnet.");
    }

    lakshmiConstructorArgs = [
      initialLakshmiSupply,
      treasuryAddress,
      chainId_,
      gasLimit_,
      systemContract_,
      gatewayAddress_,
    ];
  } else if (network.name === "hardhat" || network.name === "localhost") {
    // For local testing, we might need a mock ZRC20 or simplified constructor.
    // Since LakshmiZRC20 now strictly requires ZRC20 parameters, this will error.
    // This section needs adjustment if local non-ZetaChain deployment is required.
    console.error(`Network ${network.name} is not ZetaChain. LakshmiZRC20 has ZRC20-specific constructor arguments.`);
    console.error("This script is primarily configured for zetachain_athens_testnet.");
    console.error("For local deployment, you may need to deploy a mock/alternative Lakshmi token or adjust constructor args if possible.");
    // As a temporary measure for local testing IF a simplified constructor were available (it's not currently):
    // lakshmiConstructorArgs = [initialLakshmiSupply, treasuryAddress, 31337, 2000000, "0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000"];
    // However, the current LakshmiZRC20 constructor *requires* real ZRC20 system/gateway addresses.
    throw new Error(`Unsupported network for LakshmiZRC20 deployment: ${network.name}. Please use zetachain_athens_testnet or adapt for local testing.`);
  } else {
    throw new Error(`Unsupported network: ${network.name}. Add specific ZRC20 parameters for this network.`);
  }

  // 1. Deploy LakshmiZRC20
  const lakshmiTokenFactory = await ethers.getContractFactory("LakshmiZRC20");
  const lakshmiToken = (await lakshmiTokenFactory.deploy(...lakshmiConstructorArgs)) as LakshmiZRC20;
  await lakshmiToken.deployed();
  console.log("LakshmiZRC20 deployed to:", lakshmiToken.address);

  // 2. Deploy DonationVault
  // Constructor: constructor(address _initialOwner, address _governanceDAOAddress, address _lakshmiTokenAddress)
  // Ownable() sets owner to msg.sender (deployer). _governanceDAOAddress is set later.
  // We need to pass _initialOwner (deployer.address) and _lakshmiTokenAddress. _governanceDAOAddress can be 0 initially.
  const donationVaultFactory = await ethers.getContractFactory("DonationVault");
  const donationVault = (await donationVaultFactory.deploy(
    deployer.address, // _initialOwner
    ethers.constants.AddressZero, // _governanceDAOAddress (will be set later)
    lakshmiToken.address  // _lakshmiTokenAddress
  )) as DonationVault;
  await donationVault.deployed();
  console.log("DonationVault deployed to:", donationVault.address);

  // 3. Deploy GovernanceDAO
  // Constructor: constructor(address _lakshmiTokenAddress, uint256 _votingDelay, ..., address _initialOwner)
  // Ownable() sets owner to msg.sender (deployer)
  const votingDelay = 0; // For testing, 0 blocks. Adjust for real deployment.
  const votingPeriodInBlocks = 45818; // Approx 7 days in blocks (assuming 13.2s block time)
  const proposalThreshold = ethers.utils.parseEther("1000"); // 1000 LAK needed to propose
  const quorumVotes = ethers.utils.parseEther("0"); // Placeholder - depends on voting power logic (0 means any participation counts for now)
  const thresholdPercentage = 50; // 50 means >50% For votes / (For + Against)

  const governanceDAOFactory = await ethers.getContractFactory("GovernanceDAO");
  const governanceDAO = (await governanceDAOFactory.deploy(
    lakshmiToken.address,
    votingDelay,
    votingPeriodInBlocks,
    proposalThreshold,
    quorumVotes,
    thresholdPercentage,
    deployer.address // _initialOwner
  )) as GovernanceDAO;
  await governanceDAO.deployed();
  console.log("GovernanceDAO deployed to:", governanceDAO.address);

  // 4. Set DonationVault's GovernanceDAO address (onlyOwner function)
  console.log("Setting GovernanceDAO address in DonationVault...");
  const tx = await donationVault.connect(deployer).setGovernanceDAO(governanceDAO.address);
  await tx.wait();
  console.log("GovernanceDAO address set in DonationVault.");

  // 5. Set GovernanceDAO's DonationVault address (onlyOwner function)
  console.log("Setting DonationVault address in GovernanceDAO...");
  const txGov = await governanceDAO.connect(deployer).setDonationVault(donationVault.address);
  await txGov.wait();
  console.log("DonationVault address set in GovernanceDAO.");


  // Optional: Grant initial LAK tokens to other accounts for testing
  // const anotherAccount = "0xYourOtherAccountAddress";
  // if (ethers.utils.isAddress(anotherAccount)) {
  //   const amount = ethers.utils.parseEther("1000"); // Send 1000 LAK
  //   await lakshmiToken.transfer(anotherAccount, amount);
  //   console.log(`Transferred ${ethers.utils.formatEther(amount)} LAK to ${anotherAccount}`);
  // }

  // Verification on Etherscan (if network is not localhost/hardhat)
  if (network.name !== "hardhat" && network.name !== "localhost" && process.env.ETHERSCAN_API_KEY) {
    console.log("Verifying contracts on Etherscan...");

    await verify(lakshmiToken.address, lakshmiConstructorArgs);
    await verify(donationVault.address, [
      deployer.address,
      ethers.constants.AddressZero,
      lakshmiToken.address,
    ]);
    await verify(governanceDAO.address, [
      lakshmiToken.address,
      votingDelay,
      votingPeriodInBlocks,
      proposalThreshold,
      quorumVotes,
      thresholdPercentage,
      deployer.address,
    ]);
  }

  console.log("Deployment and setup complete!");
  console.log({
    lakshmiToken: lakshmiToken.address,
    donationVault: donationVault.address,
    governanceDAO: governanceDAO.address,
  });
}

// Helper function to verify contracts on Etherscan
async function verify(contractAddress: string, args: any[]) {
  console.log(`Verifying contract ${contractAddress}`);
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    });
    console.log(`Contract ${contractAddress} verified.`);
  } catch (e: any) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Already verified!");
    } else {
      console.error(`Error verifying ${contractAddress}:`, e);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
