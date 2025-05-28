# Lakshmi DAO

## Introduction/Overview

Lakshmi DAO is a decentralized autonomous organization built on the ZetaChain blockchain, dedicated to fostering social impact and transparent charitable giving. Our mission is to leverage blockchain technology to create a global, community-driven platform for funding philanthropic initiatives.

Core features include omnichain donations (accepting contributions from various blockchains, including native Bitcoin), a ZRC-20 governance token (LUCK) with a built-in philanthropic fee, a secure Donation Vault, and a quadratic voting-based governance system to ensure fair and decentralized decision-making.

## Features

*   **Lakshmi (LUCK) ZRC-20 Token:** The native governance token of the DAO with a built-in philanthropic fee on transfers to support the treasury.
*   **Donation Vault:** Securely holds donated assets (ETH, ZRC-20 tokens including LUCK, and assets bridged from other chains like Bitcoin).
*   **Quadratic Governance DAO:** Empowers LUCK token holders to propose, vote on, and execute initiatives. Quadratic voting ensures a more democratic distribution of voting power.
*   **Omnichain Donations:**
    *   Accepts ZRC-20 tokens from any ZetaChain-connected chain.
    *   Supports native Bitcoin donations facilitated by ZetaChain's TSS and omnichain smart contracts.
*   **Deflationary Mechanism:** A small percentage of LUCK tokens are burned during cross-chain outbound transfers, contributing to token scarcity.
*   **Transparent Operations:** All donations, proposals, votes, and fund distributions are recorded on the blockchain.
*   **Community-Driven:** Decisions are made by LUCK token holders through the governance process.

## Architecture Overview

The Lakshmi DAO operates primarily on the ZetaChain EVM (ZEVM) and leverages its cross-chain messaging capabilities. The core smart contracts are:

*   **`LakshmiZRC20.sol` (LUCK):** The ZRC-20 compliant governance and utility token. It includes a fee mechanism on transfers that contributes to a philanthropic treasury and a deflationary burn on cross-chain sends.
*   **`DonationVault.sol`:** A smart contract that securely stores donated assets. It accepts ETH, various ZRC-20 tokens (including LUCK from any connected chain), and processes Bitcoin donations via ZetaChain's omnichain contract interactions. Fund releases are controlled by the GovernanceDAO.
*   **`GovernanceDAO.sol`:** The heart of the DAO, enabling LUCK token holders to create proposals, participate in quadratic voting, and execute passed proposals. It manages the decision-making process for fund allocation and DAO operations.

ZetaChain's omnichain capabilities allow users to interact with Lakshmi DAO from various connected blockchains, making donations and potentially participating in governance seamlessly.

## Getting Started / Prerequisites

To get started with developing or interacting with Lakshmi DAO, you'll need:

