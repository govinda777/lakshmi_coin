import { Before, Given, When, Then, World, After } from "@cucumber/cucumber";
import { ethers, network } from "hardhat";
import { expect } from "chai";
import { LakshmiZRC20, DonationVault, GovernanceDAO } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, BigNumberish, ContractReceipt, ContractTransaction, utils } from "ethers";

// Define a custom world context
interface CustomWorld extends World {
    lakshmiToken?: LakshmiZRC20;
    donationVault?: DonationVault;
    governanceDAO?: GovernanceDAO;
    deployer?: SignerWithAddress;
    users: { [name: string]: SignerWithAddress };
    proposals: { [id: string]: {
        proposer: string;
        description: string;
        targetAddress: string;
        callData: string;
        value: BigNumber;
        idBN?: BigNumber; // Actual BigNumber ID from contract
    }};
    lastTransaction?: ContractTransaction;
    lastReceipt?: ContractReceipt;
    lastTransactionError?: any;
    userInitialETHBalances: { [userName: string]: BigNumber };
    nextProposalIdInternal: number; // To keep track of proposal IDs for feature file simplicity
}

const parseLAK = (amount: string) => ethers.utils.parseEther(amount);
const parseETH = (amount: string) => ethers.utils.parseEther(amount);
const daysToSeconds = (days: number) => days * 24 * 60 * 60;

Before({ tags: "" }, async function (this: CustomWorld) {
    const signers = await ethers.getSigners();
    this.deployer = signers[0];
    this.users = {
        deployer: signers[0],
        Proposer1: signers[1] || (await ethers.Wallet.createRandom().connect(ethers.provider)),
        VoterA: signers[2] || (await ethers.Wallet.createRandom().connect(ethers.provider)),
        VoterB: signers[3] || (await ethers.Wallet.createRandom().connect(ethers.provider)),
        VoterC: signers[4] || (await ethers.Wallet.createRandom().connect(ethers.provider)),
        NonTokenHolder: signers[5] || (await ethers.Wallet.createRandom().connect(ethers.provider)),
        Recipient: signers[6] || (await ethers.Wallet.createRandom().connect(ethers.provider)), // For fund release
        Anyone: signers[7] || (await ethers.Wallet.createRandom().connect(ethers.provider)), // Generic user
    };
    this.proposals = {};
    this.lastTransactionError = undefined;
    this.lastReceipt = undefined;
    this.userInitialETHBalances = {};
    this.nextProposalIdInternal = 1;

    for (const userName of ["Recipient", "deployer", "Proposer1", "VoterA", "VoterB", "VoterC"]) {
        if (this.users[userName]) {
             this.userInitialETHBalances[userName] = await this.users[userName].getBalance();
        }
    }
});

After(async function(this: CustomWorld) {
    // Reset time manipulation if any test changed it significantly
    // await network.provider.send("evm_setNextBlockTimestamp", [Math.floor(Date.now() / 1000)]);
    // await network.provider.send("evm_mine");
});

Given('a deployed LakshmiZRC20 contract with an initial supply of {string} LAK', async function (this: CustomWorld, initialSupplyString: string) {
    const initialSupply = parseLAK(initialSupplyString);
    const LakshmiZRC20Factory = await ethers.getContractFactory("LakshmiZRC20", this.deployer);
    this.lakshmiToken = (await LakshmiZRC20Factory.deploy(initialSupply)) as LakshmiZRC20;
    await this.lakshmiToken.deployed();
});

Given('a deployed DonationVault contract linked to the LakshmiZRC20 token', async function (this: CustomWorld) {
    const DonationVaultFactory = await ethers.getContractFactory("DonationVault", this.deployer);
    this.donationVault = (await DonationVaultFactory.deploy(this.lakshmiToken!.address)) as DonationVault;
    await this.donationVault.deployed();
    // Fund DonationVault with some ETH for execution tests
    await this.deployer!.sendTransaction({ to: this.donationVault.address, value: parseETH("10") });
});

Given('a GovernanceDAO contract deployed with the LakshmiZRC20 token, voting period {string} days, quorum {string} percent, approval {string} percent', async function (this: CustomWorld, vpDays: string, quorumPercent: string, approvalPercent: string) {
    const GovernanceDAOFactory = await ethers.getContractFactory("GovernanceDAO", this.deployer);
    this.governanceDAO = (await GovernanceDAOFactory.deploy(
        this.lakshmiToken!.address,
        daysToSeconds(parseInt(vpDays)),
        parseInt(quorumPercent),
        parseInt(approvalPercent)
    )) as GovernanceDAO;
    await this.governanceDAO.deployed();
});

