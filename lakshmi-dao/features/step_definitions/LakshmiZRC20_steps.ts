import { Before, Given, When, Then, World } from "@cucumber/cucumber";
import { ethers, network } from "hardhat";
import { expect } from "chai";
import { LakshmiZRC20 } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Contract } from "ethers"; // Added Contract for type safety

// Define a custom world context
interface CustomWorld extends World {
    lakshmiToken?: LakshmiZRC20;
    deployer?: SignerWithAddress;
    users: { [name: string]: SignerWithAddress };
    initialSupply?: BigNumber;
    lastTransactionError?: any;
}

const parseLAK = (amount: string) => ethers.utils.parseEther(amount);
const zeroAddress = ethers.constants.AddressZero;

Before({ tags: "" }, async function (this: CustomWorld) {
    const signers = await ethers.getSigners();
    this.deployer = signers[0];
    this.users = {
        deployer: signers[0], // Convenience
        Alice: signers[1] || (await ethers.Wallet.createRandom().connect(ethers.provider)), // Ensure signers exist
        Bob: signers[2] || (await ethers.Wallet.createRandom().connect(ethers.provider)),
        Charlie: signers[3] || (await ethers.Wallet.createRandom().connect(ethers.provider)),
    };
    this.lastTransactionError = undefined; // Reset error
});


Given('a deployed LakshmiZRC20 contract with an initial supply of {string} tokens', async function (this: CustomWorld, initialSupplyString: string) {
    this.initialSupply = parseLAK(initialSupplyString);
    const LakshmiZRC20Factory = await ethers.getContractFactory("LakshmiZRC20", this.deployer);
    this.lakshmiToken = (await LakshmiZRC20Factory.deploy(this.initialSupply)) as LakshmiZRC20;
    await this.lakshmiToken.deployed();
});

Then('the total supply should be {string} tokens', async function (this: CustomWorld, expectedSupplyString: string) {
    const expectedSupply = parseLAK(expectedSupplyString);
    expect(await this.lakshmiToken!.totalSupply()).to.equal(expectedSupply);
});

Then('the contract owner should be the deployer', async function (this: CustomWorld) {
    expect(await this.lakshmiToken!.owner()).to.equal(this.deployer!.address);
});

Then('the deployer should have a balance of {string} tokens', async function (this: CustomWorld, expectedBalanceString: string) {
    const expectedBalance = parseLAK(expectedBalanceString);
    expect(await this.lakshmiToken!.balanceOf(this.deployer!.address)).to.equal(expectedBalance);
});

Then('the token name should be {string}', async function (this: CustomWorld, expectedName: string) {
    expect(await this.lakshmiToken!.name()).to.equal(expectedName);
});

Then('the token symbol should be {string}', async function (this: CustomWorld, expectedSymbol: string) {
    expect(await this.lakshmiToken!.symbol()).to.equal(expectedSymbol);
});

Given('{string} has {string} LAK tokens', async function (this: CustomWorld, userName: string, balanceString: string) {
    const user = this.users[userName];
    const currentBalance = await this.lakshmiToken!.balanceOf(user.address);
    const targetBalance = parseLAK(balanceString);

    if (!currentBalance.eq(targetBalance)) {
        // For simplicity, this step assumes we might need to adjust balances.
        // If the user is not the deployer and needs more tokens, transfer from deployer.
        // If they need fewer, this step might need more complex logic (e.g., burning or transferring away).
        // For now, we'll focus on setting up initial conditions for transfers.
        if (targetBalance.gt(currentBalance) && this.deployer) {
            const diff = targetBalance.sub(currentBalance);
            if ((await this.lakshmiToken!.balanceOf(this.deployer.address)).gte(diff)) {
                 await this.lakshmiToken!.connect(this.deployer).transfer(user.address, diff);
            } else {
                // If deployer doesn't have enough, mint more for the deployer first (if ownable)
                // This part might be too complex for a Given step and might indicate a need for better scenario setup
                // For now, assume deployer has enough or the test setup is flawed.
                console.warn(`Deployer may not have enough tokens to set ${userName}'s balance to ${balanceString}`);
            }
        } else if (targetBalance.lt(currentBalance) && this.deployer && user.address !== this.deployer.address) {
            // If user needs less, transfer back to deployer
            const diff = currentBalance.sub(targetBalance);
            await this.lakshmiToken!.connect(user).transfer(this.deployer.address, diff);
        }
    }
    expect(await this.lakshmiToken!.balanceOf(user.address)).to.equal(targetBalance, `Initial balance setup for ${userName} failed`);
});

