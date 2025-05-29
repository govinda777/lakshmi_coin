import { ethers } from "hardhat";
import { LakshmiZRC20, DonationVault, GovernanceDAO } from "../typechain-types"; // Adjust path as necessary

// --- Configuration ---
const LAKSHMI_TOKEN_ADDRESS = "YOUR_LAKSHMI_TOKEN_ADDRESS"; // Replace with deployed LakshmiZRC20 address
const DONATION_VAULT_ADDRESS = "YOUR_DONATION_VAULT_ADDRESS"; // Replace with deployed DonationVault address
const GOVERNANCE_DAO_ADDRESS = "YOUR_GOVERNANCE_DAO_ADDRESS"; // Replace with deployed GovernanceDAO address

const EXAMPLE_PROPOSAL_DESCRIPTION = "Proposal to fund environmental project 'Green Earth'";
const EXAMPLE_RECIPIENT_ADDRESS = "0xRecipientAddressHere"; // Replace with a valid recipient
const EXAMPLE_ETH_AMOUNT_TO_RELEASE = ethers.utils.parseEther("0.01"); // 0.01 ETH
// If releasing ZRC20 tokens, specify the token and amount
// const EXAMPLE_ZRC20_TOKEN_ADDRESS = "0xYourERC20TokenAddress";
// const EXAMPLE_ZRC20_AMOUNT_TO_RELEASE = ethers.utils.parseUnits("100", 18); // 100 tokens with 18 decimals

async function main() {
    const [signer] = await ethers.getSigners();
    console.log("Interacting with contracts using account:", signer.address);

    // --- Get Contract Instances ---
    const lakshmiToken = (await ethers.getContractAt("LakshmiZRC20", LAKSHMI_TOKEN_ADDRESS, signer)) as LakshmiZRC20;
    const donationVault = (await ethers.getContractAt("DonationVault", DONATION_VAULT_ADDRESS, signer)) as DonationVault;
    const governanceDAO = (await ethers.getContractAt("GovernanceDAO", GOVERNANCE_DAO_ADDRESS, signer)) as GovernanceDAO;

    console.log("Successfully attached to contracts:");
    console.log("  LakshmiZRC20:", lakshmiToken.address);
    console.log("  DonationVault:", donationVault.address);
    console.log("  GovernanceDAO:", governanceDAO.address);
    console.log("----------------------------------------");


    // --- Example Interactions ---

    // 1. Check LAK Balance
    const lakBalance = await lakshmiToken.balanceOf(signer.address);
    console.log(`Your LAK Balance: ${ethers.utils.formatEther(lakBalance)} LAK`);
    console.log("----------------------------------------");

    // 2. Donate ETH to the Vault
    // console.log("Donating 0.05 ETH to the DonationVault...");
    // const donateTx = await donationVault.donateEther({ value: ethers.utils.parseEther("0.05") });
    // await donateTx.wait();
    // console.log("Donation successful! Transaction hash:", donateTx.hash);
    // const vaultEthBalance = await donationVault.getVaultBalance();
    // console.log(`DonationVault ETH Balance: ${ethers.utils.formatEther(vaultEthBalance)} ETH`);
    // console.log("----------------------------------------");

    // 3. Create a Proposal (requires LAK tokens)
    //    This example creates a proposal to release ETH from the vault.
    //    You'll need to encode the function call for the DonationVault's `releaseFunds` method.
    // console.log(`Creating proposal: "${EXAMPLE_PROPOSAL_DESCRIPTION}"`);
    // const releaseFundsCalldata = donationVault.interface.encodeFunctionData("releaseFunds", [
    //     0, // Placeholder for proposalId, actual ID will be assigned on creation
    //     EXAMPLE_RECIPIENT_ADDRESS,
    //     EXAMPLE_ETH_AMOUNT_TO_RELEASE
    // ]);

    // const createProposalTx = await governanceDAO.createProposal(
    //     EXAMPLE_PROPOSAL_DESCRIPTION,
    //     donationVault.address, // Target contract is DonationVault
    //     releaseFundsCalldata,
    //     0 // No ETH sent with the proposal creation itself
    // );
    // const receipt = await createProposalTx.wait();
    // const proposalCreatedEvent = receipt.events?.find(e => e.event === "ProposalCreated");
    // const proposalId = proposalCreatedEvent?.args?.proposalId;
    // console.log("Proposal created! Transaction hash:", createProposalTx.hash);
    // if (proposalId) {
    //     console.log("Proposal ID:", proposalId.toString());
    //     const proposal = await governanceDAO.proposals(proposalId);
    //     console.log("Proposal Details:", proposal);
    // }
    // console.log("----------------------------------------");

    // 4. Vote on a Proposal (requires LAK tokens and an active proposal)
    // const proposalToVoteOn = proposalId || 1; // Use the ID from creation or a known one
    // console.log(`Voting FOR Proposal ID: ${proposalToVoteOn}`);
    // try {
    //     const voteTx = await governanceDAO.vote(proposalToVoteOn, 0); // 0 for 'For', 1 for 'Against', 2 for 'Abstain'
    //     await voteTx.wait();
    //     console.log("Voted successfully! Transaction hash:", voteTx.hash);
    //     const updatedProposal = await governanceDAO.proposals(proposalToVoteOn);
    //     console.log(`Proposal ${proposalToVoteOn} For Votes: ${ethers.utils.formatEther(updatedProposal.forVotes)}`);
    // } catch (error) {
    //     console.error("Voting failed:", error);
    // }
    // console.log("----------------------------------------");

    // 5. Update Proposal State (after voting period ends)
    // const proposalToUpdate = proposalId || 1;
    // console.log(`Attempting to update state for Proposal ID: ${proposalToUpdate}`);
    // try {
    //     const updateStateTx = await governanceDAO.updateProposalStateAfterVoting(proposalToUpdate);
    //     await updateStateTx.wait();
    //     const finalProposal = await governanceDAO.proposals(proposalToUpdate);
    //     console.log("Proposal state updated. Current state:", finalProposal.state); // Check enum ProposalState
    // } catch (error) {
    //     console.error("Updating proposal state failed:", error);
    // }
    // console.log("----------------------------------------");


    // 6. Execute a Proposal (if it succeeded)
    // const proposalToExecute = proposalId || 1; // Use the ID of a succeeded proposal
    // console.log(`Attempting to execute Proposal ID: ${proposalToExecute}`);
    // try {
    //     const executeTx = await governanceDAO.executeProposal(proposalToExecute);
    //     await executeTx.wait();
    //     console.log("Proposal executed successfully! Transaction hash:", executeTx.hash);
    //     const executedProposal = await governanceDAO.proposals(proposalToExecute);
    //     console.log("Proposal execution status:", executedProposal.executed);
    // } catch (error) {
    //     console.error("Proposal execution failed:", error);
    // }
    // console.log("----------------------------------------");

    console.log("Interaction script finished. Uncomment sections to perform actions.");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
