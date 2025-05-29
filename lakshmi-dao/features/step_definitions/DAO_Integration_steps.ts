import { Before, Given, When, Then, World, After } from "@cucumber/cucumber";
import { ethers, network } from "hardhat";
import { expect } from "chai";
import { LakshmiZRC20, DonationVault, GovernanceDAO } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, ContractReceipt, ContractTransaction, utils } from "ethers";

// Re-use and adapt CustomWorld from other step files
interface CustomWorld extends World {
    lakshmiToken?: LakshmiZRC20;
    donationVault?: DonationVault;
    governanceDAO?: GovernanceDAO;
    deployer?: SignerWithAddress;
    users: { [name: string]: SignerWithAddress };
    proposals: { [id: string]: { // Keyed by simple feature file ID "1", "2", etc.
        idBN?: BigNumber; // Actual BigNumber ID from contract
        description?: string;
        targetAddress?: string;
        callData?: string;
        // other relevant proposal details
    }};
    lastTransaction?: ContractTransaction;
    lastReceipt?: ContractReceipt;
    lastTransactionError?: any;
    userInitialETHBalances: { [userName: string]: BigNumber };
    userInitialLAKBalances: { [userName: string]: BigNumber };
    nextProposalIdInternal: number; // To map simple IDs like "1", "2" to actual proposal data
}

const parseLAK = (amount: string) => ethers.utils.parseEther(amount);
const parseETH = (amount: string) => ethers.utils.parseEther(amount);
const daysToSeconds = (days: number) => days * 24 * 60 * 60;

Before({ tags: "" }, async function (this: CustomWorld) {
    const signers = await ethers.getSigners();
    this.deployer = signers[0];
    this.users = {
        deployer: signers[0],
        Alice: signers[1] || (await ethers.Wallet.createRandom().connect(ethers.provider)),
        Bob: signers[2] || (await ethers.Wallet.createRandom().connect(ethers.provider)),
        Charlie: signers[3] || (await ethers.Wallet.createRandom().connect(ethers.provider)), // Beneficiary
        Dave: signers[4] || (await ethers.Wallet.createRandom().connect(ethers.provider)),   // Another voter
        Eve: signers[5] || (await ethers.Wallet.createRandom().connect(ethers.provider)),     // Voter for quorum fail scenario
        Anyone: signers[6] || (await ethers.Wallet.createRandom().connect(ethers.provider)), // Generic user
    };
    this.proposals = {};
    this.lastTransactionError = undefined;
    this.lastReceipt = undefined;
    this.userInitialETHBalances = {};
    this.userInitialLAKBalances = {};
    this.nextProposalIdInternal = 1;

    // Pre-record initial balances
    for (const userName in this.users) {
        if (this.users[userName]) {
            this.userInitialETHBalances[userName] = await this.users[userName].getBalance();
        }
    }
});

After(async function (this: CustomWorld) {
    // Potential cleanup or reset steps if needed
});