When('the deployer transfers {string} LAK tokens to {string}', async function (this: CustomWorld, amountString: string, recipientName: string) {
    const amount = parseLAK(amountString);
    const recipient = this.users[recipientName];
    try {
        await this.lakshmiToken!.connect(this.deployer!).transfer(recipient.address, amount);
        this.lastTransactionError = undefined;
    } catch (error) {
        this.lastTransactionError = error;
    }
});

When('{string} attempts to transfer {string} LAK tokens to {string}', async function (this: CustomWorld, senderName: string, amountString: string, recipientName: string) {
    const sender = this.users[senderName];
    const amount = parseLAK(amountString);
    const recipient = this.users[recipientName];
    try {
        await this.lakshmiToken!.connect(sender).transfer(recipient.address, amount);
        this.lastTransactionError = undefined;
    } catch (error) {
        this.lastTransactionError = error;
    }
});


When('the deployer attempts to transfer {string} LAK tokens to the zero address', async function (this: CustomWorld, amountString: string) {
    const amount = parseLAK(amountString);
    try {
        await this.lakshmiToken!.connect(this.deployer!).transfer(zeroAddress, amount);
        this.lastTransactionError = undefined;
    } catch (error) {
        this.lastTransactionError = error;
    }
});


Then('{string} should have a balance of {string} LAK tokens', async function (this: CustomWorld, userName: string, expectedBalanceString: string) {
    const user = this.users[userName];
    const expectedBalance = parseLAK(expectedBalanceString);
    expect(await this.lakshmiToken!.balanceOf(user.address)).to.equal(expectedBalance);
});

Then("the deployer's balance should be {string} LAK tokens", async function (this: CustomWorld, expectedBalanceString: string) {
    const expectedBalance = parseLAK(expectedBalanceString);
    expect(await this.lakshmiToken!.balanceOf(this.deployer!.address)).to.equal(expectedBalance);
});

Then('the transfer should fail with message {string}', async function (this: CustomWorld, expectedErrorMessage: string) {
    expect(this.lastTransactionError).to.exist;
    // Normalize error messages (Hardhat/Ethers might wrap them)
    const actualErrorMessage = (this.lastTransactionError as any).message || String(this.lastTransactionError);
    expect(actualErrorMessage).to.include(expectedErrorMessage);
});

Then('{string} should still have a balance of {string} LAK tokens', async function (this: CustomWorld, userName: string, expectedBalanceString: string) {
    // This is the same as 'Then "{string} should have a balance of {string} LAK tokens"'
    // Cucumber allows reusing step definitions.
    const user = this.users[userName];
    const expectedBalance = parseLAK(expectedBalanceString);
    expect(await this.lakshmiToken!.balanceOf(user.address)).to.equal(expectedBalance);
});

When('the deployer mints {string} LAK tokens for {string}', async function (this: CustomWorld, amountString: string, recipientName: string) {
    const amount = parseLAK(amountString);
    const recipient = this.users[recipientName];
    try {
        await this.lakshmiToken!.connect(this.deployer!).mint(recipient.address, amount);
        this.lastTransactionError = undefined;
    } catch (error) {
        this.lastTransactionError = error;
    }
});

Given('{string} is not the owner', async function (this: CustomWorld, userName: string) {
    const user = this.users[userName];
    expect(await this.lakshmiToken!.owner()).to.not.equal(user.address, `${userName} should not be the owner for this test.`);
});

When('{string} attempts to mint {string} LAK tokens for {string}', async function (this: CustomWorld, minterName: string, amountString: string, recipientName: string) {
    const minter = this.users[minterName];
    const amount = parseLAK(amountString);
    const recipient = this.users[recipientName];
    try {
        await this.lakshmiToken!.connect(minter).mint(recipient.address, amount);
        this.lastTransactionError = undefined;
    } catch (error) {
        this.lastTransactionError = error;
    }
});

