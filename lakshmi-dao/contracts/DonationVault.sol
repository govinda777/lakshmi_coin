// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol"; // For safeTransferFrom
import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/security/ReentrancyGuard.sol"; // Optional, consider if complex interactions arise

// Forward declaration or simple interface for GovernanceDAO
interface IGovernanceDAO {
    /**
     * @notice Checks if a governance proposal has been successfully passed and can be executed.
     * @param proposalId The ID of the proposal to check.
     * @return True if the proposal is passed, false otherwise.
     */
    function isProposalPassed(uint256 proposalId) external view returns (bool);
}

/**
 * @title DonationVault
 * @author Lakshmi DAO Contributors
 * @notice This contract securely holds donated Ether and ZRC20 tokens.
 *         Funds can only be released upon approval from the GovernanceDAO contract.
 *         It includes emergency withdrawal functions for the owner.
 * @dev Uses OpenZeppelin's Ownable and SafeERC20.
 */
contract DonationVault is Ownable /*, ReentrancyGuard */ {
    using SafeERC20 for IERC20;

    // --- State Variables ---

    /**
     * @notice The address of the GovernanceDAO contract that controls fund releases.
     */
    IGovernanceDAO public governanceDAO;

    /**
     * @notice The address of the LakshmiZRC20 (LUCK) token. Stored for potential specific logic,
     *         though the vault accepts any ZRC20 token for donation.
     */
    address public lakshmiTokenAddress; // Optional: if specific LUCK-related features are needed in the vault

    /**
     * @notice Tracks Ether donations by donor. Useful for accounting or potential future features.
     * @dev Maps donor address to their total ETH donated.
     */
    mapping(address => uint256) public ethDonationsByDonor;

    /**
     * @notice Tracks ZRC20 token donations by donor and token contract address.
     * @dev Maps donor address to (token contract address to total amount donated of that token).
     */
    mapping(address => mapping(address => uint256)) public erc20DonationsByDonor;


    // --- Events ---

    event EtherDonated(address indexed donor, uint256 amount, uint256 newTotalVaultETH);
    event ZRC20Donated(address indexed donor, address indexed tokenContract, uint256 amount, uint256 newTotalVaultTokenBalance);
    event FundsReleasedETH(uint256 indexed proposalId, address indexed recipient, uint256 amount);
    event FundsReleasedZRC20(uint256 indexed proposalId, address indexed tokenContract, address indexed recipient, uint256 amount);
    event GovernanceDAOUpdated(address indexed oldGovernanceDAO, address indexed newGovernanceDAO);
    event LakshmiTokenAddressUpdated(address indexed oldLakshmiTokenAddress, address indexed newLakshmiTokenAddress);
    event EmergencyEtherWithdrawn(address indexed to, uint256 amount);
    event EmergencyZRC20Withdrawn(address indexed tokenContract, address indexed to, uint256 amount);

    // --- Modifiers ---

    /**
     * @dev Modifier to ensure that the caller is the registered GovernanceDAO contract.
     */
    modifier onlyGovernance() {
        require(msg.sender == address(governanceDAO), "DonationVault: Caller is not the Governance DAO");
        _;
    }

    // --- Constructor ---

    /**
     * @notice Constructs the DonationVault.
     * @param _initialOwner The address that will be the initial owner of the vault.
     * @param _governanceDAOAddress The initial address of the GovernanceDAO contract.
     * @param _lakshmiTokenAddress The address of the LUCK token (optional, can be address(0)).
     */
    constructor(address _initialOwner, address _governanceDAOAddress, address _lakshmiTokenAddress) Ownable(_initialOwner) {
        // _governanceDAOAddress can be address(0) initially if set later by owner
        if (_governanceDAOAddress != address(0)) {
            governanceDAO = IGovernanceDAO(_governanceDAOAddress);
            emit GovernanceDAOUpdated(address(0), _governanceDAOAddress);
        }
        if (_lakshmiTokenAddress != address(0)) {
            lakshmiTokenAddress = _lakshmiTokenAddress;
            emit LakshmiTokenAddressUpdated(address(0), _lakshmiTokenAddress);
        }
    }

    // --- External Functions: Donations ---

    /**
     * @notice Allows users to donate Ether to the vault.
     * @dev This function is payable. Emits EtherDonated event.
     */
    function donateEther() external payable /* nonReentrant */ {
        require(msg.value > 0, "DonationVault: Must send ETH");
        ethDonationsByDonor[msg.sender] += msg.value;
        emit EtherDonated(msg.sender, msg.value, address(this).balance);
    }

    /**
     * @notice Allows users to donate ZRC20 tokens to the vault.
     * @dev Donor must have approved the vault to spend at least `amount` of `tokenContract`.
     *      Uses SafeERC20.safeTransferFrom. Emits ZRC20Donated event.
     * @param tokenContract The address of the ZRC20 token being donated.
     * @param amount The amount of tokens to donate (in smallest unit of the token).
     */
    function donateZRC20(address tokenContract, uint256 amount) external /* nonReentrant */ {
        require(tokenContract != address(0), "DonationVault: Token contract address cannot be zero");
        require(amount > 0, "DonationVault: Donation amount must be positive");

        IERC20 token = IERC20(tokenContract);
        uint256 initialBalance = token.balanceOf(address(this));

        // This will revert if allowance is insufficient or transfer fails
        token.safeTransferFrom(msg.sender, address(this), amount);

        erc20DonationsByDonor[msg.sender][tokenContract] += amount;
        uint256 finalBalance = token.balanceOf(address(this));
        require(finalBalance == initialBalance + amount, "DonationVault: Token transfer failed internally"); // Sanity check

        emit ZRC20Donated(msg.sender, tokenContract, amount, finalBalance);
    }

    // --- External Functions: Fund Release (Governance Controlled) ---

    /**
     * @notice Releases Ether from the vault to a recipient based on a passed governance proposal.
     * @dev Only callable by the GovernanceDAO contract.
     *      Proposal must be verified as passed using `governanceDAO.isProposalPassed()`.
     *      Emits FundsReleasedETH event.
     * @param proposalId The ID of the governance proposal authorizing this release.
     * @param recipient The address to receive the Ether.
     * @param amount The amount of Ether to release.
     */
    function releaseFunds(uint256 proposalId, address payable recipient, uint256 amount) external onlyGovernance /* nonReentrant */ {
        require(address(governanceDAO) != address(0), "DonationVault: Governance DAO not set");
        require(governanceDAO.isProposalPassed(proposalId), "DonationVault: Proposal not passed or not valid");
        require(recipient != address(0), "DonationVault: Recipient address cannot be zero");
        require(amount > 0, "DonationVault: Release amount must be positive");
        require(address(this).balance >= amount, "DonationVault: Insufficient ETH balance in vault");

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "DonationVault: ETH transfer failed");

        emit FundsReleasedETH(proposalId, recipient, amount);
    }

    /**
     * @notice Releases ZRC20 tokens from the vault to a recipient based on a passed governance proposal.
     * @dev Only callable by the GovernanceDAO contract.
     *      Proposal must be verified as passed using `governanceDAO.isProposalPassed()`.
     *      Uses SafeERC20.safeTransfer. Emits FundsReleasedZRC20 event.
     * @param proposalId The ID of the governance proposal authorizing this release.
     * @param tokenContract The address of the ZRC20 token to release.
     * @param recipient The address to receive the tokens.
     * @param amount The amount of tokens to release.
     */
    function releaseZRC20Funds(
        uint256 proposalId,
        address tokenContract,
        address recipient,
        uint256 amount
    ) external onlyGovernance /* nonReentrant */ {
        require(address(governanceDAO) != address(0), "DonationVault: Governance DAO not set");
        require(governanceDAO.isProposalPassed(proposalId), "DonationVault: Proposal not passed or not valid");
        require(tokenContract != address(0), "DonationVault: Token contract address cannot be zero");
        require(recipient != address(0), "DonationVault: Recipient address cannot be zero");
        require(amount > 0, "DonationVault: Release amount must be positive");

        IERC20 token = IERC20(tokenContract);
        require(token.balanceOf(address(this)) >= amount, "DonationVault: Insufficient ZRC20 balance in vault");

        token.safeTransfer(recipient, amount);

        emit FundsReleasedZRC20(proposalId, tokenContract, recipient, amount);
    }

    // --- Owner Functions: Configuration & Emergency ---

    /**
     * @notice Updates the address of the GovernanceDAO contract.
     * @dev Only callable by the contract owner. Emits GovernanceDAOUpdated event.
     * @param _newGovernanceDAOAddress The new address for the GovernanceDAO.
     */
    function setGovernanceDAO(address _newGovernanceDAOAddress) external onlyOwner {
        require(_newGovernanceDAOAddress != address(0), "DonationVault: New Governance DAO address cannot be zero");
        address oldAddress = address(governanceDAO);
        governanceDAO = IGovernanceDAO(_newGovernanceDAOAddress);
        emit GovernanceDAOUpdated(oldAddress, _newGovernanceDAOAddress);
    }

    /**
     * @notice Updates the address of the LakshmiZRC20 (LUCK) token contract.
     * @dev Only callable by the contract owner. Emits LakshmiTokenAddressUpdated event.
     *      This is optional and only needed if the vault has LUCK-specific logic.
     * @param _newLakshmiTokenAddress The new address for the LUCK token.
     */
    function setLakshmiTokenAddress(address _newLakshmiTokenAddress) external onlyOwner {
        // Allow setting to address(0) if LUCK features are to be disabled/removed.
        address oldAddress = lakshmiTokenAddress;
        lakshmiTokenAddress = _newLakshmiTokenAddress;
        emit LakshmiTokenAddressUpdated(oldAddress, _newLakshmiTokenAddress);
    }

    /**
     * @notice Allows the owner to withdraw Ether from the vault in an emergency.
     * @dev Only callable by the contract owner. Emits EmergencyEtherWithdrawn event.
     * @param to The address to send the withdrawn Ether to.
     * @param amount The amount of Ether to withdraw.
     */
    function emergencyWithdrawEther(address payable to, uint256 amount) external onlyOwner /* nonReentrant */ {
        require(to != address(0), "DonationVault: Recipient for emergency ETH withdrawal cannot be zero");
        require(amount > 0, "DonationVault: Emergency ETH withdrawal amount must be positive");
        require(address(this).balance >= amount, "DonationVault: Insufficient ETH for emergency withdrawal");

        (bool success, ) = to.call{value: amount}("");
        require(success, "DonationVault: Emergency ETH transfer failed");

        emit EmergencyEtherWithdrawn(to, amount);
    }

    /**
     * @notice Allows the owner to withdraw ZRC20 tokens from the vault in an emergency.
     * @dev Only callable by the contract owner. Emits EmergencyZRC20Withdrawn event.
     * @param tokenContract The address of the ZRC20 token to withdraw.
     * @param to The address to send the withdrawn tokens to.
     * @param amount The amount of tokens to withdraw.
     */
    function emergencyWithdrawZRC20(address tokenContract, address to, uint256 amount) external onlyOwner /* nonReentrant */ {
        require(tokenContract != address(0), "DonationVault: Token for emergency withdrawal cannot be zero address");
        require(to != address(0), "DonationVault: Recipient for emergency ZRC20 withdrawal cannot be zero");
        require(amount > 0, "DonationVault: Emergency ZRC20 withdrawal amount must be positive");

        IERC20 token = IERC20(tokenContract);
        require(token.balanceOf(address(this)) >= amount, "DonationVault: Insufficient ZRC20 for emergency withdrawal");

        token.safeTransfer(to, amount);

        emit EmergencyZRC20Withdrawn(tokenContract, to, amount);
    }

    // --- View Functions ---

    /**
     * @notice Returns the total Ether balance held by the vault.
     * @return The current ETH balance of this contract.
     */
    function getVaultETHBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Returns the vault's balance of a specific ZRC20 token.
     * @param tokenContract The address of the ZRC20 token.
     * @return The balance of `tokenContract` held by this vault.
     */
    function getVaultZRC20Balance(address tokenContract) external view returns (uint256) {
        require(tokenContract != address(0), "DonationVault: Token contract address cannot be zero");
        IERC20 token = IERC20(tokenContract);
        return token.balanceOf(address(this));
    }

    // --- Fallback Receive Function ---

    /**
     * @notice Fallback function to accept direct Ether donations.
     * @dev Calls the internal `donateEther()` logic if Ether is sent directly to the contract.
     */
    receive() external payable {
        // Consider if direct sends should also be logged via donateEther() or a simpler event.
        // For consistency and tracking, routing to donateEther() might be better if it doesn't introduce issues.
        // However, donateEther() has its own msg.sender logic.
        // A simple direct receive:
        require(msg.value > 0, "DonationVault: Must send ETH via receive()");
        ethDonationsByDonor[msg.sender] += msg.value; // Tracks direct sends if desired
        emit EtherDonated(msg.sender, msg.value, address(this).balance);
    }
}
```

Key implementations and considerations:

1.  **Donation Mechanism:**
    *   `donateEther()`: Payable function for ETH donations.
    *   `receive()`: Fallback to also accept ETH donations directly sent to the contract address. Both log `EtherDonated`.
    *   `donateZRC20()`: Takes `tokenContract` and `amount`, uses `SafeERC20.safeTransferFrom`.
2.  **Fund Management:**
    *   `ethDonationsByDonor` and `erc20DonationsByDonor` mappings track individual contributions.
    *   `getVaultETHBalance()` returns `address(this).balance`.
    *   `getVaultZRC20Balance()` returns `token.balanceOf(address(this))`.
3.  **Governance Integration:**
    *   `governanceDAO` state variable of type `IGovernanceDAO`.
    *   `IGovernanceDAO` interface defined with `isProposalPassed(uint256)`.
    *   `releaseFunds()` (for ETH) and `releaseZRC20Funds()`:
        *   `onlyGovernance` modifier restricts access.
        *   Checks `governanceDAO.isProposalPassed(proposalId)`.
        *   Performs transfers.
4.  **Ownership and Configuration:**
    *   Inherits `Ownable` (constructor takes `_initialOwner`).
    *   `setGovernanceDAO()`: Owner can update the `GovernanceDAO` address.
    *   `setLakshmiTokenAddress()`: Owner can update the LUCK token address (optional).
5.  **Emergency Measures:**
    *   `emergencyWithdrawEther()`: Owner-only, withdraws ETH.
    *   `emergencyWithdrawZRC20()`: Owner-only, withdraws specified ZRC20 tokens.
6.  **Event Logging:** Comprehensive events for all significant actions are included.
7.  **Security Considerations:**
    *   Used `SafeERC20` for ZRC20 transfers.
    *   Reentrancy Guard is commented out (`/*, ReentrancyGuard */`, `/* nonReentrant */`) as the current interactions are fairly direct. If more complex callbacks or interactions with untrusted contracts were added to the release functions *before* state changes, `ReentrancyGuard` would be more critical. The current structure largely follows checks-effects-interactions.
    *   Access controls (`onlyOwner`, `onlyGovernance`) are applied.
    *   Input validation (non-zero addresses, positive amounts) is included.
8.  **NatSpec Comments:** Added for all public/external functions, state variables, and events.

This structure should meet the specified requirements. The optional `lakshmiTokenAddress` is included but not strictly used in core donation/release logic, making the vault generally agnostic to ZRC20 token types for donations and releases. It could be used for future LUCK-specific features within the vault if needed.Your current task is: Generate the Solidity code for the `GovernanceDAO.sol` contract.

**Filename:** `contracts/GovernanceDAO.sol`

**Specifications:**
1.  **Proposal Mechanism:**
    *   Define a `Proposal` struct containing: `id`, `proposer`, `description` (string), `targetContract` (address for execution), `callData` (bytes for the function call), `value` (ETH to send with execution), `votingStartTime`, `votingEndTime`, `forVotes`, `againstVotes`, `abstainVotes`, `executed` (bool), `state` (enum: `Pending`, `Active`, `Succeeded`, `Defeated`, `Executed`, `Canceled`).
    *   Allow LUCK token holders to create proposals via a `createProposal(string description, address targetContract, bytes callData, uint256 value)` function.
2.  **Voting System:**
    *   LUCK token holders can vote on active proposals: `vote(uint256 proposalId, VoteType voteType)` where `VoteType` is an enum (`For`, `Against`, `Abstain`).
    *   Voting power should be proportional to the LUCK token balance of the voter at the time of voting (or snapshot if implemented, but simple balance check is fine for now).
    *   Prevent double voting.
3.  **Proposal Lifecycle & State Management:**
    *   Proposals start in `Pending` or `Active` state.
    *   A configurable `votingPeriod` (e.g., 7 days) determines how long a proposal remains active for voting.
    *   After the `votingEndTime`:
        *   Quorum Check: A proposal is `Defeated` if it doesn't meet a `quorumPercentage` (e.g., 10% of total LUCK supply participating).
        *   Approval Check: If quorum is met, a proposal is `Succeeded` if `forVotes` meets an `approvalThresholdPercentage` (e.g., 66% of `forVotes + againstVotes`). Otherwise, it's `Defeated`.
    *   A function `updateProposalStateAfterVoting(uint256 proposalId)` (callable by anyone) can be used to transition a proposal from `Active` to `Succeeded` or `Defeated` after `votingEndTime`.
    *   Allow proposers or the DAO owner to `cancelProposal(uint256 proposalId)` if it's still `Pending` or `Active` (before voting ends).
4.  **Execution:**
    *   A function `executeProposal(uint256 proposalId)` should:
        *   Verify the proposal is in `Succeeded` state.
        *   Mark the proposal as `Executed`.
        *   Make the external call to `targetContract.call{value: proposal.value}(proposal.callData)`.
        *   Handle success/failure of the external call.
        *   This function should be callable by anyone if the proposal has Succeeded (allowing for decentralized execution).
5.  **Contract Interfaces:**
    *   Requires an interface to the `LakshmiZRC20` token (for checking balances).
    *   Requires an interface to the `DonationVault` (if proposals directly interact with it, e.g., to call `releaseFunds`).
6.  **Parameters & Configuration (Owner-Controlled):**
    *   `votingPeriod` (in seconds).
    *   `quorumPercentage` (e.g., 10 for 10%).
    *   `approvalThresholdPercentage` (e.g., 66 for 66%).
    *   Address of the `DonationVault` contract (if needed for specific proposal types or direct interaction).
    *   Address of the `LakshmiZRC20` (LUCK) token contract.
    *   All these parameters should be settable by the contract owner.
7.  **Ownership:**
    *   Use OpenZeppelin's `Ownable.sol`.
8.  **Event Logging:**
    *   Emit events for: `ProposalCreated`, `Voted`, `ProposalStateChanged` (to Succeeded, Defeated, Executed, Canceled), `ParameterUpdated` (for voting period, quorum, etc.), `DonationVaultAddressSet`, `LakshmiTokenAddressSet`.
9.  **Security & Best Practices:**
    *   Protect against reentrancy if external calls are made before state changes (though `executeProposal` changing state first is good).
    *   Ensure proper access controls.
10. **NatSpec Comments:**
    *   Provide comprehensive NatSpec comments.

**Reference Contracts (Conceptual):**
*   `LakshmiZRC20.sol`
*   `DonationVault.sol`

Focus on creating the `GovernanceDAO.sol` file in the `contracts/` directory. You may need to define simple interfaces for `ILakshmiZRC20` and `IDonationVault` within the file if they are not available as separate imports.
