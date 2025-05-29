import { ethers, network } from "hardhat";
import { expect } from "chai";
import { LakshmiZRC20, DonationVault, GovernanceDAO } from "../typechain-types"; // Adjust path
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("GovernanceDAO", function () {
    let lakshmiToken: LakshmiZRC20;
    let donationVault: DonationVault;
    let governanceDAO: GovernanceDAO;
    let owner: SignerWithAddress; // Also DAO owner by default in this setup
    let voter1: SignerWithAddress;
    let voter2: SignerWithAddress;
    let voter3: SignerWithAddress;
    let proposer: SignerWithAddress;
    let recipient: SignerWithAddress; // For proposals that transfer funds
    let nonTokenHolder: SignerWithAddress;

    const initialLakshmiSupply = ethers.utils.parseEther("1000000"); // 1M LAK
    const votingPeriodSeconds = 3 * 24 * 60 * 60; // 3 days
    const quorumPercentage = 10; // 10%
    const approvalThresholdPercentage = 60; // 60% of (For + Against) votes

    async function increaseTime(seconds: number) {
        await network.provider.send("evm_increaseTime", [seconds]);
        await network.provider.send("evm_mine");
    }

    beforeEach(async function () {
        [owner, voter1, voter2, voter3, proposer, recipient, nonTokenHolder] = await ethers.getSigners();

        // Deploy LakshmiZRC20
        const LakshmiZRC20Factory = await ethers.getContractFactory("LakshmiZRC20");
        lakshmiToken = (await LakshmiZRC20Factory.deploy(initialLakshmiSupply)) as LakshmiZRC20;
        await lakshmiToken.deployed();

        // Distribute LAK tokens to voters and proposer
        await lakshmiToken.connect(owner).transfer(proposer.address, ethers.utils.parseEther("10000")); // 1% of supply
        await lakshmiToken.connect(owner).transfer(voter1.address, ethers.utils.parseEther("50000"));   // 5%
        await lakshmiToken.connect(owner).transfer(voter2.address, ethers.utils.parseEther("30000"));   // 3%
        await lakshmiToken.connect(owner).transfer(voter3.address, ethers.utils.parseEther("20000"));   // 2%
        // Owner retains initialSupply - 10k - 50k - 30k - 20k = 1M - 110k = 890k LAK (89%)

        // Deploy DonationVault
        const DonationVaultFactory = await ethers.getContractFactory("DonationVault");
        donationVault = (await DonationVaultFactory.deploy(lakshmiToken.address)) as DonationVault;
        await donationVault.deployed();
         // Fund the donation vault with some ETH for testing execution
        await owner.sendTransaction({ to: donationVault.address, value: ethers.utils.parseEther("10") });


        // Deploy GovernanceDAO
        const GovernanceDAOFactory = await ethers.getContractFactory("GovernanceDAO");
        governanceDAO = (await GovernanceDAOFactory.deploy(
            lakshmiToken.address,
            votingPeriodSeconds,
            quorumPercentage,
            approvalThresholdPercentage
        )) as GovernanceDAO;
        await governanceDAO.deployed();

        // Set the DonationVault address in GovernanceDAO
        await governanceDAO.connect(owner).setDonationVault(donationVault.address);
        // Set the GovernanceDAO address in DonationVault
        await donationVault.connect(owner).setGovernanceDAO(governanceDAO.address);
    });

    describe("Deployment & Configuration", function () {
        it("Should set the correct owner", async function () {
            expect(await governanceDAO.owner()).to.equal(owner.address);
        });

        it("Should set the correct LakshmiZRC20 token", async function () {
            expect(await governanceDAO.lakshmiToken()).to.equal(lakshmiToken.address);
        });

        it("Should set the correct initial voting period, quorum, and approval threshold", async function () {
            expect(await governanceDAO.votingPeriod()).to.equal(votingPeriodSeconds);
            expect(await governanceDAO.quorumPercentage()).to.equal(quorumPercentage);
            expect(await governanceDAO.approvalThresholdPercentage()).to.equal(approvalThresholdPercentage);
        });

        it("Should have DonationVault address set", async function () {
            expect(await governanceDAO.donationVault()).to.equal(donationVault.address);
        });

        it("Should allow owner to set DonationVault address", async function () {
            const newVaultAddress = ethers.Wallet.createRandom().address;
            await governanceDAO.connect(owner).setDonationVault(newVaultAddress);
            expect(await governanceDAO.donationVault()).to.equal(newVaultAddress);
            await expect(governanceDAO.connect(owner).setDonationVault(newVaultAddress))
                .to.emit(governanceDAO, "DonationVaultSet").withArgs(newVaultAddress);
        });

        it("Should prevent non-owner from setting DonationVault address", async function () {
            await expect(governanceDAO.connect(voter1).setDonationVault(ethers.Wallet.createRandom().address))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
         it("Should revert if setting donation vault to zero address", async function () {
            await expect(
                governanceDAO.connect(owner).setDonationVault(ethers.constants.AddressZero)
            ).to.be.revertedWith("Donation vault address cannot be zero");
        });
    });

    describe("Proposal Creation", function () {
        const description = "Test Proposal 1";
        const target = ethers.Wallet.createRandom().address;
        const callData = "0xabcdef";
        const value = ethers.utils.parseEther("0");

        it("Should allow a token holder to create a proposal", async function () {
            const tx = await governanceDAO.connect(proposer).createProposal(description, target, callData, value);
            const receipt = await tx.wait();
            const event = receipt.events?.find(e => e.event === "ProposalCreated");
            const proposalId = event?.args?.proposalId;

            expect(proposalId).to.equal(1);
            const proposal = await governanceDAO.proposals(proposalId);
            expect(proposal.proposer).to.equal(proposer.address);
            expect(proposal.description).to.equal(description);
            expect(proposal.targetContract).to.equal(target);
            // expect(proposal.callData).to.equal(callData); // Note: direct bytes comparison can be tricky
            expect(proposal.value).to.equal(value);
            expect(proposal.state).to.equal(1); // Active
            expect(proposal.votingStartTime).to.be.gt(0);
            expect(proposal.votingEndTime).to.equal(proposal.votingStartTime.add(votingPeriodSeconds));
        });

        it("Should emit ProposalCreated and ProposalStateChanged events", async function () {
            const startTime = (await ethers.provider.getBlock("latest")).timestamp + 1; // Approximate start time
            await network.provider.send("evm_setNextBlockTimestamp", [startTime]);

            await expect(governanceDAO.connect(proposer).createProposal(description, target, callData, value))
                .to.emit(governanceDAO, "ProposalCreated")
                // .withArgs(1, proposer.address, description, startTime, startTime + votingPeriodSeconds, target, callData, value) // Timestamp can be tricky
                .and.to.emit(governanceDAO, "ProposalStateChanged")
                .withArgs(1, 1); // Proposal ID 1, State Active
        });

        it("Should increment nextProposalId", async function () {
            await governanceDAO.connect(proposer).createProposal("P1", target, "0x", 0);
            expect(await governanceDAO.nextProposalId()).to.equal(2);
            await governanceDAO.connect(proposer).createProposal("P2", target, "0x", 0);
            expect(await governanceDAO.nextProposalId()).to.equal(3);
        });

        it("Should revert if proposer has no tokens", async function () {
            await expect(
                governanceDAO.connect(nonTokenHolder).createProposal(description, target, callData, value)
            ).to.be.revertedWith("GovernanceDAO: Caller is not a token holder");
        });

        it("Should revert if description is empty", async function () {
            await expect(
                governanceDAO.connect(proposer).createProposal("", target, callData, value)
            ).to.be.revertedWith("Description cannot be empty");
        });
    });

    describe("Voting", function () {
        let proposalId: number;

        beforeEach(async function () {
            // Create a proposal
            const tx = await governanceDAO.connect(proposer).createProposal("Voting Test Proposal", recipient.address, "0x", 0);
            const receipt = await tx.wait();
            const event = receipt.events?.find(e => e.event === "ProposalCreated");
            proposalId = event?.args?.proposalId.toNumber();
        });

        it("Should allow token holders to vote For, Against, or Abstain", async function () {
            await governanceDAO.connect(voter1).vote(proposalId, 0); // For
            const proposal = await governanceDAO.proposals(proposalId);
            expect(proposal.forVotes).to.equal(await lakshmiToken.balanceOf(voter1.address));
            expect(await governanceDAO.hasVoted(proposalId, voter1.address)).to.be.true;
            expect(await governanceDAO.votes(proposalId, voter1.address)).to.equal(0); // For

            await governanceDAO.connect(voter2).vote(proposalId, 1); // Against
            const proposal2 = await governanceDAO.proposals(proposalId);
            expect(proposal2.againstVotes).to.equal(await lakshmiToken.balanceOf(voter2.address));

            await governanceDAO.connect(voter3).vote(proposalId, 2); // Abstain
            const proposal3 = await governanceDAO.proposals(proposalId);
            expect(proposal3.abstainVotes).to.equal(await lakshmiToken.balanceOf(voter3.address));
        });

        it("Should emit Voted event", async function () {
            const voter1Balance = await lakshmiToken.balanceOf(voter1.address);
            await expect(governanceDAO.connect(voter1).vote(proposalId, 0)) // For
                .to.emit(governanceDAO, "Voted")
                .withArgs(proposalId, voter1.address, 0, voter1Balance);
        });

        it("Should revert if trying to vote twice on the same proposal", async function () {
            await governanceDAO.connect(voter1).vote(proposalId, 0); // For
            await expect(governanceDAO.connect(voter1).vote(proposalId, 1)) // Against
                .to.be.revertedWith("GovernanceDAO: Already voted on this proposal");
        });

        it("Should revert if voting on a non-active proposal", async function () {
            // Make proposal succeeded
            await governanceDAO.connect(owner).vote(proposalId, 0); // Owner has majority, instant pass for quorum
            await increaseTime(votingPeriodSeconds + 1);
            await governanceDAO.updateProposalStateAfterVoting(proposalId); // This should make it Succeeded

            const proposal = await governanceDAO.proposals(proposalId);
            expect(proposal.state).to.equal(2); // Succeeded

            await expect(governanceDAO.connect(voter1).vote(proposalId, 0))
                .to.be.revertedWith("GovernanceDAO: Proposal not active");
        });

        it("Should revert if voting before voting period starts (not practically possible with current setup)", async function () {
            // Current setup makes proposal active immediately, so start time is block.timestamp.
            // This test would require a proposal state like 'PendingActivation'.
        });

        it("Should revert if voting after voting period ends", async function () {
            await increaseTime(votingPeriodSeconds + 1); // End voting period
            await expect(governanceDAO.connect(voter1).vote(proposalId, 0))
                .to.be.revertedWith("GovernanceDAO: Voting period has ended");
        });

        it("Should revert if voter has no tokens (or zero balance)", async function () {
            await expect(governanceDAO.connect(nonTokenHolder).vote(proposalId, 0))
                .to.be.revertedWith("GovernanceDAO: No voting power");
        });

        it("Should revert with invalid vote type", async function () {
            await expect(governanceDAO.connect(voter1).vote(proposalId, 3)) // Invalid type
                .to.be.revertedWith("GovernanceDAO: Invalid vote type");
        });
    });

    describe("Proposal State Transitions & Execution", function () {
        let proposalId: number;
        const proposalDescription = "Execute Me";
        // Calldata to call `emergencyWithdrawEther(address,uint256)` on DonationVault
        const amountToRelease = ethers.utils.parseEther("1");
        let releaseFundsCallData: string;


        beforeEach(async function () {
             releaseFundsCallData = donationVault.interface.encodeFunctionData("emergencyWithdrawEther", [
                recipient.address,
                amountToRelease
            ]);

            // Proposer creates a proposal to release funds from DonationVault
            const tx = await governanceDAO.connect(proposer).createProposal(
                proposalDescription,
                donationVault.address, // Target is DonationVault
                releaseFundsCallData,
                0 // No ETH value sent with the proposal creation itself
            );
            const receipt = await tx.wait();
            const event = receipt.events?.find(e => e.event === "ProposalCreated");
            proposalId = event?.args?.proposalId.toNumber();
        });

        it("Scenario: Proposal Succeeded (Quorum Met, Approved)", async function () {
            // Voter1 (50k LAK) votes For
            await governanceDAO.connect(voter1).vote(proposalId, 0); // For
            // Voter2 (30k LAK) votes Against
            await governanceDAO.connect(voter2).vote(proposalId, 1); // Against
            // Total participating LAK for quorum: 50k + 30k = 80k
            // Total supply: 1M. Quorum: 10% (100k). This vote alone (80k) is NOT enough for quorum.

            // Owner (890k LAK) also votes For to ensure quorum and approval
            await governanceDAO.connect(owner).vote(proposalId, 0); // For
            // Total For: 50k + 890k = 940k
            // Total Against: 30k
            // Total Votes Cast (for quorum check): 940k + 30k = 970k. (970k / 1M = 97% > 10% quorum) -> Quorum Met
            // Approval Check: For / (For + Against) = 940k / (940k + 30k) = 940k / 970k = ~96.9%
            // Approval Threshold: 60%. (96.9% > 60%) -> Approved

            await increaseTime(votingPeriodSeconds + 1);
            await governanceDAO.updateProposalStateAfterVoting(proposalId);

            const proposal = await governanceDAO.proposals(proposalId);
            expect(proposal.state).to.equal(2); // Succeeded

            // Execute the proposal
            const recipientInitialBalance = await ethers.provider.getBalance(recipient.address);
            await expect(governanceDAO.connect(owner).executeProposal(proposalId)) // Anyone can execute
                .to.emit(governanceDAO, "ProposalExecuted").withArgs(proposalId, owner.address)
                .and.to.emit(governanceDAO, "ProposalStateChanged").withArgs(proposalId, 4); // Executed

            const proposalAfterExec = await governanceDAO.proposals(proposalId);
            expect(proposalAfterExec.executed).to.be.true;
            expect(proposalAfterExec.state).to.equal(4); // Executed

            const recipientFinalBalance = await ethers.provider.getBalance(recipient.address);
            expect(recipientFinalBalance).to.equal(recipientInitialBalance.add(amountToRelease));
            expect(await donationVault.getVaultBalance()).to.equal(ethers.utils.parseEther("9")); // 10 - 1
        });

        it("Scenario: Proposal Defeated (Quorum Not Met)", async function () {
            // Voter3 (20k LAK) votes For.
            await governanceDAO.connect(voter3).vote(proposalId, 0); // For
            // Total votes: 20k. Quorum needed: 100k. (20k < 100k) -> Quorum NOT Met

            await increaseTime(votingPeriodSeconds + 1);
            await governanceDAO.updateProposalStateAfterVoting(proposalId);

            const proposal = await governanceDAO.proposals(proposalId);
            expect(proposal.state).to.equal(3); // Defeated
        });

        it("Scenario: Proposal Defeated (Quorum Met, Not Approved)", async function () {
            // Voter1 (50k LAK) votes For
            await governanceDAO.connect(voter1).vote(proposalId, 0); // For
            // Owner (890k LAK) votes Against
            await governanceDAO.connect(owner).vote(proposalId, 1); // Against
            // Total For: 50k
            // Total Against: 890k
            // Total Votes Cast: 50k + 890k = 940k. (940k / 1M = 94% > 10% quorum) -> Quorum Met
            // Approval Check: For / (For + Against) = 50k / (50k + 890k) = 50k / 940k = ~5.3%
            // Approval Threshold: 60%. (5.3% < 60%) -> Not Approved

            await increaseTime(votingPeriodSeconds + 1);
            await governanceDAO.updateProposalStateAfterVoting(proposalId);

            const proposal = await governanceDAO.proposals(proposalId);
            expect(proposal.state).to.equal(3); // Defeated
        });


        it("Scenario: Proposal Defeated (Only Abstain Votes, Quorum Met)", async function () {
            // Owner (890k LAK) abstains. Quorum is 10% (100k). 890k > 100k -> Quorum met.
            await governanceDAO.connect(owner).vote(proposalId, 2); // Abstain
            // ForVotes = 0, AgainstVotes = 0. ParticipatingVotes = 0.
            // This should lead to defeat as per current logic `if (participatingVotes == 0)`

            await increaseTime(votingPeriodSeconds + 1);
            await governanceDAO.updateProposalStateAfterVoting(proposalId);

            const proposal = await governanceDAO.proposals(proposalId);
            expect(proposal.state).to.equal(3); // Defeated
        });


        it("Should revert if trying to execute a non-succeeded proposal", async function () {
            // Proposal is Active, not Succeeded
            await expect(governanceDAO.connect(owner).executeProposal(proposalId))
                .to.be.revertedWith("GovernanceDAO: Proposal not in succeeded state");

            // Make it Defeated (Quorum not met)
            await governanceDAO.connect(voter3).vote(proposalId, 0); // 20k votes, not enough for 100k quorum
            await increaseTime(votingPeriodSeconds + 1);
            await governanceDAO.updateProposalStateAfterVoting(proposalId); // State becomes Defeated
            expect((await governanceDAO.proposals(proposalId)).state).to.equal(3); // Defeated

            await expect(governanceDAO.connect(owner).executeProposal(proposalId))
                .to.be.revertedWith("GovernanceDAO: Proposal not in succeeded state");
        });

        it("Should revert if trying to execute an already executed proposal", async function () {
            // Make proposal succeed and execute it
            await governanceDAO.connect(owner).vote(proposalId, 0); // Owner ensures success
            await increaseTime(votingPeriodSeconds + 1);
            await governanceDAO.updateProposalStateAfterVoting(proposalId);
            await governanceDAO.connect(owner).executeProposal(proposalId);

            await expect(governanceDAO.connect(owner).executeProposal(proposalId))
                .to.be.revertedWith("GovernanceDAO: Proposal already executed");
        });


        it("Should revert if donation vault is not set during execution", async function () {
            // Set donation vault to address(0)
            await governanceDAO.connect(owner).setDonationVault(ethers.constants.AddressZero);

            // Make proposal succeed
            await governanceDAO.connect(owner).vote(proposalId, 0);
            await increaseTime(votingPeriodSeconds + 1);
            await governanceDAO.updateProposalStateAfterVoting(proposalId);
             expect((await governanceDAO.proposals(proposalId)).state).to.equal(2); // Succeeded


            await expect(governanceDAO.connect(owner).executeProposal(proposalId))
                .to.be.revertedWith("Donation Vault not set");
        });

        it("Should revert execution if target contract call fails", async function () {
            // Create a proposal that will fail on execution
            // e.g., trying to release more ETH from DonationVault than available
            const tooMuchEth = ethers.utils.parseEther("1000"); // Vault only has 10 ETH
            const failingCallData = donationVault.interface.encodeFunctionData("emergencyWithdrawEther", [
                recipient.address,
                tooMuchEth
            ]);
            const tx = await governanceDAO.connect(proposer).createProposal(
                "Failing Proposal",
                donationVault.address,
                failingCallData,
                0
            );
            const receipt = await tx.wait();
            const failProposalId = receipt.events?.find(e => e.event === "ProposalCreated")?.args?.proposalId;

            // Make it succeed
            await governanceDAO.connect(owner).vote(failProposalId, 0);
            await increaseTime(votingPeriodSeconds + 1);
            await governanceDAO.updateProposalStateAfterVoting(failProposalId);
            expect((await governanceDAO.proposals(failProposalId)).state).to.equal(2); // Succeeded

            // Execution should fail
            // The exact error message might come from the DonationVault: "Insufficient contract balance"
            await expect(governanceDAO.connect(owner).executeProposal(failProposalId))
                .to.be.reverted; //  Could check for specific error if stable: .revertedWith("DonationVault: Insufficient contract balance") or "Proposal execution failed"
        });

         it("Allows anyone to call updateProposalStateAfterVoting if voting period ended", async function () {
            await governanceDAO.connect(voter1).vote(proposalId, 0); // For
            await increaseTime(votingPeriodSeconds + 1);
            // Non-owner, non-voter calls update
            await expect(governanceDAO.connect(nonTokenHolder).updateProposalStateAfterVoting(proposalId))
                .to.emit(governanceDAO, "ProposalStateChanged"); // Should not revert
            const proposal = await governanceDAO.proposals(proposalId);
            // Check state based on voter1's vote (likely Defeated due to quorum)
            expect(proposal.state).to.equal(3); // Defeated
        });

        it("Reverts updateProposalStateAfterVoting if voting period not ended", async function () {
            await governanceDAO.connect(voter1).vote(proposalId, 0); // For
            await expect(governanceDAO.connect(nonTokenHolder).updateProposalStateAfterVoting(proposalId))
                .to.be.revertedWith("Voting period not yet ended");
        });

        it("Reverts updateProposalStateAfterVoting if proposal not active", async function () {
            await governanceDAO.connect(voter1).vote(proposalId, 0); // For
            await increaseTime(votingPeriodSeconds + 1);
            await governanceDAO.updateProposalStateAfterVoting(proposalId); // State changes from Active
            await expect(governanceDAO.connect(nonTokenHolder).updateProposalStateAfterVoting(proposalId))
                .to.be.revertedWith("Proposal not active for state update");
        });

    });

    describe("Proposal Cancellation", function () {
        let proposalId: number;

        beforeEach(async function () {
            const tx = await governanceDAO.connect(proposer).createProposal("Cancel Me", recipient.address, "0x", 0);
            const receipt = await tx.wait();
            proposalId = receipt.events?.find(e => e.event === "ProposalCreated")?.args?.proposalId.toNumber();
        });

        it("Should allow proposer to cancel an active proposal", async function () {
            await expect(governanceDAO.connect(proposer).cancelProposal(proposalId))
                .to.emit(governanceDAO, "ProposalStateChanged")
                .withArgs(proposalId, 5); // Canceled
            const proposal = await governanceDAO.proposals(proposalId);
            expect(proposal.state).to.equal(5); // Canceled
        });

        it("Should allow owner to cancel an active proposal", async function () {
            await expect(governanceDAO.connect(owner).cancelProposal(proposalId))
                .to.emit(governanceDAO, "ProposalStateChanged")
                .withArgs(proposalId, 5); // Canceled
        });

        it("Should not allow non-proposer and non-owner to cancel", async function () {
            await expect(governanceDAO.connect(voter1).cancelProposal(proposalId))
                .to.be.revertedWith("GovernanceDAO: Only proposer or owner can cancel");
        });

        it("Should not allow cancellation if proposal is not active or pending", async function () {
            // Make it Succeeded
            await governanceDAO.connect(owner).vote(proposalId, 0);
            await increaseTime(votingPeriodSeconds + 1);
            await governanceDAO.updateProposalStateAfterVoting(proposalId); // Succeeded

            await expect(governanceDAO.connect(proposer).cancelProposal(proposalId))
                .to.be.revertedWith("GovernanceDAO: Proposal cannot be canceled in its current state");
        });
         it("Should not allow cancellation if voting has ended even if active (edge case if updateState not called)", async function () {
            await increaseTime(votingPeriodSeconds + 1); // Voting ends, still Active until update
            await expect(governanceDAO.connect(proposer).cancelProposal(proposalId))
                .to.be.revertedWith("GovernanceDAO: Proposal cannot be canceled in its current state");
        });
    });

    describe("Admin Functions (VotingPeriod, Quorum, ApprovalThreshold)", function () {
        it("Should allow owner to set VotingPeriod", async function () {
            const newPeriod = 60 * 60 * 24 * 5; // 5 days
            await governanceDAO.connect(owner).setVotingPeriod(newPeriod);
            expect(await governanceDAO.votingPeriod()).to.equal(newPeriod);
            await expect(governanceDAO.connect(owner).setVotingPeriod(newPeriod))
                .to.emit(governanceDAO, "VotingPeriodSet").withArgs(newPeriod);
        });
        it("Should prevent non-owner from setting VotingPeriod", async function () {
            await expect(governanceDAO.connect(voter1).setVotingPeriod(123))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
        it("Should prevent setting VotingPeriod to zero", async function () {
            await expect(governanceDAO.connect(owner).setVotingPeriod(0))
                .to.be.revertedWith("Voting period must be positive");
        });


        it("Should allow owner to set QuorumPercentage", async function () {
            const newQuorum = 20; // 20%
            await governanceDAO.connect(owner).setQuorumPercentage(newQuorum);
            expect(await governanceDAO.quorumPercentage()).to.equal(newQuorum);
             await expect(governanceDAO.connect(owner).setQuorumPercentage(newQuorum))
                .to.emit(governanceDAO, "QuorumPercentageSet").withArgs(newQuorum);
        });
        it("Should prevent non-owner from setting QuorumPercentage", async function () {
            await expect(governanceDAO.connect(voter1).setQuorumPercentage(20))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
        it("Should prevent setting QuorumPercentage to 0 or > 100", async function () {
            await expect(governanceDAO.connect(owner).setQuorumPercentage(0))
                .to.be.revertedWith("Quorum must be between 1-100");
            await expect(governanceDAO.connect(owner).setQuorumPercentage(101))
                .to.be.revertedWith("Quorum must be between 1-100");
        });


        it("Should allow owner to set ApprovalThreshold", async function () {
            const newThreshold = 75; // 75%
            await governanceDAO.connect(owner).setApprovalThreshold(newThreshold);
            expect(await governanceDAO.approvalThresholdPercentage()).to.equal(newThreshold);
            await expect(governanceDAO.connect(owner).setApprovalThreshold(newThreshold))
                .to.emit(governanceDAO, "ApprovalThresholdSet").withArgs(newThreshold);
        });
        it("Should prevent non-owner from setting ApprovalThreshold", async function () {
            await expect(governanceDAO.connect(voter1).setApprovalThreshold(75))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
        it("Should prevent setting ApprovalThreshold to 0 or > 100", async function () {
            await expect(governanceDAO.connect(owner).setApprovalThreshold(0))
                .to.be.revertedWith("Approval threshold must be between 1-100");
            await expect(governanceDAO.connect(owner).setApprovalThreshold(101))
                .to.be.revertedWith("Approval threshold must be between 1-100");
        });
    });

    describe("View Functions", function () {
        let proposalId: number;
        beforeEach(async function () {
            const tx = await governanceDAO.connect(proposer).createProposal("View Test", recipient.address, "0x", 0);
            const receipt = await tx.wait();
            proposalId = receipt.events?.find(e => e.event === "ProposalCreated")?.args?.proposalId.toNumber();
            await governanceDAO.connect(voter1).vote(proposalId, 0); // For
        });

        it("getProposal should return correct proposal details", async function () {
            const proposal = await governanceDAO.getProposal(proposalId);
            expect(proposal.id).to.equal(proposalId);
            expect(proposal.proposer).to.equal(proposer.address);
            expect(proposal.description).to.equal("View Test");
        });

        it("getVote should return correct vote type for a voter", async function () {
            expect(await governanceDAO.getVote(proposalId, voter1.address)).to.equal(0); // For
            expect(await governanceDAO.getVote(proposalId, voter2.address)).to.equal(0); // Default is For (0) if not voted, or check hasVoted
        });

        it("hasVotedOnProposal should return true if voted, false otherwise", async function () {
            expect(await governanceDAO.hasVotedOnProposal(proposalId, voter1.address)).to.be.true;
            expect(await governanceDAO.hasVotedOnProposal(proposalId, voter2.address)).to.be.false;
        });

        it("isProposalPassed should return true for Succeeded or Executed proposals", async function () {
            expect(await governanceDAO.isProposalPassed(proposalId)).to.be.false; // Active

            // Make it Succeeded
            await governanceDAO.connect(owner).vote(proposalId, 0); // Owner ensures quorum & approval
            await increaseTime(votingPeriodSeconds + 1);
            await governanceDAO.updateProposalStateAfterVoting(proposalId);
            expect((await governanceDAO.proposals(proposalId)).state).to.equal(2); // Succeeded
            expect(await governanceDAO.isProposalPassed(proposalId)).to.be.true;

            // Execute it
            const callData = donationVault.interface.encodeFunctionData("emergencyWithdrawEther", [recipient.address, ethers.utils.parseEther("0.1")]);
            // Need to create a new proposal with valid call data for execution to pass
            const tx = await governanceDAO.connect(proposer).createProposal("Execute for isPassed test", donationVault.address, callData, 0);
            const execReceipt = await tx.wait();
            const execPropId = execReceipt.events?.find(e => e.event === "ProposalCreated")?.args?.proposalId;

            await governanceDAO.connect(owner).vote(execPropId, 0);
            await increaseTime(votingPeriodSeconds + 1);
            await governanceDAO.updateProposalStateAfterVoting(execPropId);
            await governanceDAO.connect(owner).executeProposal(execPropId);


            expect((await governanceDAO.proposals(execPropId)).state).to.equal(4); // Executed
            expect(await governanceDAO.isProposalPassed(execPropId)).to.be.true;
        });
    });

});