*   **Node.js:** v18.x or later (e.g., v18.18.0)
*   **Package Manager:** Yarn (recommended) or npm
*   **Git:** For cloning the repository.
*   **Hardhat:** Ethereum development environment. Installed as a project dependency.
*   **`zeta-cli`:** ZetaChain command-line interface for interacting with the ZetaChain network.
    *   Installation Guide: [ZetaChain CLI Documentation](https://www.zetachain.com/docs/reference/zeta-cli/installation/)
*   **Wallet:**
    *   EVM-compatible wallet like MetaMask for interacting with ZetaChain EVM and other EVM chains.
    *   XDEFI Wallet (or similar supporting ZetaChain) for interacting with native Bitcoin donations if testing that feature.

## Installation / Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/lakshmi-dao.git
    ```

2.  **Navigate to the project directory:**
    ```bash
    cd lakshmi-dao
    ```

3.  **Install dependencies:**
    It's recommended to install ZetaChain toolkit and OpenZeppelin contracts at the root of your Hardhat project.
    ```bash
    yarn install
    # Or if you prefer npm:
    # npm install

    # Example specific package installations if needed (these should be in package.json):
    # yarn add @zetachain/toolkit @openzeppelin/contracts
    ```

4.  **Set up environment variables:**
    Copy the example environment file and fill in your details:
    ```bash
    cp .env.example .env
    ```
    Open `.env` in a text editor and update the following variables:
    *   `PRIVATE_KEY`: Your private key for deploying contracts and sending transactions. **Never commit this file with a real private key for mainnet usage.** Use a burner wallet for development.
    *   `ZETACHAIN_API_KEY`: (Optional) Your API key if using a specific ZetaChain RPC provider that requires it for testnet/mainnet.
    *   `ETHERSCAN_API_KEY`: Your Etherscan (or ZetaScan, if compatible) API key for contract verification.
    *   `ALCHEMY_API_KEY` or `INFURA_ID`: (Optional) If you need to interact with Ethereum or other EVM testnets/mainnets for ZRC-20 testing or other interactions.
    *   `TREASURY_ADDRESS`: The initial address where philanthropic fees from `LakshmiZRC20` will be collected.
    *   `INITIAL_OWNER_ADDRESS`: The address that will initially own the deployed smart contracts. This should ideally be a multisig or a secure address for eventual transfer to DAO control.

## Available Scripts (Hardhat & `zeta-cli`)

### Hardhat

*   **Compile contracts:**
    ```bash
    npx hardhat compile
    ```
*   **Run unit tests:**
    ```bash
    npx hardhat test
    ```
*   **Generate test coverage report:**
    ```bash
    npx hardhat coverage
    ```
*   **Start a local Hardhat development node:**
    ```bash
    npx hardhat node
    ```
*   **Deploy contracts (example to a configured network):**
    The `deploy.ts` script handles deployment of all core contracts.
    ```bash
    npx hardhat run scripts/deploy.ts --network <network_name>
    ```
    Replace `<network_name>` with networks configured in `hardhat.config.ts` (e.g., `zeta_testnet`, `zeta_mainnet`, `zeta_localnet`).

*   **Run ZetaChain specific tests (local network):**
    ```bash
    npx hardhat zeta-test --network zeta_localnet
    ```

### `zeta-cli`

The `zeta-cli` is essential for deploying and interacting with omnichain contracts on ZetaChain, especially for ZRC-20 deployment and cross-chain transactions.

*   **Deploying a ZRC-20 contract (conceptual example for system-managed ZRC-20):**
    Refer to the official ZetaChain documentation for the exact commands and parameters.
    ```bash
    # Example (syntax will vary based on actual zeta-cli commands for ZRC-20 deployment):
    # zeta-cli tx fungible deploy-zrc20 "Lakshmi Token" LUCK 18 100000000 Mainnet ZetaChainGasPrice --chain zeta_testnet --json
    ```
    *Note: Our `LakshmiZRC20.sol` is an ZRC20-compliant ERC20. For true omnichain functionality as a ZRC-20 managed by ZetaChain's system, it would typically be deployed via specific ZetaChain mechanisms. The `deploy.ts` script deploys `LakshmiZRC20.sol` as a standard contract on ZEVM.*

*   **Sending transactions or interacting with deployed contracts via `zeta-cli`:**
    ```bash
    # Example: zeta-cli tx send <contract_address> <amount_in_ZETA_for_gas> <method_signature_or_encoded_data> [params...] --keyring-backend ... --chain-id ...
    # Example from prompt:
    # zeta-cli tx send ZetaChainAddr 0 donateBitcoin 0xCauseAddress --grpc-url "https://zetachain-athens.blockpi.network/grpc-web" --chain-id athens_7001-1 --json
    ```
    Consult the [ZetaChain CLI Documentation](https://www.zetachain.com/docs/reference/zeta-cli/overview/) for detailed command usage.

## Testing

### Unit Tests

Unit tests for the smart contracts are located in the `test/` directory. Run them using:
```bash
npx hardhat test
```

### End-to-End Tests (Conceptual)

End-to-End (E2E) testing involves verifying the complete workflow of the DAO across different components and potentially different chains.

1.  **Deployment:** Deploy all core contracts (`LakshmiZRC20`, `DonationVault`, `GovernanceDAO`) to a ZetaChain testnet (e.g., Athens 3).
2.  **Interaction Scenarios:**
    *   **Donations:**
        *   Donate native ZETA (or ETH on ZEVM) and ZRC-20 tokens to `DonationVault` on ZetaChain.
        *   (Advanced) Test Bitcoin donations: Use XDEFI wallet to send testnet BTC to the TSS address, and verify the corresponding ZRC-20 or accounting occurs in the `DonationVault` on ZetaChain.
        *   (Advanced) Test ZRC-20 donations from a connected EVM testnet (e.g., Sepolia) to ZetaChain.
    *   **Governance:**
        *   Create a proposal using a LUCK token holder account.
        *   Have multiple accounts vote on the proposal (For, Against, Abstain) using quadratic voting.
        *   Verify proposal state changes correctly after voting period (Active -> Succeeded/Defeated).
        *   Execute a succeeded proposal and verify its on-chain effects (e.g., funds released from `DonationVault`).
    *   **Philanthropic Fee & Burn:**
        *   Transfer LUCK tokens and verify the philanthropic fee is correctly sent to the treasury.
        *   (Advanced) Perform a cross-chain send of LUCK tokens (outbound from ZetaChain) and verify the burn mechanism.
3.  **Tools:**
    *   Use Hardhat scripts (`scripts/interact.ts`) for on-chain interactions.
    *   Use the developed frontend application on a testnet.
    *   Use ZetaChain block explorers to monitor transactions.

*This section describes the approach to E2E testing. Actual E2E test scripts would be developed as part of the project, potentially using frameworks like Playwright or Cypress for frontend interactions combined with ethers.js/viem for blockchain interactions.*

## Deployment

Contracts are deployed to ZetaChain (Localnet, Testnet, Mainnet).

1.  **Configure `.env`:** Ensure your `PRIVATE_KEY`, `ZETACHAIN_API_KEY` (if applicable), and other network-specific variables are correctly set.
2.  **Compile Contracts:**
    ```bash
    npx hardhat compile
    ```
3.  **Run Deployment Script:**
    *   **Localnet (using `zeta_localnet` configured in `hardhat.config.ts`):**
        ```bash
        npx hardhat run scripts/deploy.ts --network zeta_localnet
        ```
    *   **ZetaChain Testnet (e.g., Athens 3, using `zeta_testnet`):**
        ```bash
        npx hardhat run scripts/deploy.ts --network zeta_testnet
        ```
    *   **ZetaChain Mainnet (using `zeta_mainnet`):**
        ```bash
        # Ensure thorough review, testing, and a secure deployment process (e.g., using a multisig deployer)
        npx hardhat run scripts/deploy.ts --network zeta_mainnet
        ```
4.  **Using `zeta-cli` for Omnichain Aspects:**
    For deploying or managing ZRC-20 aspects that are deeply integrated with ZetaChain's system contracts (e.g., if LUCK were a ZRC-20 token directly managed by the ZetaChain protocol rather than just an ZRC20-compliant ERC20 on ZEVM), `zeta-cli` would be used. Refer to ZetaChain's official documentation for these procedures. The `LakshmiZRC20.sol` in this project is an ZRC20-compliant ERC20, deployable via Hardhat. True omnichain features like `deposit` and `onCrossChainCall` would require interaction with ZetaChain's system contracts, potentially after this ZRC20-compliant token is whitelisted or wrapped by the ZetaChain system.

5.  **Contract Verification:**
    After deployment, verify contracts on the ZetaChain explorer using Hardhat plugins (e.g., `hardhat-etherscan` if the explorer is compatible) or manually.

## Interacting with Contracts

*   **Via Scripts:** The `scripts/interact.ts` file provides examples of how to interact with deployed smart contracts using ethers.js. Modify and run it with:
    ```bash
    npx hardhat run scripts/interact.ts --network <network_name>
    ```
*   **Via Frontend:** Once the frontend is set up and connected to the correct network, users can interact with the DAO through the web interface.

## Frontend

The frontend application provides a user interface for Lakshmi DAO.

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```
2.  **Install dependencies:**
    ```bash
    yarn install
    # Or if you prefer npm:
    # npm install
    ```
3.  **Set up frontend environment variables:**
    Create a `.env` file in the `frontend` directory (e.g., `frontend/.env`) for frontend-specific variables like:
    ```
    REACT_APP_ALCHEMY_API_KEY=your_alchemy_key_if_needed
    REACT_APP_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
    REACT_APP_LAKSHMI_ZRC20_ADDRESS=0x... (address of deployed LUCK token)
    REACT_APP_DONATION_VAULT_ADDRESS=0x...
    REACT_APP_GOVERNANCE_DAO_ADDRESS=0x...
    REACT_APP_ZETACHAIN_NETWORK_NAME="ZetaChain Athens 3 Testnet"
    REACT_APP_ZETACHAIN_CHAIN_ID=7001
    ```
4.  **Start the development server:**
    ```bash
    yarn start
    ```
    This will open the app in your browser, usually at `http://localhost:3000`.

5.  **Build for production:**
    ```bash
    yarn build
    ```
    This creates an optimized static build in the `frontend/build` directory.

## Contributing to the DAO

Lakshmi DAO is a community-driven project. Contributions are welcome in various forms:

*   **Proposing Initiatives:** LUCK token holders can create proposals through the `GovernanceDAO` to suggest new features, funding allocations, or changes to DAO parameters.
*   **Voting:** Participate in voting on active proposals to shape the direction of the DAO.
*   **Development:** Contribute to the codebase (smart contracts, frontend, documentation). Please follow the guidelines in `CONTRIBUTING.md` (to be created).
*   **Community Support:** Help new users, participate in discussions, and promote the DAO's mission.

We encourage a respectful and collaborative environment. Please adhere to our Code of Conduct (to be created).

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
```