Given('the GovernanceDAO is linked to the DonationVault', async function (this: CustomWorld) {
    await this.governanceDAO!.connect(this.deployer!).setDonationVault(this.donationVault!.address);
    // Also link DonationVault back to GovernanceDAO for full setup (though not strictly needed for all DAO tests)
    await this.donationVault!.connect(this.deployer!).setGovernanceDAO(this.governanceDAO!.address);
});

Given('{string} has {string} LAK tokens', async function (this: CustomWorld, userName: string, balanceString: string) {
    const user = this.users[userName];
    const targetBalance = parseLAK(balanceString);
    if (user.address !== this.deployer!.address) { // Avoid transferring to self if deployer
        const currentBalance = await this.lakshmiToken!.balanceOf(user.address);
        if (targetBalance.gt(currentBalance)) {
            await this.lakshmiToken!.connect(this.deployer!).transfer(user.address, targetBalance.sub(currentBalance));
        } else if (targetBalance.lt(currentBalance)) {
            // If user needs less than they have (e.g. from previous scenario setup)
            // This should ideally not happen with proper scenario isolation.
            // For now, we only add tokens.
        }
    }
    // For NonTokenHolder, ensure balance is zero
    if (userName === "NonTokenHolder" && targetBalance.isZero()) {
        const currentBalance = await this.lakshmiToken!.balanceOf(user.address);
        if (currentBalance.gt(0)) { // If they have tokens, burn them or transfer them away
            await this.lakshmiToken!.connect(user).burn(currentBalance); // Assuming they can burn their own
        }
    }
    expect(await this.lakshmiToken!.balanceOf(user.address)).to.equal(targetBalance, `Failed to set LAK balance for ${userName}`);
});

Then('the GovernanceDAO\'s Lakshmi token should be the deployed LakshmiZRC20 token', async function (this: CustomWorld) {
    expect(await this.governanceDAO!.lakshmiToken()).to.equal(this.lakshmiToken!.address);
});

Then('the GovernanceDAO\'s voting period should be {string} days', async function (this: CustomWorld, expectedDays: string) {
    expect(await this.governanceDAO!.votingPeriod()).to.equal(daysToSeconds(parseInt(expectedDays)));
});

Then('the GovernanceDAO\'s quorum percentage should be {string}', async function (this: CustomWorld, expectedQuorum: string) {
    expect(await this.governanceDAO!.quorumPercentage()).to.equal(parseInt(expectedQuorum));
});

Then('the GovernanceDAO\'s approval threshold percentage should be {string}', async function (this: CustomWorld, expectedApproval: string) {
    expect(await this.governanceDAO!.approvalThresholdPercentage()).to.equal(parseInt(expectedApproval));
});

Then('the GovernanceDAO\'s owner should be the deployer', async function (this: CustomWorld) {
    expect(await this.governanceDAO!.owner()).to.equal(this.deployer!.address);
});

