import { ethers, network, run } from "hardhat";
import "dotenv/config";
import { LakshmiZRC20, DonationVault, GovernanceDAO } from "../typechain-types";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const initialLakshmiSupply = ethers.utils.parseEther("1000000"); // 1 million LAK tokens

  // 1. Deploy LakshmiZRC20
  const lakshmiTokenFactory = await ethers.getContractFactory("LakshmiZRC20");
  const lakshmiToken = (await lakshmiTokenFactory.deploy(initialLakshmiSupply)) as LakshmiZRC20;
  await lakshmiToken.deployed();
  console.log("LakshmiZRC20 deployed to:", lakshmiToken.address);

  // 2. Deploy DonationVault
  const donationVaultFactory = await ethers.getContractFactory("DonationVault");
  const donationVault = (await donationVaultFactory.deploy(lakshmiToken.address)) as DonationVault;
  await donationVault.deployed();
  console.log("DonationVault deployed to:", donationVault.address);

  // 3. Deploy GovernanceDAO
  const votingPeriodInSeconds = 7 * 24 * 60 * 60; // 7 days
  const quorumPercentage = 10; // 10% of total supply
  const approvalThresholdPercentage = 66; // 66% of votes cast

  const governanceDAOFactory = await ethers.getContractFactory("GovernanceDAO");
  const governanceDAO = (await governanceDAOFactory.deploy(
    lakshmiToken.address,
    votingPeriodInSeconds,
    quorumPercentage,
    approvalThresholdPercentage
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

    await verify(lakshmiToken.address, [initialLakshmiSupply]);
    await verify(donationVault.address, [lakshmiToken.address]);
    await verify(governanceDAO.address, [
      lakshmiToken.address,
      votingPeriodInSeconds,
      quorumPercentage,
      approvalThresholdPercentage,
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