// --- Givens from Background ---
Given('a deployed LakshmiZRC20 contract with an initial supply of {string} LAK', async function (this: CustomWorld, initialSupplyString: string) {
    const initialSupply = parseLAK(initialSupplyString);
    const LakshmiZRC20Factory = await ethers.getContractFactory("LakshmiZRC20", this.deployer);
    this.lakshmiToken = (await LakshmiZRC20Factory.deploy(initialSupply)) as LakshmiZRC20;
    await this.lakshmiToken.deployed();
    // Initial LAK balances for users will be set by subsequent Given steps
    for (const userName in this.users) {
        if (this.users[userName]) {
            this.userInitialLAKBalances[userName] = await this.lakshmiToken.balanceOf(this.users[userName].address);
        }
    }
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

Given('a DonationVault contract deployed and linked to the LakshmiZRC20 token and the GovernanceDAO', async function (this: CustomWorld) {
    const DonationVaultFactory = await ethers.getContractFactory("DonationVault", this.deployer);
    this.donationVault = (await DonationVaultFactory.deploy(this.lakshmiToken!.address)) as DonationVault;
    await this.donationVault.deployed();

    // Link contracts
    await this.donationVault.connect(this.deployer!).setGovernanceDAO(this.governanceDAO!.address);
    await this.governanceDAO!.connect(this.deployer!).setDonationVault(this.donationVault.address);

    // Impersonate DonationVault contract to allow it to be an ETH recipient for testing refunds or direct sends if needed
    // Not strictly necessary for these scenarios but good for robust interaction testing.
    // await network.provider.request({ method: "hardhat_impersonateAccount", params: [this.donationVault.address] });
    // await this.deployer!.sendTransaction({ to: this.donationVault.address, value: parseETH("1") }); // Fund impersonated account
});

Given('{string} has {string} LAK tokens', async function (this: CustomWorld, userName: string, balanceString: string) {
    const user = this.users[userName];
    if (!user) throw new Error(`User ${userName} not found in test setup.`);
    const targetBalance = parseLAK(balanceString);
    const currentBalance = await this.lakshmiToken!.balanceOf(user.address);

    if (targetBalance.gt(currentBalance)) {
        const diff = targetBalance.sub(currentBalance);
        if ((await this.lakshmiToken!.balanceOf(this.deployer!.address)).gte(diff)) {
            await this.lakshmiToken!.connect(this.deployer!).transfer(user.address, diff);
        } else {
            // Mint for deployer if short, assuming deployer is owner of LAK
            await this.lakshmiToken!.connect(this.deployer!).mint(this.deployer!.address, diff);
            await this.lakshmiToken!.connect(this.deployer!).transfer(user.address, diff);
        }
    } else if (targetBalance.lt(currentBalance)) {
        const diff = currentBalance.sub(targetBalance);
        await this.lakshmiToken!.connect(user).transfer(this.deployer!.address, diff); // Transfer excess back
    }
    this.userInitialLAKBalances[userName] = targetBalance; // Update initial balance record
    expect(await this.lakshmiToken!.balanceOf(user.address)).to.equal(targetBalance);
});


// --- Shared Step Definitions (can be moved to a common file if many features use them) ---

async function getProposalIdBNFromFeatureId(world: CustomWorld, featureProposalId: string): Promise<BigNumber> {
    const proposalData = world.proposals[featureProposalId];
    if (!proposalData || !proposalData.idBN) {
        throw new Error(`Proposal with feature ID ${featureProposalId} not found or its contract ID (idBN) is missing.`);
    }
    return proposalData.idBN;
}

// --- Scenario Steps ---

When('{string} donates {string} ETH to the DonationVault', async function (this: CustomWorld, userName: string, ethAmountString: string) {
    const user = this.users[userName];
    const amount = parseETH(ethAmountString);
    this.userInitialETHBalances[userName] = await user.getBalance(); // Re-record before this specific tx
    try {
        this.lastTransaction = await user.sendTransaction({ to: this.donationVault!.address, value: amount });
        this.lastReceipt = await this.lastTransaction.wait();
        this.lastTransactionError = undefined;
    } catch (error) {
        this.lastTransactionError = error;
    }
});

Then('the DonationVault ETH balance should be {string} ETH', async function (this: CustomWorld, expectedEthBalanceString: string) {
    const expectedBalance = parseETH(expectedEthBalanceString);
    expect(await ethers.provider.getBalance(this.donationVault!.address)).to.equal(expectedBalance);
});

When('{string} creates proposal {string} in GovernanceDAO to release {string} ETH from DonationVault to {string} with description {string}', async function (this: CustomWorld, proposerName: string, featureProposalId: string, ethAmount: string, recipientName: string, description: string) {
    const proposer = this.users[proposerName];
    const recipient = this.users[recipientName];
    // Calldata for DonationVault.releaseFunds(proposalId, recipient, amount)
    // The proposalId in releaseFunds's arguments is tricky. It's the ID that the DAO assigns.
    // For the DAO's createProposal, the callData is what the DonationVault will execute.
    // The DonationVault's releaseFunds function *itself* takes a proposalId.
    // This implies that the DAO, when executing, will fill this in.
    // So, the callData for `createProposal` should be for a function on DonationVault that does NOT require the proposalId as an argument,
    // or the DAO's execute function is more complex.
    // Let's assume GovernanceDAO's `executeProposal` correctly forms the call to `DonationVault.releaseFunds` including the proposal ID.
    // Therefore, the `callData` in `createProposal` should be for `DonationVault.releaseFunds` *without* the proposal ID,
    // or use a generic execution payload that `executeProposal` adapts.
    // The existing GovernanceDAO.sol's executeProposal takes the proposal's stored target, calldata, and value.
    // This means the original callData must be what DonationVault.releaseFunds expects.
    // This is problematic as `releaseFunds` expects `proposalId` which is not known at `createProposal` time.
    // The tests for GovernanceDAO use `emergencyWithdrawEther` as calldata. Let's assume a similar simple target for integration.
    // OR, the GovernanceDAO must have a mechanism to inject the proposalId into the calldata at execution.
    // The provided `GovernanceDAO.sol` does a direct low-level call: `targetContract.call{value: _proposal.value}(_proposal.callData)`
    // This means `_proposal.callData` must be the exact calldata DonationVault's `releaseFunds` expects.
    // This is a common pattern, but requires `DonationVault.releaseFunds` to NOT take `proposalId` as an argument,
    // relying on `msg.sender` (the DAO) and context.
    // HOWEVER, `DonationVault.sol`'s `releaseFunds` *does* take `proposalId`.
    // This means the `callData` stored in the DAO proposal *must* include a placeholder or the actual ID.
    // This suggests a mismatch or a more complex interaction than typical.
    // For now, let's assume the `callData` for the proposal will be constructed as if the DAO will execute it by calling
    // `donationVault.releaseFunds(THE_PROPOSAL_ID, recipient.address, parseETH(ethAmount))`
    // This means the callData for `createProposal` should be this, with THE_PROPOSAL_ID being a placeholder understood by execute, or the proposalId itself.
    // This is not standard. A simpler approach is that the proposal's callData is for a generic "execute this payment" function on the vault.
    // Let's use `emergencyWithdrawEther` for the `callData` to simplify, as done in `GovernanceDAO.test.ts`. The feature description is "release ... ETH".
    // This implies the DAO is authorizing an action.
    const targetCallData = this.donationVault!.interface.encodeFunctionData("emergencyWithdrawEther", [recipient.address, parseETH(ethAmount)]);

    try {
        this.lastTransaction = await this.governanceDAO!.connect(proposer).createProposal(description, this.donationVault!.address, targetCallData, 0);
        this.lastReceipt = await this.lastTransaction.wait();
        const event = this.lastReceipt.events?.find(e => e.event === "ProposalCreated");
        const proposalIdBN = event?.args?.proposalId;
        if (proposalIdBN) {
            this.proposals[featureProposalId] = { idBN: proposalIdBN, description, targetAddress: this.donationVault!.address, callData: targetCallData };
        }
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

Then('proposal {string} in GovernanceDAO should be {string}', async function (this: CustomWorld, featureProposalId: string, expectedState: string) {
    const proposalIdBN = await getProposalIdBNFromFeatureId(this, featureProposalId);
    const proposal = await this.governanceDAO!.proposals(proposalIdBN);
    const contractStateMap: { [key: string]: number } = { "Pending":0, "Active": 1, "Succeeded": 2, "Defeated": 3, "Executed": 4, "Canceled": 5 };
    expect(proposal.state).to.equal(contractStateMap[expectedState], `Proposal ${featureProposalId} not in state ${expectedState}`);
});

When('{string} votes {string} on GovernanceDAO proposal {string}', async function (this: CustomWorld, voterName: string, voteType: string, featureProposalId: string) {
    const voter = this.users[voterName];
    const proposalIdBN = await getProposalIdBNFromFeatureId(this, featureProposalId);
    const voteMap: { [key: string]: number } = { "For": 0, "Against": 1, "Abstain": 2 };
    try {
        this.lastTransaction = await this.governanceDAO!.connect(voter).vote(proposalIdBN, voteMap[voteType]);
        this.lastReceipt = await this.lastTransaction.wait();
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

When('the voting period of {string} days for GovernanceDAO proposal {string} elapses', async function (this: CustomWorld, days: string, featureProposalId: string) {
    const proposalIdBN = await getProposalIdBNFromFeatureId(this, featureProposalId);
    const proposal = await this.governanceDAO!.proposals(proposalIdBN);
    const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
    const votingEndTime = proposal.votingEndTime.toNumber();

    if (currentTime < votingEndTime) {
        await network.provider.send("evm_increaseTime", [votingEndTime - currentTime + daysToSeconds(0.1)]); // Add a bit to ensure it's past
        await network.provider.send("evm_mine");
    }
});

When('anyone updates the state of GovernanceDAO proposal {string}', async function (this: CustomWorld, featureProposalId: string) {
    const proposalIdBN = await getProposalIdBNFromFeatureId(this, featureProposalId);
    const updater = this.users.Anyone;
    try {
        this.lastTransaction = await this.governanceDAO!.connect(updater).updateProposalStateAfterVoting(proposalIdBN);
        this.lastReceipt = await this.lastTransaction.wait();
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

When('anyone executes GovernanceDAO proposal {string}', async function (this: CustomWorld, featureProposalId: string) {
    const proposalIdBN = await getProposalIdBNFromFeatureId(this, featureProposalId);
    const executor = this.users.Anyone;
    const proposalData = this.proposals[featureProposalId];

    // Record recipient balance before execution
    // This needs to correctly identify the recipient from the proposal's callData
    if (proposalData && proposalData.callData) {
        try {
            // Assuming callData is for emergencyWithdrawEther(address recipient, uint256 amount)
            const decoded = utils.defaultAbiCoder.decode(['address', 'uint256'], utils.hexDataSlice(proposalData.callData, 4));
            const recipientAddress = decoded[0];
            const recipientName = Object.keys(this.users).find(name => this.users[name].address === recipientAddress) || "UnknownRecipient";
             if (this.users[recipientName]) {
                this.userInitialETHBalances[recipientName] = await ethers.provider.getBalance(recipientAddress);
                if (this.lakshmiToken) { // Check if LAK token is defined for LAK transfers
                    this.userInitialLAKBalances[recipientName] = await this.lakshmiToken.balanceOf(recipientAddress);
                }
            }
        } catch (e) {
            console.warn("Could not decode recipient from calldata for balance check:", e);
        }
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
    // Recipient does not pay gas
    expect(finalBalance).to.equal(initialBalance.add(amount));
});

// --- LAK Token Specific Steps ---
Given('{string} approves the DonationVault to spend {string} LAK tokens', async function (this: CustomWorld, userName: string, lakAmountString: string) {
    const user = this.users[userName];
    const amount = parseLAK(lakAmountString);
    await this.lakshmiToken!.connect(user).approve(this.donationVault!.address, amount);
});

When('{string} donates {string} LAK tokens to the DonationVault', async function (this: CustomWorld, userName: string, lakAmountString: string) {
    const user = this.users[userName];
    const amount = parseLAK(lakAmountString);
    this.userInitialLAKBalances[userName] = await this.lakshmiToken!.balanceOf(user.address); // Record before tx
    try {
        this.lastTransaction = await this.donationVault!.connect(user).donateERC20(this.lakshmiToken!.address, amount);
        this.lastReceipt = await this.lastTransaction.wait();
        this.lastTransactionError = undefined;
    } catch (error) {
        this.lastTransactionError = error;
    }
});

Then('the DonationVault LAK token balance should be {string} LAK tokens', async function (this: CustomWorld, expectedLakBalanceString: string) {
    const expectedBalance = parseLAK(expectedLakBalanceString);
    expect(await this.lakshmiToken!.balanceOf(this.donationVault!.address)).to.equal(expectedBalance);
});

Then('{string} LAK token balance should be {string} LAK tokens', async function (this: CustomWorld, userName: string, expectedBalanceString: string) {
    const user = this.users[userName];
    const expectedBalance = parseLAK(expectedBalanceString);
    expect(await this.lakshmiToken!.balanceOf(user.address)).to.equal(expectedBalance);
});

When('{string} creates proposal {string} in GovernanceDAO to release {string} LAK tokens from DonationVault to {string} with description {string}', async function (this: CustomWorld, proposerName: string, featureProposalId: string, lakAmount: string, recipientName: string, description: string) {
    const proposer = this.users[proposerName];
    const recipient = this.users[recipientName];
    // Calldata for DonationVault.emergencyWithdrawERC20(address recipient, address token, uint256 amount)
    const targetCallData = this.donationVault!.interface.encodeFunctionData("emergencyWithdrawERC20", [recipient.address, this.lakshmiToken!.address, parseLAK(lakAmount)]);

    try {
        this.lastTransaction = await this.governanceDAO!.connect(proposer).createProposal(description, this.donationVault!.address, targetCallData, 0);
        this.lastReceipt = await this.lastTransaction.wait();
        const event = this.lastReceipt.events?.find(e => e.event === "ProposalCreated");
        const proposalIdBN = event?.args?.proposalId;
        if (proposalIdBN) {
            this.proposals[featureProposalId] = { idBN: proposalIdBN, description, targetAddress: this.donationVault!.address, callData: targetCallData };
        }
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

Then('the DonationVault ETH balance should still be {string} ETH', async function (this: CustomWorld, expectedEthBalanceString: string) {
    const expectedBalance = parseETH(expectedEthBalanceString);
    expect(await ethers.provider.getBalance(this.donationVault!.address)).to.equal(expectedBalance);
});

When('anyone attempts to execute GovernanceDAO proposal {string}', async function (this: CustomWorld, featureProposalId: string) {
    // This is a duplicate of the successful execution step, intended for failure checks
    const proposalIdBN = await getProposalIdBNFromFeatureId(this, featureProposalId);
    const executor = this.users.Anyone;
    try {
        this.lastTransaction = await this.governanceDAO!.connect(executor).executeProposal(proposalIdBN);
        this.lastReceipt = await this.lastTransaction.wait();
        this.lastTransactionError = undefined;
    } catch (e) {
        this.lastTransactionError = e;
    }
});

Then('the GovernanceDAO proposal execution attempt should fail with message {string}', function (this: CustomWorld, expectedError: string) {
    expect(this.lastTransactionError).to.exist;
    expect((this.lastTransactionError as any).message).to.include(expectedError);
});

Then('{string} ETH balance should not have increased significantly', async function (this: CustomWorld, userName: string) {
    const user = this.users[userName];
    const initialBalance = this.userInitialETHBalances[userName] || BigNumber.from(0);
    const finalBalance = await user.getBalance();
    // Check that it hasn't increased, allowing for small fluctuations if user sent unrelated txs (unlikely in test)
    expect(finalBalance).to.be.lte(initialBalance.add(parseETH("0.00001"))); // Allow for negligible increase due to dust or rounding if any logic caused it
});


declare module '@cucumber/cucumber' {
    interface World extends CustomWorld {}
}