// --- Proposal Creation ---
When('{string} creates a proposal to release {string} ETH from DonationVault to {string} with description {string}', async function (this: CustomWorld, proposerName: string, ethAmount: string, recipientName: string, description: string) {
    const proposer = this.users[proposerName];
    const recipient = this.users[recipientName];
    const callData = this.donationVault!.interface.encodeFunctionData("releaseFunds", [0, recipient.address, parseETH(ethAmount)]); // Placeholder proposal ID 0
    // Note: The actual proposal ID for releaseFunds is determined by the DAO, not hardcoded here.
    // The target function in DonationVault won't use the proposalId from its own calldata for releaseFunds.
    // It's more about the DAO associating this call with a proposal.
    // For `emergencyWithdrawEther` which is sometimes used as a target in tests, it's simpler.
    // Let's use `emergencyWithdrawEther` for simplicity of calldata if `releaseFunds` is complex.
    // The feature specifies "release ... ETH", which implies `releaseFunds`.
    // The `proposalId` argument in `releaseFunds` (DonationVault side) is the DAO's proposal ID.
    // The `callData` for `createProposal` (DAO side) should be the call intended for the target contract.
    // If target is DonationVault.releaseFunds, that function itself takes a proposalId. This is circular or needs careful design.
    // Let's assume the proposal is to call a generic "executeDonation" or similar on DonationVault, or `emergencyWithdrawEther` for simplicity.
    // For now, let's use a simpler target function on DonationVault if `releaseFunds` is too complex for calldata.
    // The original tests use `emergencyWithdrawEther` as calldata for `createProposal` targeting `DonationVault`.
    // This is for testing the execution flow.
    // The `value` for `createProposal` is msg.value sent with the proposal, not the ETH amount in the proposal's action.

    const targetCallData = this.donationVault!.interface.encodeFunctionData("emergencyWithdrawEther", [recipient.address, parseETH(ethAmount)]);

    try {
        this.lastTransaction = await this.governanceDAO!.connect(proposer).createProposal(description, this.donationVault!.address, targetCallData, 0);
        this.lastReceipt = await this.lastTransaction.wait();
        const event = this.lastReceipt.events?.find(e => e.event === "ProposalCreated");
        const proposalIdBN = event?.args?.proposalId;
        if (proposalIdBN) {
            const proposalKey = this.nextProposalIdInternal.toString();
            this.proposals[proposalKey] = { // Store by internal key first
                idBN: proposalIdBN, // Store actual ID
                proposer: proposer.address, description, targetAddress: this.donationVault!.address, callData: targetCallData, value: BigNumber.from(0)
            };
            this.nextProposalIdInternal++;
        }
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

async function getProposalIdBN(world: CustomWorld, featureProposalId: string): Promise<BigNumber | undefined> {
    // This function maps the simple "1", "2" from feature files to actual BigNumber proposal IDs
    // This assumes proposals are created in the order they appear in feature files or are referenced by their simple number.
    // A more robust mapping might be needed if proposal creation is dynamic or out of order.
    // For now, we find the proposal by the order it was stored.
    const proposalData = Object.values(world.proposals)[parseInt(featureProposalId) - 1];
    return proposalData?.idBN;
}


Then('proposal {string} should exist in GovernanceDAO', async function (this: CustomWorld, proposalKey: string) {
    const proposalIdBN = await getProposalIdBN(this, proposalKey);
    expect(proposalIdBN).to.not.be.undefined;
    const proposal = await this.governanceDAO!.proposals(proposalIdBN!);
    expect(proposal.proposer).to.not.equal(ethers.constants.AddressZero); // Basic check for existence
});

Then('proposal {string} should have been proposed by {string}', async function (this: CustomWorld, proposalKey: string, proposerName: string) {
    const proposalIdBN = await getProposalIdBN(this, proposalKey);
    const proposer = this.users[proposerName];
    const proposal = await this.governanceDAO!.proposals(proposalIdBN!);
    expect(proposal.proposer).to.equal(proposer.address);
});

Then('proposal {string} description should be {string}', async function (this: CustomWorld, proposalKey: string, description: string) {
    const proposalIdBN = await getProposalIdBN(this, proposalKey);
    const proposal = await this.governanceDAO!.proposals(proposalIdBN!);
    expect(proposal.description).to.equal(description);
});

Then('proposal {string} target should be the DonationVault address', async function (this: CustomWorld, proposalKey: string) {
    const proposalIdBN = await getProposalIdBN(this, proposalKey);
    const proposal = await this.governanceDAO!.proposals(proposalIdBN!);
    expect(proposal.targetContract).to.equal(this.donationVault!.address);
});

Then('proposal {string} state should be {string}', async function (this: CustomWorld, proposalKey: string, expectedState: string) {
    const proposalIdBN = await getProposalIdBN(this, proposalKey);
    const proposal = await this.governanceDAO!.proposals(proposalIdBN!);
    // Enum: Pending, Active, Canceled, Defeated, Succeeded, Executed, Queued, Expired
    const stateMap: { [key: string]: number } = {
        "Pending": 0, "Active": 1, "Canceled": 2, "Defeated": 3,
        "Succeeded": 4, "Executed": 5, "Queued": 6, "Expired": 7
    };
    // GovernanceDAO uses a different enum: 0:Pending, 1:Active, 2:Succeeded, 3:Defeated, 4:Executed, 5:Canceled
     const contractStateMap: { [key: string]: number } = {
        "Pending": 0, "Active": 1, "Succeeded": 2, "Defeated": 3,
        "Executed": 4, "Canceled": 5
    };
    expect(proposal.state).to.equal(contractStateMap[expectedState]);
});

Then('an event {string} should have been emitted by GovernanceDAO for proposal {string}', async function (this: CustomWorld, eventName: string, proposalKey: string) {
    const proposalIdBN = await getProposalIdBN(this, proposalKey);
    await expect(this.lastTransaction).to.emit(this.governanceDAO!, eventName).withArgs(proposalIdBN, this.users.Proposer1.address, // Assuming Proposer1 was the one
        // More args depending on the event, e.g. description, target, etc.
        // For ProposalCreated, it's (proposalId, proposer, description, votingStartTime, votingEndTime, targetContract, callData, value)
        // This is a simplified check. A more specific check would verify all args.
    );
});

When('{string} attempts to create a proposal to release {string} ETH from DonationVault to {string}', async function (this: CustomWorld, proposerName: string, ethAmount: string, recipientName: string) {
    const proposer = this.users[proposerName];
    const recipient = this.users[recipientName];
    const callData = this.donationVault!.interface.encodeFunctionData("emergencyWithdrawEther", [recipient.address, parseETH(ethAmount)]);
    try {
        this.lastTransaction = await this.governanceDAO!.connect(proposer).createProposal("Test Fail Prop", this.donationVault!.address, callData, 0);
        this.lastReceipt = await this.lastTransaction.wait();
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

Then('the proposal creation attempt should fail with message {string}', function (this: CustomWorld, expectedError: string) {
    expect(this.lastTransactionError).to.exist;
    expect((this.lastTransactionError as any).message).to.include(expectedError);
});

When('{string} attempts to create a proposal with an empty description', async function (this: CustomWorld, proposerName: string) {
    const proposer = this.users[proposerName];
    try {
        this.lastTransaction = await this.governanceDAO!.connect(proposer).createProposal("", this.donationVault!.address, "0x", 0);
        this.lastReceipt = await this.lastTransaction.wait();
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

// --- Voting ---
Given('{string} creates proposal {string} to release {string} ETH to {string}', async function (this: CustomWorld, proposerName: string, proposalKey: string, ethAmount: string, recipientName: string) {
    // This is a simplified way to ensure a proposal exists for voting tests.
    // It reuses the successful creation logic.
    const proposer = this.users[proposerName];
    const recipient = this.users[recipientName];
    const description = `Proposal ${proposalKey} for voting tests`;
    const callData = this.donationVault!.interface.encodeFunctionData("emergencyWithdrawEther", [recipient.address, parseETH(ethAmount)]);

    const tx = await this.governanceDAO!.connect(proposer).createProposal(description, this.donationVault!.address, callData, 0);
    const receipt = await tx.wait();
    const event = receipt.events?.find(e => e.event === "ProposalCreated");
    const proposalIdBN = event?.args?.proposalId;
    expect(proposalIdBN).to.not.be.undefined;
    this.proposals[proposalKey] = { idBN: proposalIdBN!, proposer: proposer.address, description, targetAddress: this.donationVault!.address, callData, value: BigNumber.from(0) };
});


When('{string} votes {string} on proposal {string}', async function (this: CustomWorld, voterName: string, voteType: string, proposalKey: string) {
    const voter = this.users[voterName];
    const proposalIdBN = (await getProposalIdBN(this, proposalKey))!;
    const voteMap: { [key: string]: number } = { "For": 0, "Against": 1, "Abstain": 2 };
    try {
        this.lastTransaction = await this.governanceDAO!.connect(voter).vote(proposalIdBN, voteMap[voteType]);
        this.lastReceipt = await this.lastTransaction.wait();
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

Then('{string} should have voted {string} on proposal {string}', async function (this: CustomWorld, voterName: string, voteType: string, proposalKey: string) {
    const voter = this.users[voterName];
    const proposalIdBN = (await getProposalIdBN(this, proposalKey))!;
    const voteMap: { [key: string]: number } = { "For": 0, "Against": 1, "Abstain": 2 };
    expect(await this.governanceDAO!.hasVoted(proposalIdBN, voter.address)).to.be.true;
    expect(await this.governanceDAO!.votes(proposalIdBN, voter.address)).to.equal(voteMap[voteType]);
});

Then('proposal {string} should have {string} For votes', async function (this: CustomWorld, proposalKey: string, expectedForVotes: string) {
    const proposalIdBN = (await getProposalIdBN(this, proposalKey))!;
    const proposal = await this.governanceDAO!.proposals(proposalIdBN);
    expect(proposal.forVotes).to.equal(parseLAK(expectedForVotes));
});

Then('proposal {string} should have {string} Against votes', async function (this: CustomWorld, proposalKey: string, expectedAgainstVotes: string) {
    const proposalIdBN = (await getProposalIdBN(this, proposalKey))!;
    const proposal = await this.governanceDAO!.proposals(proposalIdBN);
    expect(proposal.againstVotes).to.equal(parseLAK(expectedAgainstVotes));
});

Then('proposal {string} should have {string} Abstain votes', async function (this: CustomWorld, proposalKey: string, expectedAbstainVotes: string) {
    const proposalIdBN = (await getProposalIdBN(this, proposalKey))!;
    const proposal = await this.governanceDAO!.proposals(proposalIdBN);
    expect(proposal.abstainVotes).to.equal(parseLAK(expectedAbstainVotes));
});

Then('an event {string} should have been emitted by GovernanceDAO for proposal {string} by {string} with vote type {string}', async function (this: CustomWorld, eventName: string, proposalKey: string, voterName: string, voteType: string) {
    const proposalIdBN = (await getProposalIdBN(this, proposalKey))!;
    const voter = this.users[voterName];
    const voteMap: { [key: string]: number } = { "For": 0, "Against": 1, "Abstain": 2 };
    const voterBalance = await this.lakshmiToken!.balanceOf(voter.address);
    await expect(this.lastTransaction).to.emit(this.governanceDAO!, eventName)
        .withArgs(proposalIdBN, voter.address, voteMap[voteType], voterBalance);
});


When('{string} attempts to vote {string} on proposal {string}', async function (this: CustomWorld, voterName: string, voteType: string, proposalKey: string) {
    // Same as successful vote, but result checked by failure step
    const voter = this.users[voterName];
    const proposalIdBN = (await getProposalIdBN(this, proposalKey))!;
    const voteMap: { [key: string]: number } = { "For": 0, "Against": 1, "Abstain": 2 };
    try {
        this.lastTransaction = await this.governanceDAO!.connect(voter).vote(proposalIdBN, voteMap[voteType]);
        this.lastReceipt = await this.lastTransaction.wait();
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

Then('the voting attempt should fail with message {string}', function (this: CustomWorld, expectedError: string) {
    expect(this.lastTransactionError).to.exist;
    expect((this.lastTransactionError as any).message).to.include(expectedError);
});

Given('the voting period of {string} days for proposal {string} elapses', async function (this: CustomWorld, days: string, proposalKey: string) {
    const proposalIdBN = (await getProposalIdBN(this, proposalKey))!; // Ensure proposal exists
    const proposal = await this.governanceDAO!.proposals(proposalIdBN);
    const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
    const votingEndTime = proposal.votingEndTime.toNumber();

    if (currentTime < votingEndTime) {
        await network.provider.send("evm_increaseTime", [votingEndTime - currentTime + 1]);
        await network.provider.send("evm_mine");
    }
});

// --- Proposal State Transition & Execution ---
When('anyone updates the state of proposal {string}', async function (this: CustomWorld, proposalKey: string) {
    const proposalIdBN = (await getProposalIdBN(this, proposalKey))!;
    const updater = this.users.Anyone; // Any account can call this
    try {
        this.lastTransaction = await this.governanceDAO!.connect(updater).updateProposalStateAfterVoting(proposalIdBN);
        this.lastReceipt = await this.lastTransaction.wait();
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

Then('an event {string} should have been emitted for proposal {string} with state {string}', async function (this: CustomWorld, eventName: string, proposalKey: string, stateString: string) {
    const proposalIdBN = (await getProposalIdBN(this, proposalKey))!;
    const contractStateMap: { [key: string]: number } = {
        "Pending": 0, "Active": 1, "Succeeded": 2, "Defeated": 3,
        "Executed": 4, "Canceled": 5
    };
    await expect(this.lastTransaction).to.emit(this.governanceDAO!, eventName)
        .withArgs(proposalIdBN, contractStateMap[stateString]);
});


Given('proposal {string} is {string} to release {string} ETH to {string} from DonationVault', async function (this: CustomWorld, proposalKey: string, desiredState: string, ethAmount: string, recipientName: string) {
    // This is a complex setup step. It needs to create a proposal and bring it to the desiredState.
    // 1. Create proposal
    const proposer = this.users.Proposer1;
    const recipient = this.users.Recipient;
    const description = `Proposal ${proposalKey} for ${desiredState} state test`;
    const callData = this.donationVault!.interface.encodeFunctionData("emergencyWithdrawEther", [recipient.address, parseETH(ethAmount)]);
    const tx = await this.governanceDAO!.connect(proposer).createProposal(description, this.donationVault!.address, callData, 0);
    const receipt = await tx.wait();
    const event = receipt.events?.find(e => e.event === "ProposalCreated");
    const proposalIdBN = event?.args?.proposalId;
    this.proposals[proposalKey] = { idBN: proposalIdBN!, proposer: proposer.address, description, targetAddress: this.donationVault!.address, callData, value: BigNumber.from(0) };

    // 2. Manipulate votes and time to reach desiredState
    if (desiredState === "Succeeded") {
        // VoterA (200k For) + VoterB (150k For) = 350k For. VoterC (50k Against) = 50k Against.
        // Quorum 10% (100k), Approval 60%. 400k votes (40%) -> Quorum Met. 350k/400k (87.5%) -> Approved
        await this.governanceDAO!.connect(this.users.VoterA).vote(proposalIdBN, 0); // For
        await this.governanceDAO!.connect(this.users.VoterB).vote(proposalIdBN, 0); // For
        await this.governanceDAO!.connect(this.users.VoterC).vote(proposalIdBN, 1); // Against
        await network.provider.send("evm_increaseTime", [daysToSeconds(3) + 1]);
        await this.governanceDAO!.connect(this.users.Anyone).updateProposalStateAfterVoting(proposalIdBN);
    } else if (desiredState === "Defeated") {
        // VoterC (50k For). Quorum 10% (100k). 50k votes (5%) -> Quorum Not Met
        await this.governanceDAO!.connect(this.users.VoterC).vote(proposalIdBN, 0); // For
        await network.provider.send("evm_increaseTime", [daysToSeconds(3) + 1]);
        await this.governanceDAO!.connect(this.users.Anyone).updateProposalStateAfterVoting(proposalIdBN);
    } else if (desiredState === "Active") {
        // Already active after creation
    }
    // Verify state
    const finalProposal = await this.governanceDAO!.proposals(proposalIdBN);
     const contractStateMap: { [key: string]: number } = {
        "Pending": 0, "Active": 1, "Succeeded": 2, "Defeated": 3,
        "Executed": 4, "Canceled": 5
    };
    expect(finalProposal.state).to.equal(contractStateMap[desiredState], `Proposal setup for state ${desiredState} failed.`);
});

Given('proposal {string} is {string}', async function(this: CustomWorld, proposalKey: string, desiredState: string) {
    // Simplified version if proposal details (ETH, recipient) are not needed for this specific step.
    // Assumes proposal was already created by a prior step like "Proposer1 creates proposal '1'..."
    const proposalIdBN = (await getProposalIdBN(this, proposalKey))!;
    if (!proposalIdBN) throw new Error(`Proposal ${proposalKey} not found for state setup.`);

    const currentState = (await this.governanceDAO!.proposals(proposalIdBN)).state;
    const contractStateMap: { [key: string]: number } = {
        "Pending": 0, "Active": 1, "Succeeded": 2, "Defeated": 3,
        "Executed": 4, "Canceled": 5
    };

    if (currentState === contractStateMap[desiredState]) return; // Already in desired state

    // If Active and need Succeeded/Defeated:
    if (currentState === contractStateMap["Active"]) {
        if (desiredState === "Succeeded") {
            await this.governanceDAO!.connect(this.users.VoterA).vote(proposalIdBN, 0); // For
            await this.governanceDAO!.connect(this.users.VoterB).vote(proposalIdBN, 0); // For
        } else if (desiredState === "Defeated") {
             await this.governanceDAO!.connect(this.users.VoterC).vote(proposalIdBN, 1); // Against enough to defeat or not meet quorum
        }
        await network.provider.send("evm_increaseTime", [daysToSeconds(3) + 1]);
        await this.governanceDAO!.connect(this.users.Anyone).updateProposalStateAfterVoting(proposalIdBN);
    }
    const finalProposal = await this.governanceDAO!.proposals(proposalIdBN);
    expect(finalProposal.state).to.equal(contractStateMap[desiredState], `Proposal setup for state ${desiredState} failed.`);
});


Given('the DonationVault has {string} ETH', async function (this: CustomWorld, ethAmount: string) {
    const targetBalance = parseETH(ethAmount);
    const currentBalance = await ethers.provider.getBalance(this.donationVault!.address);
    if (targetBalance.gt(currentBalance)) {
        await this.deployer!.sendTransaction({ to: this.donationVault!.address, value: targetBalance.sub(currentBalance) });
    } else if (targetBalance.lt(currentBalance)) {
        // Cannot easily withdraw from DonationVault to reduce balance without owner/DAO action
        console.warn("Cannot reduce DonationVault ETH balance in a Given step easily.");
    }
    expect(await ethers.provider.getBalance(this.donationVault!.address)).to.equal(targetBalance);
});

When('{string} executes proposal {string}', async function (this: CustomWorld, executorName: string, proposalKey: string) {
    const executor = this.users[executorName];
    const proposalIdBN = (await getProposalIdBN(this, proposalKey))!;
    // Record recipient's balance before execution
    const proposalData = this.proposals[proposalKey];
    if (proposalData) { // Assuming emergencyWithdrawEther was used in calldata
        const recipientAddress = proposalData.callData.includes("emergencyWithdrawEther") ? utils.defaultAbiCoder.decode(['address', 'uint256'], utils.hexDataSlice(proposalData.callData, 4))[0] : this.users.Recipient.address;
        const recipientUser = Object.keys(this.users).find(key => this.users[key].address === recipientAddress) || "Recipient";
        this.userInitialETHBalances[recipientUser] = await ethers.provider.getBalance(recipientAddress);
    }

    try {
        this.lastTransaction = await this.governanceDAO!.connect(executor).executeProposal(proposalIdBN);
        this.lastReceipt = await this.lastTransaction.wait();
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

Then('{string} ETH balance should have increased by approximately {string} ETH', async function (this: CustomWorld, userName: string, ethAmountString: string) {
    const user = this.users[userName];
    const amount = parseETH(ethAmountString);
    const initialBalance = this.userInitialETHBalances[userName] || BigNumber.from(0);
    const finalBalance = await user.getBalance();
    expect(finalBalance).to.equal(initialBalance.add(amount)); // Assuming recipient pays no gas for receiving
});

Then('the DonationVault ETH balance should be {string} ETH', async function (this: CustomWorld, expectedEthBalanceString: string) {
    const expectedBalance = parseETH(expectedEthBalanceString);
    expect(await ethers.provider.getBalance(this.donationVault!.address)).to.equal(expectedBalance);
});


When('{string} attempts to execute proposal {string}', async function (this: CustomWorld, executorName: string, proposalKey: string) {
    // Same as successful execution, but result checked by failure step
    const executor = this.users[executorName];
    const proposalIdBN = (await getProposalIdBN(this, proposalKey))!;
    try {
        this.lastTransaction = await this.governanceDAO!.connect(executor).executeProposal(proposalIdBN);
        this.lastReceipt = await this.lastTransaction.wait();
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

Then('the proposal execution attempt should fail with message {string}', function (this: CustomWorld, expectedError: string) {
    expect(this.lastTransactionError).to.exist;
    expect((this.lastTransactionError as any).message).to.include(expectedError);
});

Then('the proposal execution attempt should fail', function (this: CustomWorld) { // For generic failure
    expect(this.lastTransactionError).to.exist;
});

Then('proposal {string} state should still be {string}', async function (this: CustomWorld, proposalKey: string, expectedState: string) {
    // Same as 'proposal {string} state should be {string}'
    const proposalIdBN = await getProposalIdBN(this, proposalKey);
    const proposal = await this.governanceDAO!.proposals(proposalIdBN!);
     const contractStateMap: { [key: string]: number } = {
        "Pending": 0, "Active": 1, "Succeeded": 2, "Defeated": 3,
        "Executed": 4, "Canceled": 5
    };
    expect(proposal.state).to.equal(contractStateMap[expectedState]);
});

// --- Cancellation ---
When('{string} cancels proposal {string}', async function (this: CustomWorld, cancellerName: string, proposalKey: string) {
    const canceller = this.users[cancellerName];
    const proposalIdBN = (await getProposalIdBN(this, proposalKey))!;
    try {
        this.lastTransaction = await this.governanceDAO!.connect(canceller).cancelProposal(proposalIdBN);
        this.lastReceipt = await this.lastTransaction.wait();
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

When('the deployer \\(owner) cancels proposal {string}', async function (this: CustomWorld, proposalKey: string) {
    const owner = this.deployer!;
    const proposalIdBN = (await getProposalIdBN(this, proposalKey))!;
    try {
        this.lastTransaction = await this.governanceDAO!.connect(owner).cancelProposal(proposalIdBN);
        this.lastReceipt = await this.lastTransaction.wait();
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

When('{string} attempts to cancel proposal {string}', async function (this: CustomWorld, userName: string, proposalKey: string) {
    const user = this.users[userName];
    const proposalIdBN = (await getProposalIdBN(this, proposalKey))!;
    try {
        this.lastTransaction = await this.governanceDAO!.connect(user).cancelProposal(proposalIdBN);
        this.lastReceipt = await this.lastTransaction.wait();
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

Then('the proposal cancellation attempt should fail with message {string}', function (this: CustomWorld, expectedError: string) {
    expect(this.lastTransactionError).to.exist;
    expect((this.lastTransactionError as any).message).to.include(expectedError);
});

// --- Admin Functions ---
When('the deployer \\(owner) sets the GovernanceDAO voting period to {string} days', async function (this: CustomWorld, days: string) {
    try {
        this.lastTransaction = await this.governanceDAO!.connect(this.deployer!).setVotingPeriod(daysToSeconds(parseInt(days)));
        this.lastReceipt = await this.lastTransaction.wait();
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

Then('an event {string} should have been emitted with {string} days', async function (this: CustomWorld, eventName: string, days: string) {
    await expect(this.lastTransaction).to.emit(this.governanceDAO!, eventName).withArgs(daysToSeconds(parseInt(days)));
});

When('{string} attempts to set the GovernanceDAO voting period to {string} days', async function (this: CustomWorld, userName: string, days: string) {
    const user = this.users[userName];
    try {
        this.lastTransaction = await this.governanceDAO!.connect(user).setVotingPeriod(daysToSeconds(parseInt(days)));
        this.lastReceipt = await this.lastTransaction.wait();
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

Then('the set voting period attempt should fail with message {string}', function (this: CustomWorld, expectedError: string) {
    expect(this.lastTransactionError).to.exist;
    expect((this.lastTransactionError as any).message).to.include(expectedError);
});

Then('the GovernanceDAO\'s voting period should still be {string} days', async function (this: CustomWorld, expectedDays: string) {
    // Same as 'the GovernanceDAO's voting period should be {string} days'
    expect(await this.governanceDAO!.votingPeriod()).to.equal(daysToSeconds(parseInt(expectedDays)));
});

When('the deployer \\(owner) sets the GovernanceDAO quorum percentage to {string}', async function (this: CustomWorld, quorum: string) {
     try {
        this.lastTransaction = await this.governanceDAO!.connect(this.deployer!).setQuorumPercentage(parseInt(quorum));
        this.lastReceipt = await this.lastTransaction.wait();
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

Then('an event {string} should have been emitted with {string}', async function (this: CustomWorld, eventName: string, value: string) {
    await expect(this.lastTransaction).to.emit(this.governanceDAO!, eventName).withArgs(parseInt(value));
});

When('the deployer \\(owner) sets the GovernanceDAO approval threshold to {string}', async function (this: CustomWorld, threshold: string) {
    try {
        this.lastTransaction = await this.governanceDAO!.connect(this.deployer!).setApprovalThreshold(parseInt(threshold));
        this.lastReceipt = await this.lastTransaction.wait();
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

// --- Update Proposal State Edge Cases ---
When('anyone attempts to update the state of proposal {string}', async function(this: CustomWorld, proposalKey: string) {
    const proposalIdBN = (await getProposalIdBN(this, proposalKey))!;
    const updater = this.users.Anyone;
    try {
        this.lastTransaction = await this.governanceDAO!.connect(updater).updateProposalStateAfterVoting(proposalIdBN);
        this.lastReceipt = await this.lastTransaction.wait();
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

Then('the update proposal state attempt should fail with message {string}', function(this: CustomWorld, expectedError: string) {
    expect(this.lastTransactionError).to.exist;
    expect((this.lastTransactionError as any).message).to.include(expectedError);
});


declare module '@cucumber/cucumber' {
    interface World extends CustomWorld {}
}