Then('the minting attempt should fail with message {string}', function (this: CustomWorld, expectedErrorMessage: string) {
    expect(this.lastTransactionError).to.exist;
    const actualErrorMessage = (this.lastTransactionError as any).message || String(this.lastTransactionError);
    expect(actualErrorMessage).to.include(expectedErrorMessage);
});

Then('the total supply should still be {string} tokens', async function (this: CustomWorld, expectedSupplyString: string) {
    const expectedSupply = parseLAK(expectedSupplyString);
    expect(await this.lakshmiToken!.totalSupply()).to.equal(expectedSupply);
});

Given('the deployer has {string} LAK tokens', async function (this: CustomWorld, balanceString: string) {
    // This is effectively the same as the more generic balance check for the deployer
    const expectedBalance = parseLAK(balanceString);
    // Ensure the deployer has this balance, if not, adjust (e.g. mint if below and owner, or fail if setup is wrong)
    const currentBalance = await this.lakshmiToken!.balanceOf(this.deployer!.address);
    if (!currentBalance.eq(expectedBalance)) {
        // This might indicate a flaw in scenario order or setup.
        // For now, we'll just assert. If this fails, the scenario needs adjustment.
        // Or, we could mint for deployer if current < expected, assuming deployer is owner.
        if (currentBalance.lt(expectedBalance) && (await this.lakshmiToken!.owner()) === this.deployer!.address) {
            await this.lakshmiToken!.connect(this.deployer!).mint(this.deployer!.address, expectedBalance.sub(currentBalance));
        } else if (currentBalance.gt(expectedBalance)) {
            // If more, burn some (assuming deployer can burn own tokens)
            await this.lakshmiToken!.connect(this.deployer!).burn(currentBalance.sub(expectedBalance));
        }
    }
    expect(await this.lakshmiToken!.balanceOf(this.deployer!.address)).to.equal(expectedBalance);
});

When('the deployer burns {string} LAK tokens', async function (this: CustomWorld, amountString: string) {
    const amount = parseLAK(amountString);
    try {
        await this.lakshmiToken!.connect(this.deployer!).burn(amount);
        this.lastTransactionError = undefined;
    } catch (error) {
        this.lastTransactionError = error;
    }
});

When('{string} attempts to burn {string} LAK tokens', async function (this: CustomWorld, userName: string, amountString: string) {
    const user = this.users[userName];
    const amount = parseLAK(amountString);
    try {
        await this.lakshmiToken!.connect(user).burn(amount);
        this.lastTransactionError = undefined;
    } catch (error) {
        this.lastTransactionError = error;
    }
});

Then('the burning attempt should fail with message {string}', function (this: CustomWorld, expectedErrorMessage: string) {
    expect(this.lastTransactionError).to.exist;
    const actualErrorMessage = (this.lastTransactionError as any).message || String(this.lastTransactionError);
    expect(actualErrorMessage).to.include(expectedErrorMessage);
});

Given('{string} approves {string} to spend {string} LAK tokens from the deployer\'s account', async function (this: CustomWorld, approverNamePlaceholder: string, spenderName: string, amountString: string) {
    // In this feature, the "approver" for the deployer's account is always the deployer.
    // approverNamePlaceholder is just for Gherkin readability, e.g., "Alice" (representing the deployer)
    const spender = this.users[spenderName];
    const amount = parseLAK(amountString);
    await this.lakshmiToken!.connect(this.deployer!).approve(spender.address, amount);
    // Verify allowance
    expect(await this.lakshmiToken!.allowance(this.deployer!.address, spender.address)).to.equal(amount);
});

When('{string} transfers {string} LAK tokens from the deployer\'s account to {string}', async function (this: CustomWorld, spenderName: string, amountString: string, recipientName: string) {
    const spender = this.users[spenderName];
    const amount = parseLAK(amountString);
    const recipient = this.users[recipientName];
    try {
        await this.lakshmiToken!.connect(spender).transferFrom(this.deployer!.address, recipient.address, amount);
        this.lastTransactionError = undefined;
    } catch (error) {
        this.lastTransactionError = error;
    }
});

