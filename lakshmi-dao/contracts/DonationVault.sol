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
    constructor(address _initialOwner, address _governanceDAOAddress, address _lakshmiTokenAddress) Ownable() {
        // _governanceDAOAddress can be address(0) initially if set later by owner
        // Set initial owner using _transferOwnership directly if needed, Ownable() sets msg.sender
        if (msg.sender != _initialOwner) { // Transfer ownership if _initialOwner is not deployer
            _transferOwnership(_initialOwner);
        }
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
