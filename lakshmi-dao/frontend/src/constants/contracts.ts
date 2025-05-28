// This file would typically store your contract ABIs and addresses.
// For this project structure, ABIs might be large, so they are often imported from
// the artifacts directory of your Hardhat project or managed via typechain.

// --- Contract Addresses ---
// Replace these with your deployed contract addresses.
// You might get these from your deployment script output or a configuration file.
export const LAKSHMI_ZRC20_ADDRESS = process.env.REACT_APP_LAKSHMI_ZRC20_ADDRESS || "0xYourLakshmiZRC20Address";
export const DONATION_VAULT_ADDRESS = process.env.REACT_APP_DONATION_VAULT_ADDRESS || "0xYourDonationVaultAddress";
export const GOVERNANCE_DAO_ADDRESS = process.env.REACT_APP_GOVERNANCE_DAO_ADDRESS || "0xYourGovernanceDAOAddress";

// --- ABIs ---
// It's common to import ABIs as JSON or directly from TypeChain generated types.
// Example:
// import LakshmiZRC20Artifact from '../artifacts/contracts/LakshmiZRC20.sol/LakshmiZRC20.json';
// import DonationVaultArtifact from '../artifacts/contracts/DonationVault.sol/DonationVault.json';
// import GovernanceDAOArtifact from '../artifacts/contracts/GovernanceDAO.sol/GovernanceDAO.json';

// export const LAKSHMI_ZRC20_ABI = LakshmiZRC20Artifact.abi;
// export const DONATION_VAULT_ABI = DonationVaultArtifact.abi;
// export const GOVERNANCE_DAO_ABI = GovernanceDAOArtifact.abi;

// For placeholder purposes if you don't have artifacts linked yet:
export const LAKSHMI_ZRC20_ABI_PLACEHOLDER: any[] = [ /* Minimal ABI for basic functions */ ];
export const DONATION_VAULT_ABI_PLACEHOLDER: any[] = [ /* Minimal ABI */ ];
export const GOVERNANCE_DAO_ABI_PLACEHOLDER: any[] = [ /* Minimal ABI */ ];


// --- Verification ---
// It's good practice to ensure these addresses are actually set, especially from .env files.
if (process.env.NODE_ENV !== 'test') { // Don't log during tests
    if (LAKSHMI_ZRC20_ADDRESS === "0xYourLakshmiZRC20Address") {
        console.warn("LakshmiZRC20 contract address not set in .env. Placeholder is being used.");
    }
    if (DONATION_VAULT_ADDRESS === "0xYourDonationVaultAddress") {
        console.warn("DonationVault contract address not set in .env. Placeholder is being used.");
    }
    if (GOVERNANCE_DAO_ADDRESS === "0xYourGovernanceDAOAddress") {
        console.warn("GovernanceDAO contract address not set in .env. Placeholder is being used.");
    }
}

// How to get ABIs after compilation with Hardhat:
// 1. After running `npx hardhat compile`, Hardhat generates artifacts in the `lakshmi-dao/artifacts/contracts/` directory.
// 2. Each contract `.sol` file will have a corresponding `.json` file in a subdirectory (e.g., `lakshmi-dao/artifacts/contracts/LakshmiZRC20.sol/LakshmiZRC20.json`).
// 3. This JSON file contains the ABI, bytecode, and other metadata.
// 4. For the frontend, you primarily need the ABI.
//
// To use them in the frontend:
// A. Manual Copy: Copy the `abi` array from the JSON files into this `contracts.ts` file.
// B. Symlink/Copy Script: Create a script that copies these JSON files (or just the ABI part) into your `frontend/src` directory after each compilation.
//    Your `frontend/package.json` could have a script like `"postinstall": "cd ../ && npx hardhat compile && cp artifacts/contracts/YourContract.sol/YourContract.json src/constants/YourContractABI.json"` (adjust paths).
// C. TypeChain (Recommended for larger projects): Hardhat's TypeChain plugin generates TypeScript typings from your contracts, including ABIs.
//    You would then import these types/ABIs directly from the `lakshmi-dao/typechain-types` directory. This provides strong typing for contract interactions.
//    If TypeChain is set up in the root, you might configure paths or copy relevant generated files/ABIs to the frontend.
//
// For this placeholder structure, you'll need to replace the placeholder ABIs and addresses
// with your actual deployed contract details and compiled ABIs.
// The hooks and service files in this frontend structure are currently using these placeholders.
//
// Example of setting REACT_APP_... variables in your frontend's .env file (lakshmi-dao/frontend/.env):
// REACT_APP_LAKSHMI_ZRC20_ADDRESS=0xDeployedLakshmiTokenContractAddressOnSepolia
// REACT_APP_DONATION_VAULT_ADDRESS=0xDeployedDonationVaultContractAddressOnSepolia
// REACT_APP_GOVERNANCE_DAO_ADDRESS=0xDeployedGovernanceDAOContractAddressOnSepolia
// REACT_APP_ALCHEMY_API_KEY=YourAlchemyApiKeyForSepolia
// REACT_APP_WALLETCONNECT_PROJECT_ID=YourWalletConnectProjectId
//
// Remember to restart your React development server after changing .env files.