Then('the allowance of {string} for the deployer\'s account should be {string} LAK tokens', async function (this: CustomWorld, spenderName: string, expectedAllowanceString: string) {
    const spender = this.users[spenderName];
    const expectedAllowance = parseLAK(expectedAllowanceString);
    expect(await this.lakshmiToken!.allowance(this.deployer!.address, spender.address)).to.equal(expectedAllowance);
});

When('{string} attempts to transfer {string} LAK tokens from the deployer\'s account to {string}', async function (this: CustomWorld, spenderName: string, amountString: string, recipientName: string) {
    const spender = this.users[spenderName];
    const amount = parseLAK(amountString);
    const recipient = this.users[recipientName];
    try {
        await this.lakshmiToken!.connect(spender).transferFrom(this.deployer!.address, recipient.address, amount);
        this.lastTransactionError = undefined;
    } catch (error) {
        this.lastTransactionError = error;
    }
});

Then('the transferFrom attempt should fail with message {string}', function (this: CustomWorld, expectedErrorMessage: string) {
    expect(this.lastTransactionError).to.exist;
    const actualErrorMessage = (this.lastTransactionError as any).message || String(this.lastTransactionError);
    expect(actualErrorMessage).to.include(expectedErrorMessage);
});

Then('the deployer\'s balance should still be {string} LAK tokens', async function (this: CustomWorld, expectedBalanceString: string) {
    const expectedBalance = parseLAK(expectedBalanceString);
    expect(await this.lakshmiToken!.balanceOf(this.deployer!.address)).to.equal(expectedBalance);
});

When('{string} attempts to transfer {string} LAK tokens from the deployer\'s account to the zero address', async function (this: CustomWorld, spenderName: string, amountString: string) {
    const spender = this.users[spenderName];
    const amount = parseLAK(amountString);
    try {
        await this.lakshmiToken!.connect(spender).transferFrom(this.deployer!.address, zeroAddress, amount);
        this.lastTransactionError = undefined;
    } catch (error) {
        this.lastTransactionError = error;
    }
});

Then('the allowance of {string} for the deployer\'s account should still be {string} LAK tokens', async function (this: CustomWorld, spenderName: string, expectedAllowanceString: string) {
    const spender = this.users[spenderName];
    const expectedAllowance = parseLAK(expectedAllowanceString);
    expect(await this.lakshmiToken!.allowance(this.deployer!.address, spender.address)).to.equal(expectedAllowance);
});

// This ensures the world is properly typed for Cucumber
declare module '@cucumber/cucumber' {
    interface World extends CustomWorld {}
}
// Set default timeout for all hooks and steps
// setDefaultTimeout(60 * 1000); // 60 seconds, if needed
// Not using setDefaultTimeout from cucumber as it might not be available in all versions.
// Timeouts can be set in cucumber.js or via command line.

// Helper to ensure users exist, useful if not all signers are available in hardhat.config
// (Already integrated into Before hook)
// async function ensureUser(world: CustomWorld, userName: string): Promise<SignerWithAddress> {
//     if (!world.users[userName]) {
//         const newSigner = await ethers.Wallet.createRandom().connect(ethers.provider);
//         // If we need to fund this new user, it should be done here.
//         // For now, just creating the signer.
//         world.users[userName] = newSigner as any as SignerWithAddress; // Cast needed for type compatibility
//     }
//     return world.users[userName];
// }

// Note: The `setDefaultTimeout` is commented out. If tests are slow, it might be needed.
// The `ensureUser` helper is also commented out as its logic is now part of the `Before` hook.
// The balance adjustment logic in `Given '{string} has {string} LAK tokens'` is basic and might need refinement for more complex scenarios.
// It's generally better to set up precise initial states rather than adjusting them dynamically in Given steps.
// However, for simpler token setup, it can reduce verbosity.
// For the allowance scenario, "Alice" approving "Bob" to spend from the deployer's account is interpreted as the deployer (who is Alice in some contexts) approving Bob.
// The placeholder "Alice" in that Gherkin step is mostly for readability.
// The step `Given '{string} has {string} LAK tokens'` might need more robust logic if used to decrease balances or for non-deployer accounts that need specific non-zero starting amounts without a direct transfer from the deployer in the same step.
// The current implementation primarily handles setting an initial balance by transferring from the deployer if the target balance is higher than current.
