import { ethers, network } from "hardhat";
import { expect } from "chai";
import { LakshmiZRC20, DonationVault, GovernanceDAO } from "../typechain-types"; // Adjust path
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("DonationVault", function () {
    let lakshmiToken: LakshmiZRC20;
    let donationVault: DonationVault;
    let mockGovernanceDAO: GovernanceDAO; // Using actual GovernanceDAO as mock for interface compatibility
    let owner: SignerWithAddress;
    let donor1: SignerWithAddress;
    let donor2: SignerWithAddress;
    let recipient: SignerWithAddress;
    let nonGovernance: SignerWithAddress;

    const initialLakshmiSupply = ethers.utils.parseEther("1000000");

    beforeEach(async function () {
        [owner, donor1, donor2, recipient, nonGovernance] = await ethers.getSigners();

        // Deploy LakshmiZRC20
        const LakshmiZRC20Factory = await ethers.getContractFactory("LakshmiZRC20");
        lakshmiToken = (await LakshmiZRC20Factory.deploy(initialLakshmiSupply)) as LakshmiZRC20;
        await lakshmiToken.deployed();

        // Deploy DonationVault
        const DonationVaultFactory = await ethers.getContractFactory("DonationVault");
        donationVault = (await DonationVaultFactory.deploy(lakshmiToken.address)) as DonationVault;
        await donationVault.deployed();

        // Deploy a mock GovernanceDAO (using the actual contract for simplicity in testing interface)
        // For more isolated tests, you might use a dedicated mock contract.
        const GovernanceDAOFactory = await ethers.getContractFactory("GovernanceDAO");
        mockGovernanceDAO = (await GovernanceDAOFactory.deploy(
            lakshmiToken.address, // LAK token address
            7 * 24 * 60 * 60,   // voting period (7 days)
            10,                 // quorum (10%)
            51                  // approval threshold (51%)
        )) as GovernanceDAO;
        await mockGovernanceDAO.deployed();

        // Set the GovernanceDAO address in the DonationVault
        await donationVault.connect(owner).setGovernanceDAO(mockGovernanceDAO.address);
        // Also set the donation vault in the mock governance so it can make calls if needed for tests
        await mockGovernanceDAO.connect(owner).setDonationVault(donationVault.address);

        // Transfer some LAK to the mockGovernanceDAO contract itself to act as a token holder for creating proposals
        await lakshmiToken.connect(owner).transfer(mockGovernanceDAO.address, ethers.utils.parseEther("1000"));
    });

    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            expect(await donationVault.owner()).to.equal(owner.address);
        });

        it("Should set the correct LakshmiZRC20 token address", async function () {
            expect(await donationVault.lakshmiToken()).to.equal(lakshmiToken.address);
        });

        it("Should initially have zero ETH balance", async function () {
            expect(await donationVault.getVaultBalance()).to.equal(0);
        });
    });

    describe("Setting Governance DAO", function () {
        it("Should allow owner to set the Governance DAO address", async function () {
            const newGovDAOAddress = ethers.Wallet.createRandom().address;
            await donationVault.connect(owner).setGovernanceDAO(newGovDAOAddress);
            expect(await donationVault.governanceDAO()).to.equal(newGovDAOAddress);
        });

        it("Should emit GovernanceDAOUpdated event", async function () {
            const newGovDAOAddress = ethers.Wallet.createRandom().address;
            await expect(donationVault.connect(owner).setGovernanceDAO(newGovDAOAddress))
                .to.emit(donationVault, "GovernanceDAOUpdated")
                .withArgs(newGovDAOAddress);
        });

        it("Should not allow non-owner to set the Governance DAO address", async function () {
            const newGovDAOAddress = ethers.Wallet.createRandom().address;
            await expect(
                donationVault.connect(donor1).setGovernanceDAO(newGovDAOAddress)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should revert if setting governance DAO to zero address", async function () {
            await expect(
                donationVault.connect(owner).setGovernanceDAO(ethers.constants.AddressZero)
            ).to.be.revertedWith("Governance DAO address cannot be zero");
        });
    });

    describe("Ether Donations", function () {
        it("Should accept ETH donations", async function () {
            const donationAmount = ethers.utils.parseEther("1");
            await donor1.sendTransaction({ to: donationVault.address, value: donationAmount });
            expect(await donationVault.getVaultBalance()).to.equal(donationAmount);
            expect(await donationVault.ethDonations(donor1.address)).to.equal(donationAmount);
        });

        it("Should emit EtherDonated event", async function () {
            const donationAmount = ethers.utils.parseEther("0.5");
            await expect(donor1.sendTransaction({ to: donationVault.address, value: donationAmount }))
                .to.emit(donationVault, "EtherDonated")
                .withArgs(donor1.address, donationAmount);
        });

         it("Should accept ETH donations via donateEther function", async function () {
            const donationAmount = ethers.utils.parseEther("1");
            await donationVault.connect(donor1).donateEther({value: donationAmount});
            expect(await donationVault.getVaultBalance()).to.equal(donationAmount);
            expect(await donationVault.ethDonations(donor1.address)).to.equal(donationAmount);
        });


        it("Should revert if donating zero ETH via donateEther", async function () {
            await expect(
                donationVault.connect(donor1).donateEther({ value: 0 })
            ).to.be.revertedWith("DonationVault: Must send ETH");
        });

        it("Should correctly track multiple ETH donations from different donors", async function () {
            const donation1Amount = ethers.utils.parseEther("1");
            const donation2Amount = ethers.utils.parseEther("2");

            await donor1.sendTransaction({ to: donationVault.address, value: donation1Amount });
            await donor2.sendTransaction({ to: donationVault.address, value: donation2Amount });

            expect(await donationVault.getVaultBalance()).to.equal(donation1Amount.add(donation2Amount));
            expect(await donationVault.ethDonations(donor1.address)).to.equal(donation1Amount);
            expect(await donationVault.ethDonations(donor2.address)).to.equal(donation2Amount);
        });
    });

    describe("ZRC20 Donations", function () {
        let mockZRC20: LakshmiZRC20; // Using LakshmiZRC20 as a generic ZRC20 for testing

        beforeEach(async function () {
            // Deploy a mock ZRC20 token for testing donations
            const MockZRC20Factory = await ethers.getContractFactory("LakshmiZRC20"); // Use LAK as mock
            mockZRC20 = (await MockZRC20Factory.deploy(ethers.utils.parseEther("100000"))) as LakshmiZRC20;
            await mockZRC20.deployed();

            // Transfer some mockZRC20 to donors
            await mockZRC20.connect(owner).transfer(donor1.address, ethers.utils.parseEther("1000"));
            await mockZRC20.connect(owner).transfer(donor2.address, ethers.utils.parseEther("1000"));

            // Approve DonationVault to spend tokens
            await mockZRC20.connect(donor1).approve(donationVault.address, ethers.utils.parseEther("500"));
            await mockZRC20.connect(donor2).approve(donationVault.address, ethers.utils.parseEther("500"));
        });

        it("Should accept ZRC20 donations", async function () {
            const donationAmount = ethers.utils.parseEther("100");
            await donationVault.connect(donor1).donateERC20(mockZRC20.address, donationAmount);

            expect(await donationVault.getERC20Balance(mockZRC20.address)).to.equal(donationAmount);
            expect(await donationVault.erc20Donations(donor1.address, mockZRC20.address)).to.equal(donationAmount);
        });

        it("Should emit ERC20Donated event", async function () {
            const donationAmount = ethers.utils.parseEther("50");
            await expect(donationVault.connect(donor1).donateERC20(mockZRC20.address, donationAmount))
                .to.emit(donationVault, "ERC20Donated")
                .withArgs(donor1.address, mockZRC20.address, donationAmount);
        });

        it("Should revert if donating zero amount of ZRC20", async function () {
            await expect(
                donationVault.connect(donor1).donateERC20(mockZRC20.address, 0)
            ).to.be.revertedWith("DonationVault: Must donate a positive amount");
        });

        it("Should revert if ZRC20 token contract is zero address", async function () {
            await expect(
                donationVault.connect(donor1).donateERC20(ethers.constants.AddressZero, ethers.utils.parseEther("10"))
            ).to.be.revertedWith("DonationVault: Token contract address cannot be zero");
        });

        it("Should revert if ZRC20 transferFrom fails (e.g., insufficient allowance)", async function () {
            const donationAmount = ethers.utils.parseEther("1000"); // More than approved
            await expect(
                donationVault.connect(donor1).donateERC20(mockZRC20.address, donationAmount)
            ).to.be.revertedWith("ERC20: insufficient allowance"); // Or specific ZRC20 error
        });
    });

    describe("Fund Release (ETH)", function () {
        const proposalId = 1; // Assume this proposal ID will be "passed" by mock
        const releaseAmount = ethers.utils.parseEther("1");

        beforeEach(async function () {
            // Donate ETH to the vault
            await donor1.sendTransaction({ to: donationVault.address, value: ethers.utils.parseEther("2") });

            // Simulate proposal creation and passing in mockGovernanceDAO
            // For this test, we need a way for mockGovernanceDAO.isProposalPassed to return true.
            // A simple way: have the mockGovernanceDAO owner (which is `owner`) create a proposal
            // that will automatically pass or set its state.
            // For simplicity, we'll assume `isProposalPassed` can be controlled or will return true for `proposalId`.
            // A real mock would allow `mockGovernanceDAO.setIsProposalPassed(proposalId, true)`
            // For now, we will create a proposal and manually vote to pass it.

            const description = "Test ETH Release Proposal";
            const target = donationVault.address; // Target is the vault itself for this test
            // Calldata for a dummy function or rely on a more complex setup if calling specific vault functions
            const callData = donationVault.interface.encodeFunctionData("emergencyWithdrawEther", [recipient.address, releaseAmount]);
             // This callData is not what `releaseFunds` expects directly, but for testing `isProposalPassed` it's okay.
             // `releaseFunds` itself doesn't use callData from the proposal it's given, but the proposal ID.

            // Owner of mockGovernanceDAO creates a proposal
            // Ensure mockGovernanceDAO has LAK to propose
            await lakshmiToken.connect(owner).transfer(mockGovernanceDAO.address, ethers.utils.parseEther("1")); // Ensure it has voting power if needed by internal logic
            await lakshmiToken.connect(owner).transfer(owner.address, ethers.utils.parseEther("100")); // Owner needs LAK to vote
            await lakshmiToken.connect(owner).approve(mockGovernanceDAO.address, ethers.utils.parseEther("100"));


            // Create a proposal in the actual GovernanceDAO instance used as mock
            const propTx = await mockGovernanceDAO.connect(owner).createProposal(description, target, callData, 0);
            const receipt = await propTx.wait();
            const event = receipt.events?.find(e => e.event === 'ProposalCreated');
            const createdProposalId = event?.args?.proposalId;

            expect(createdProposalId).to.not.be.undefined;
            const currentProposalId = createdProposalId || proposalId; // Use the dynamic ID

            // Vote to pass the proposal
            await mockGovernanceDAO.connect(owner).vote(currentProposalId, 0); // Vote FOR

            // Fast forward time to end voting period
            const votingPeriod = await mockGovernanceDAO.votingPeriod();
            await network.provider.send("evm_increaseTime", [votingPeriod.toNumber() + 1]);
            await network.provider.send("evm_mine");

            // Update proposal state
            await mockGovernanceDAO.connect(owner).updateProposalStateAfterVoting(currentProposalId);
            const proposalDetails = await mockGovernanceDAO.proposals(currentProposalId);
            expect(proposalDetails.state).to.equal(2); // Succeeded = 2
        });


        it("Should allow governance to release ETH funds for a passed proposal", async function () {
            const recipientInitialBalance = await ethers.provider.getBalance(recipient.address);
            // Use the actual proposal ID that was created and passed
            const succeededProposalId = (await mockGovernanceDAO.nextProposalId()).sub(1);


            await expect(
                donationVault.connect(mockGovernanceDAO.signer).releaseFunds(succeededProposalId, recipient.address, releaseAmount)
            ).to.emit(donationVault, "FundsReleased").withArgs(recipient.address, releaseAmount);

            const recipientFinalBalance = await ethers.provider.getBalance(recipient.address);
            expect(recipientFinalBalance).to.equal(recipientInitialBalance.add(releaseAmount));
            expect(await donationVault.getVaultBalance()).to.equal(ethers.utils.parseEther("1")); // 2 - 1
        });


        it("Should revert if caller is not the Governance DAO", async function () {
             const succeededProposalId = (await mockGovernanceDAO.nextProposalId()).sub(1);
            await expect(
                donationVault.connect(nonGovernance).releaseFunds(succeededProposalId, recipient.address, releaseAmount)
            ).to.be.revertedWith("DonationVault: Caller is not the Governance DAO");
        });

        it("Should revert if proposal has not passed", async function () {
            const newProposalId = (await mockGovernanceDAO.nextProposalId()); // This one is not passed
            // Create a new proposal that won't be passed
            const propTx = await mockGovernanceDAO.connect(owner).createProposal("Not Passed Prop", donationVault.address, "0x", 0);
            const receipt = await propTx.wait();
            const event = receipt.events?.find(e => e.event === 'ProposalCreated');
            const createdProposalId = event?.args?.proposalId || newProposalId;

            await expect(
                donationVault.connect(mockGovernanceDAO.signer).releaseFunds(createdProposalId, recipient.address, releaseAmount)
            ).to.be.revertedWith("DonationVault: Proposal not passed");
        });

        it("Should revert if recipient is zero address", async function () {
             const succeededProposalId = (await mockGovernanceDAO.nextProposalId()).sub(1);
            await expect(
                donationVault.connect(mockGovernanceDAO.signer).releaseFunds(succeededProposalId, ethers.constants.AddressZero, releaseAmount)
            ).to.be.revertedWith("DonationVault: Recipient address cannot be zero");
        });

        it("Should revert if amount is zero", async function () {
             const succeededProposalId = (await mockGovernanceDAO.nextProposalId()).sub(1);
            await expect(
                donationVault.connect(mockGovernanceDAO.signer).releaseFunds(succeededProposalId, recipient.address, 0)
            ).to.be.revertedWith("DonationVault: Amount must be greater than zero");
        });

        it("Should revert if insufficient ETH balance in vault", async function () {
             const succeededProposalId = (await mockGovernanceDAO.nextProposalId()).sub(1);
            const excessiveAmount = ethers.utils.parseEther("10"); // More than vault balance
            await expect(
                donationVault.connect(mockGovernanceDAO.signer).releaseFunds(succeededProposalId, recipient.address, excessiveAmount)
            ).to.be.revertedWith("DonationVault: Insufficient ETH balance");
        });

         it("Should revert if Governance DAO is not set", async function () {
            const succeededProposalId = (await mockGovernanceDAO.nextProposalId()).sub(1);
            // Deploy a new vault without setting governance
            const NewVaultFactory = await ethers.getContractFactory("DonationVault");
            const newVault = await NewVaultFactory.deploy(lakshmiToken.address);
            await newVault.deployed();
            // Try to call from an address that *would* be governance if it was set
            // This test is tricky because the modifier checks msg.sender == address(governanceDAO)
            // If governanceDAO is address(0), then msg.sender would have to be address(0) which is impossible.
            // The check `require(address(governanceDAO) != address(0), "DonationVault: Governance DAO not set");` handles this.
            await expect(
                newVault.connect(mockGovernanceDAO.signer).releaseFunds(succeededProposalId, recipient.address, releaseAmount)
            ).to.be.revertedWith("DonationVault: Governance DAO not set");
        });
    });


    describe("Fund Release (ZRC20)", function () {
        const proposalId = 10; // Using a distinct proposal ID for ZRC20 tests
        let mockZRC20: LakshmiZRC20;
        const erc20ReleaseAmount = ethers.utils.parseEther("50");

        beforeEach(async function () {
            // Deploy and fund mock ZRC20
            const MockZRC20Factory = await ethers.getContractFactory("LakshmiZRC20");
            mockZRC20 = (await MockZRC20Factory.deploy(ethers.utils.parseEther("10000"))) as LakshmiZRC20;
            await mockZRC20.deployed();
            await mockZRC20.connect(owner).transfer(donor1.address, ethers.utils.parseEther("1000"));
            await mockZRC20.connect(donor1).approve(donationVault.address, erc20ReleaseAmount.mul(2));
            await donationVault.connect(donor1).donateERC20(mockZRC20.address, erc20ReleaseAmount.mul(2)); // Donate 100 tokens

            // Simulate proposal passing for ZRC20 release
            await lakshmiToken.connect(owner).transfer(owner.address, ethers.utils.parseEther("100"));
            await lakshmiToken.connect(owner).approve(mockGovernanceDAO.address, ethers.utils.parseEther("100"));

            const callData = donationVault.interface.encodeFunctionData("emergencyWithdrawERC20", [recipient.address, mockZRC20.address, erc20ReleaseAmount]);
            const propTx = await mockGovernanceDAO.connect(owner).createProposal("Test ZRC20 Release", donationVault.address, callData, 0);
            const receipt = await propTx.wait();
            const event = receipt.events?.find(e => e.event === 'ProposalCreated');
            const createdProposalId = event?.args?.proposalId || proposalId;

            await mockGovernanceDAO.connect(owner).vote(createdProposalId, 0); // Vote FOR
            const votingPeriod = await mockGovernanceDAO.votingPeriod();
            await network.provider.send("evm_increaseTime", [votingPeriod.toNumber() + 1]);
            await network.provider.send("evm_mine");
            await mockGovernanceDAO.connect(owner).updateProposalStateAfterVoting(createdProposalId);

            const proposalDetails = await mockGovernanceDAO.proposals(createdProposalId);
            expect(proposalDetails.state).to.equal(2); // Succeeded
        });

        it("Should allow governance to release ZRC20 funds for a passed proposal", async function () {
            const recipientInitialZRC20Balance = await mockZRC20.balanceOf(recipient.address);
            const succeededProposalId = (await mockGovernanceDAO.nextProposalId()).sub(1);

            await expect(
                donationVault.connect(mockGovernanceDAO.signer).releaseERC20Funds(succeededProposalId, recipient.address, mockZRC20.address, erc20ReleaseAmount)
            ).to.emit(donationVault, "ERC20FundsReleased").withArgs(recipient.address, mockZRC20.address, erc20ReleaseAmount);

            const recipientFinalZRC20Balance = await mockZRC20.balanceOf(recipient.address);
            expect(recipientFinalZRC20Balance).to.equal(recipientInitialZRC20Balance.add(erc20ReleaseAmount));
            expect(await donationVault.getERC20Balance(mockZRC20.address)).to.equal(erc20ReleaseAmount); // 100 - 50
        });

        it("Should revert if insufficient ZRC20 balance in vault", async function () {
            const succeededProposalId = (await mockGovernanceDAO.nextProposalId()).sub(1);
            const excessiveAmount = ethers.utils.parseEther("1000"); // More than vault's ZRC20 balance
            await expect(
                donationVault.connect(mockGovernanceDAO.signer).releaseERC20Funds(succeededProposalId, recipient.address, mockZRC20.address, excessiveAmount)
            ).to.be.revertedWith("DonationVault: Insufficient ZRC20 balance");
        });
         // Add other similar failure cases as for ETH release (caller, proposal state, zero address, zero amount)
    });


    describe("Emergency Withdrawals (Owner)", function () {
        const withdrawAmountEth = ethers.utils.parseEther("0.5");
        let mockZRC20: LakshmiZRC20;
        const withdrawAmountZRC20 = ethers.utils.parseEther("20");

        beforeEach(async function () {
            // Fund vault with ETH
            await owner.sendTransaction({ to: donationVault.address, value: ethers.utils.parseEther("1") });

            // Fund vault with ZRC20
            const MockZRC20Factory = await ethers.getContractFactory("LakshmiZRC20");
            mockZRC20 = (await MockZRC20Factory.deploy(ethers.utils.parseEther("1000"))) as LakshmiZRC20;
            await mockZRC20.deployed();
            await mockZRC20.connect(owner).transfer(donationVault.address, ethers.utils.parseEther("50")); // Direct transfer for setup
        });

        it("Should allow owner to emergency withdraw ETH", async function () {
            const ownerInitialEthBalance = await ethers.provider.getBalance(owner.address);
            const tx = await donationVault.connect(owner).emergencyWithdrawEther(owner.address, withdrawAmountEth);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed.mul(tx.gasPrice || ethers.provider.getGasPrice());

            expect(await donationVault.getVaultBalance()).to.equal(ethers.utils.parseEther("0.5")); // 1 - 0.5
            expect(await ethers.provider.getBalance(owner.address)).to.equal(ownerInitialEthBalance.add(withdrawAmountEth).sub(gasUsed));
        });

        it("Should not allow non-owner to emergency withdraw ETH", async function () {
            await expect(
                donationVault.connect(donor1).emergencyWithdrawEther(donor1.address, withdrawAmountEth)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should allow owner to emergency withdraw ZRC20 tokens", async function () {
            const ownerInitialZRC20Balance = await mockZRC20.balanceOf(owner.address);
            await donationVault.connect(owner).emergencyWithdrawERC20(owner.address, mockZRC20.address, withdrawAmountZRC20);

            expect(await donationVault.getERC20Balance(mockZRC20.address)).to.equal(ethers.utils.parseEther("30")); // 50 - 20
            expect(await mockZRC20.balanceOf(owner.address)).to.equal(ownerInitialZRC20Balance.add(withdrawAmountZRC20));
        });

        it("Should not allow non-owner to emergency withdraw ZRC20 tokens", async function () {
            await expect(
                donationVault.connect(donor1).emergencyWithdrawERC20(donor1.address, mockZRC20.address, withdrawAmountZRC20)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

});
