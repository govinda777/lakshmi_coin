import { ethers } from "hardhat";
import { expect } from "chai";
import { LakshmiZRC20 } from "../typechain-types"; // Adjust path as necessary
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("LakshmiZRC20", function () {
    let lakshmiToken: LakshmiZRC20;
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;
    const initialSupply = ethers.utils.parseEther("1000000"); // 1 million tokens
    let chainId: number;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        chainId = (await ethers.provider.getNetwork()).chainId;

        const LakshmiZRC20Factory = await ethers.getContractFactory("LakshmiZRC20");
        lakshmiToken = (await LakshmiZRC20Factory.deploy(
            initialSupply,
            owner.address, // treasuryAddress
            chainId,
            2000000, // gasLimit_
            ethers.constants.AddressZero, // systemContract_
            ethers.constants.AddressZero  // gatewayAddress_
        )) as LakshmiZRC20;
        await lakshmiToken.deployed();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await lakshmiToken.owner()).to.equal(owner.address);
        });

        it("Should assign the total supply of tokens to the owner", async function () {
            const ownerBalance = await lakshmiToken.balanceOf(owner.address);
            expect(await lakshmiToken.totalSupply()).to.equal(ownerBalance);
            expect(ownerBalance).to.equal(initialSupply);
        });

        it("Should have the correct name and symbol", async function () {
            expect(await lakshmiToken.name()).to.equal("Lakshmi ZRC20 Token");
            expect(await lakshmiToken.symbol()).to.equal("LUCK");
        });
    });

    describe("Transactions", function () {
        it("Should transfer tokens between accounts", async function () {
            // Transfer 50 tokens from owner to addr1
            await lakshmiToken.transfer(addr1.address, ethers.utils.parseEther("50"));
            const addr1Balance = await lakshmiToken.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(ethers.utils.parseEther("50"));

            // Transfer 20 tokens from addr1 to addr2
            await lakshmiToken.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("20"));
            const addr2Balance = await lakshmiToken.balanceOf(addr2.address);
            expect(addr2Balance).to.equal(ethers.utils.parseEther("20"));
        });

        it("Should fail if sender doesn’t have enough tokens", async function () {
            const initialOwnerBalance = await lakshmiToken.balanceOf(owner.address);
            // Try to send 1 token from addr1 (0 tokens) to owner (1000000 tokens)
            await expect(
                lakshmiToken.connect(addr1).transfer(owner.address, ethers.utils.parseEther("1"))
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

            // Owner balance shouldn't have changed.
            expect(await lakshmiToken.balanceOf(owner.address)).to.equal(initialOwnerBalance);
        });

        it("Should update balances after transfers", async function () {
            const initialOwnerBalance = await lakshmiToken.balanceOf(owner.address);

            // Transfer 100 to addr1
            await lakshmiToken.transfer(addr1.address, ethers.utils.parseEther("100"));
            // Transfer another 50 to addr2
            await lakshmiToken.transfer(addr2.address, ethers.utils.parseEther("50"));

            const finalOwnerBalance = await lakshmiToken.balanceOf(owner.address);
            const expectedOwnerBalance = initialOwnerBalance.sub(ethers.utils.parseEther("150"));
            expect(finalOwnerBalance).to.equal(expectedOwnerBalance);

            const addr1Balance = await lakshmiToken.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(ethers.utils.parseEther("100"));

            const addr2Balance = await lakshmiToken.balanceOf(addr2.address);
            expect(addr2Balance).to.equal(ethers.utils.parseEther("50"));
        });
    });

    // describe("Minting", function () {
    //     // Note: The base ZRC20 contract from ZetaChain does not provide a public owner-mintable function.
    //     // Minting typically happens via `deposit` from the fungible module or system contracts.
    //     // These tests are removed as `lakshmiToken.mint()` is not available.
    //     // If owner-minting is a required feature, it would need to be added to LakshmiZRC20.sol explicitly.
    //     it("Should allow owner to mint new tokens (REMOVED - ZRC20 base does not support this directly)", async function () {
    //         // const mintAmount = ethers.utils.parseEther("5000");
    //         // await lakshmiToken.mint(addr1.address, mintAmount); // This function does not exist on base ZRC20
    //         // const addr1Balance = await lakshmiToken.balanceOf(addr1.address);
    //         // expect(addr1Balance).to.equal(mintAmount);
    //         // const newTotalSupply = initialSupply.add(mintAmount);
    //         // expect(await lakshmiToken.totalSupply()).to.equal(newTotalSupply);
    //         this.skip(); // Skip this test
    //     });

    //     it("Should not allow non-owner to mint new tokens (REMOVED - ZRC20 base does not support this directly)", async function () {
    //         // const mintAmount = ethers.utils.parseEther("5000");
    //         // await expect(
    //         //     lakshmiToken.connect(addr1).mint(addr2.address, mintAmount)
    //         // ).to.be.revertedWith("Ownable: caller is not the owner"); // Or function not found
    //         this.skip(); // Skip this test
    //     });
    // });

    describe("Burning", function () {
        it("Should allow users to burn their own tokens", async function () {
            const burnAmount = ethers.utils.parseEther("100");
            // Owner burns 100 tokens
            await lakshmiToken.burn(burnAmount);
            const ownerBalanceAfterBurn = await lakshmiToken.balanceOf(owner.address);
            const expectedOwnerBalance = initialSupply.sub(burnAmount);
            expect(ownerBalanceAfterBurn).to.equal(expectedOwnerBalance);

            const newTotalSupply = initialSupply.sub(burnAmount);
            expect(await lakshmiToken.totalSupply()).to.equal(newTotalSupply);

            // Transfer some tokens to addr1 and let addr1 burn them
            const amountToAddr1 = ethers.utils.parseEther("200");
            await lakshmiToken.transfer(addr1.address, amountToAddr1);
            const burnAmountAddr1 = ethers.utils.parseEther("50");
            await lakshmiToken.connect(addr1).burn(burnAmountAddr1);

            const addr1BalanceAfterBurn = await lakshmiToken.balanceOf(addr1.address);
            const expectedAddr1Balance = amountToAddr1.sub(burnAmountAddr1);
            expect(addr1BalanceAfterBurn).to.equal(expectedAddr1Balance);

            const finalTotalSupply = newTotalSupply.sub(burnAmountAddr1);
            expect(await lakshmiToken.totalSupply()).to.equal(finalTotalSupply);
        });

        it("Should not allow burning more tokens than balance", async function () {
            const initialOwnerBalance = await lakshmiToken.balanceOf(owner.address);
            const burnAmount = initialOwnerBalance.add(ethers.utils.parseEther("1")); // Try to burn more than exists
            await expect(lakshmiToken.burn(burnAmount)).to.be.revertedWith(
                "ERC20: burn amount exceeds balance"
            );
        });
    });

    describe("Ownable", function () {
        it("Should allow owner to transfer ownership", async function () {
            await lakshmiToken.transferOwnership(addr1.address);
            expect(await lakshmiToken.owner()).to.equal(addr1.address);
        });

        it("Should not allow non-owner to transfer ownership", async function () {
            await expect(
                lakshmiToken.connect(addr1).transferOwnership(addr2.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should allow new owner to call owner functions (e.g. setTreasuryAddress - if such functions existed and were tested)", async function () {
            await lakshmiToken.transferOwnership(addr1.address);
            // Example: Test if new owner can call an Ownable function.
            // As setTreasuryAddress is an Ownable function from LakshmiZRC20 itself:
            await expect(lakshmiToken.connect(addr1).setTreasuryAddress(addr2.address)).to.not.be.reverted;
            expect(await lakshmiToken.treasuryAddress()).to.equal(addr2.address);
        });
    });
});
