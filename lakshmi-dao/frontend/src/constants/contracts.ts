// This file would typically store your contract ABIs and addresses.
// For this project structure, ABIs might be large, so they are often imported from
// the artifacts directory of your Hardhat project or managed via typechain.

// --- Contract Addresses ---
// Replace these with your deployed contract addresses.
// You might get these from your deployment script output or a configuration file.

// Default (e.g., Sepolia or local)
export const LAKSHMI_ZRC20_ADDRESS_DEFAULT = process.env.REACT_APP_LAKSHMI_ZRC20_ADDRESS || "0xYourDefaultLakshmiZRC20Address";
export const DONATION_VAULT_ADDRESS_DEFAULT = process.env.REACT_APP_DONATION_VAULT_ADDRESS || "0xYourDefaultDonationVaultAddress";
export const GOVERNANCE_DAO_ADDRESS_DEFAULT = process.env.REACT_APP_GOVERNANCE_DAO_ADDRESS || "0xYourDefaultGovernanceDAOAddress";

// ZetaChain Specific Addresses
export const LAKSHMI_ZRC20_ADDRESS_ZETACHAIN = process.env.REACT_APP_LAKSHMI_ZRC20_ADDRESS_ZETACHAIN || "YOUR_LAKSHMI_ZRC20_ADDRESS_ON_ZETACHAIN";
// Add other ZetaChain specific addresses if needed, e.g.:
// export const DONATION_VAULT_ADDRESS_ZETACHAIN = process.env.REACT_APP_DONATION_VAULT_ADDRESS_ZETACHAIN || "YOUR_DONATION_VAULT_ADDRESS_ON_ZETACHAIN";
// export const GOVERNANCE_DAO_ADDRESS_ZETACHAIN = process.env.REACT_APP_GOVERNANCE_DAO_ADDRESS_ZETACHAIN || "YOUR_GOVERNANCE_DAO_ADDRESS_ON_ZETACHAIN";


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
    if (LAKSHMI_ZRC20_ADDRESS_DEFAULT === "0xYourDefaultLakshmiZRC20Address") {
        console.warn("Default LakshmiZRC20 contract address not set in .env. Placeholder is being used for default network.");
    }
    if (LAKSHMI_ZRC20_ADDRESS_ZETACHAIN === "YOUR_LAKSHMI_ZRC20_ADDRESS_ON_ZETACHAIN") {
        console.warn("ZetaChain LakshmiZRC20 contract address not set in .env. Placeholder is being used for ZetaChain.");
    }
    // Add similar warnings for other default and ZetaChain-specific addresses if they are critical
}

export const ZETACHAIN_ATHENS_3_CHAIN_ID = 7001;

// Function to get the correct LakshmiZRC20 address based on chainId
export const getLakshmiZrc20Address = (chainId?: number): `0x${string}` | undefined => {
  if (chainId === ZETACHAIN_ATHENS_3_CHAIN_ID) {
    if (LAKSHMI_ZRC20_ADDRESS_ZETACHAIN === "YOUR_LAKSHMI_ZRC20_ADDRESS_ON_ZETACHAIN") return undefined; // Not configured
    return LAKSHMI_ZRC20_ADDRESS_ZETACHAIN as `0x${string}`;
  }
  // Fallback to default (e.g., Sepolia or local Hardhat network if configured)
  if (LAKSHMI_ZRC20_ADDRESS_DEFAULT === "0xYourDefaultLakshmiZRC20Address") return undefined; // Not configured
  return LAKSHMI_ZRC20_ADDRESS_DEFAULT as `0x${string}`;
};
// Add similar getter functions for other contracts if they also have per-network addresses


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
