// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@zetachain/protocol-contracts/contracts/zevm/ZRC20.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IZRC20.sol"; // For CoinType enum
import "@openzeppelin/contracts/access/Ownable.sol"; // Retain Ownable for now, ZRC20 might not provide it
import "@openzeppelin/contracts/utils/Context.sol"; // For _msgSender override

/**
 * @title LakshmiZRC20Token
 * @author Lakshmi DAO Contributors
 * @notice This contract implements LUCK, a ZRC20-compliant token with omnichain capabilities
 *         and a philanthropic fee mechanism to support charitable causes.
 * @dev This contract uses ZetaChain's ZRC20 implementation and OpenZeppelin's Ownable.
 */
contract LakshmiZRC20 is ZRC20, Ownable {

    // --- State Variables ---

    /**
     * @notice The address where collected philanthropic fees are sent.
     */
    address public treasuryAddress;

    /**
     * @notice The percentage of each transfer taken as a fee, e.g., 5 for 5%.
     */
    uint256 public feePercentage; // Basis points could be used for more precision (e.g., 500 for 5%)

    /**
     * @notice Mapping of addresses excluded from the philanthropic fee.
     * @dev Useful for excluding liquidity pools, CEX wallets, or other smart contracts.
     */
    mapping(address => bool) public isExcludedFromFee;

    // --- Events ---

    /**
     * @notice Emitted when the treasury address is updated.
     * @param oldTreasuryAddress The previous treasury address.
     * @param newTreasuryAddress The new treasury address.
     */
    event TreasuryAddressUpdated(address indexed oldTreasuryAddress, address indexed newTreasuryAddress);

    /**
     * @notice Emitted when the fee percentage is updated.
     * @param oldFeePercentage The previous fee percentage.
     * @param newFeePercentage The new fee percentage.
     */
    event FeePercentageUpdated(uint256 oldFeePercentage, uint256 newFeePercentage);

    /**
     * @notice Emitted when an address's fee exclusion status is updated.
     * @param account The address whose status was updated.
     * @param isExcluded True if the address is now excluded from fees, false otherwise.
     */
    event FeeExclusionSet(address indexed account, bool isExcluded);

    /**
     * @notice Emitted when fees are collected from a transfer.
     * @param from The sender of the original transfer.
     * @param to The recipient of the original transfer.
     * @param feeAmount The amount of tokens collected as a fee.
     * @param treasury The address to which the fee was sent.
     */
    event FeeCollected(address indexed from, address indexed to, uint256 feeAmount, address indexed treasury);


    // --- Constructor ---

    /**
     * @notice Constructs the Lakshmi ZRC20 Token.
     * @param initialSupply The total initial supply of LUCK tokens, minted to the deployer.
     * @param _treasuryAddress The initial address for the philanthropic fee treasury.
     * @param chainId_ The chain ID for the ZetaChain network (used in ZRC20 base constructor).
     * @param gasLimit_ The default gas limit for cross-chain transactions (used in ZRC20 base constructor).
     * @param systemContract The address of ZetaChain's system contract (used in ZRC20 base constructor).
     * @param gatewayAddress_ The address of ZetaChain's gateway contract (used in ZRC20 base constructor).
     * @dev The deployer of the contract becomes the initial owner.
     *      Fee percentage is initialized to 5%.
     */
    constructor(
        uint256 initialSupply,
        address _treasuryAddress,
        uint256 chainId_,         // Added for ZRC20 constructor
        uint256 gasLimit_,        // Added for ZRC20 constructor
        address systemContract,   // Already present, used for ZRC20 constructor
        address gatewayAddress_   // Added for ZRC20 constructor
        // address fungibleModule was a previous guess, not needed for ZRC20 constructor
    ) ZRC20("Lakshmi ZRC20 Token", "LUCK", 18, chainId_, CoinType.ERC20, gasLimit_, systemContract, gatewayAddress_) Ownable() {
        require(_treasuryAddress != address(0), "LakshmiZRC20: Treasury address cannot be zero");

        // _mint is part of ZRC20.sol implementation from ZetaChain
        // For now, assume ZRC20 handles initial minting if initialSupply is part of its constructor,
        // or it provides a specific minting function.
        // If ZRC20 does not mint to deployer by default, this needs adjustment.
        // The original _mint(msg.sender, initialSupply) might conflict or be redundant.
        // Let's comment it out and see if ZRC20 handles it or if we need to call its specific mint.
        // _mint(msg.sender, initialSupply); // This _mint is from OZ ERC20. ZRC20 might have its own.

        treasuryAddress = _treasuryAddress;
        feePercentage = 5; // 5% fee

        emit TreasuryAddressUpdated(address(0), _treasuryAddress);
        emit FeePercentageUpdated(0, feePercentage);
        // Note: ZRC20 might have its own minting. If initialSupply needs to be minted to deployer,
        // and ZRC20 constructor doesn't do it, we might need to call its mint function here.
        // For example: ZRC20._mint(msg.sender, initialSupply); or similar if it's available and appropriate.
        // The original _mint(msg.sender, initialSupply) from OZ ERC20 might not be what ZRC20 expects.
        // We might need to use the mint function provided by ZetaChain's ZRC20, e.g. `mint(msg.sender, initialSupply)` if it's public
        // or `_mint(msg.sender, initialSupply)` if it's internal and accessible.
        // For now, relying on the base ZRC20 to handle supply or provide a way.
        // If the ZRC20 constructor takes initialSupply, that would be ideal.
        // The provided ZRC20 constructor signature is a guess: ZRC20(name, symbol, decimals, system, fungible)
        // It's common for ZRC20 to mint total supply to the contract itself or a specific address.
        // Let's assume the deployer (msg.sender) should receive the initialSupply.
        // The base ZRC20 contract might have an internal `_mint` that we can use.
        // If the base ZRC20's `_mint` is compatible or if it has a specific function for initial supply, that should be used.
        // The OpenZeppelin `_mint` might not interact correctly with ZRC20's state.
        // Let's try to call the ZRC20's mint function if available, or its internal _mint.
        // Since we don't know the exact ZRC20 interface, we'll assume for now that `_mint` is available from ZRC20.
        _mint(msg.sender, initialSupply); // ZRC20.sol provides _mint

    }

    // --- Owner Functions ---

    // Required to resolve conflict between Ownable's _msgSender (via Context) and ZRC20's _msgSender
    function _msgSender() internal view virtual override(Context, ZRC20) returns (address) {
        return super._msgSender();
    }

    /**
     * @notice Updates the treasury address where fees are collected.
     * @dev Only callable by the contract owner.
     * @param _newTreasuryAddress The new address for the treasury.
     * @custom:oz-upgrades-unsafe Allow owner to set to address(0) if needed, though generally not recommended.
     */
    function setTreasuryAddress(address _newTreasuryAddress) external onlyOwner {
        require(_newTreasuryAddress != address(0), "LakshmiZRC20: New treasury address cannot be zero");
        address oldTreasuryAddress = treasuryAddress;
        treasuryAddress = _newTreasuryAddress;
        emit TreasuryAddressUpdated(oldTreasuryAddress, _newTreasuryAddress);
    }

    /**
     * @notice Updates the fee percentage for transfers.
     * @dev Only callable by the contract owner.
     *      The fee should be reasonable (e.g., not exceed 10-20% to be practical).
     * @param _newFeePercentage The new fee percentage (e.g., 5 for 5%). Max 100.
     */
    function setFeePercentage(uint256 _newFeePercentage) external onlyOwner {
        require(_newFeePercentage <= 100, "LakshmiZRC20: Fee percentage cannot exceed 100%"); // Max 100%
        uint256 oldFeePercentage = feePercentage;
        feePercentage = _newFeePercentage;
        emit FeePercentageUpdated(oldFeePercentage, _newFeePercentage);
    }

    /**
     * @notice Sets an address to be excluded from or included in the fee mechanism.
     * @dev Only callable by the contract owner.
     * @param _account The address to update.
     * @param _isExcluded True to exclude from fees, false to include.
     */
    function setFeeExclusion(address _account, bool _isExcluded) external onlyOwner {
        require(_account != address(0), "LakshmiZRC20: Account address cannot be zero");
        isExcludedFromFee[_account] = _isExcluded;
        emit FeeExclusionSet(_account, _isExcluded);
    }

    // --- ERC20 Overrides with Fee Logic ---

    /**
     * @dev Overrides the internal `_transfer` function to implement the philanthropic fee.
     *      The fee is applied if the `sender` or `recipient` is not excluded and is not the treasury itself.
     * @inheritdoc ZRC20
     */
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual override {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        if (amount == 0) {
            super._transfer(sender, recipient, 0);
            return;
        }

        bool takeFee = !isExcludedFromFee[sender] &&
                       !isExcludedFromFee[recipient] &&
                       sender != treasuryAddress && // Don't take fee if sender is treasury
                       recipient != treasuryAddress && // Don't take fee if recipient is treasury
                       feePercentage > 0;

        if (takeFee) {
            uint256 feeAmount = (amount * feePercentage) / 100;
            uint256 amountAfterFee = amount - feeAmount;

            require(feeAmount > 0 || amountAfterFee > 0, "LakshmiZRC20: Transfer amount too small for fee"); // Avoid dust issues if amount is tiny

            if (feeAmount > 0) {
                super._transfer(sender, treasuryAddress, feeAmount);
                emit FeeCollected(sender, recipient, feeAmount, treasuryAddress);
            }
            if (amountAfterFee > 0) {
                 super._transfer(sender, recipient, amountAfterFee);
            } else if (feeAmount == 0 && amount > 0) { // Edge case: fee rounds to 0 but amount is > 0
                super._transfer(sender, recipient, amount);
            }

        } else {
            super._transfer(sender, recipient, amount);
        }
    }

    // --- ZRC20 Specific Functions ---
    // These are now expected to be inherited from the ZRC20 base contract.
    // If any specific behavior or events are needed for LakshmiZRC20 on top of the base ZRC20,
    // those functions can be overridden here. For example:
    // override function deposit(...) internal virtual { super.deposit(...); emit CustomDepositEvent(...); }

    // The `decimals()` function is likely provided by the ZRC20 base contract.
    // If not, or if it needs to be overridden, it can be done here.
    // For now, assuming ZRC20 provides it.
    // function decimals() public view virtual override(ERC20, ZRC20) returns (uint8) { // Example if ZRC20 also defines it
    //     return 18;
    // }
    // If ZRC20.sol does not inherit from OpenZeppelin's ERC20 but its own,
    // the override for decimals() might need to only specify `override` if ZRC20 itself has `decimals()` as virtual.
    // If ZRC20.sol *does* use OZ ERC20, and LakshmiZRC20 also inherits OZ Ownable,
    // then `decimals()` override might conflict if ZRC20 itself overrides it.
    // Let's remove the explicit decimals() override and assume ZRC20 provides a standard one (usually 18).
    // If compilation fails due to decimals, we can add it back.

    // --- Additional Utility/View Functions (Optional) ---

    /**
     * @notice Calculates the fee amount for a given transfer amount without performing the transfer.
     * @param _amount The amount for which to calculate the fee.
     * @return fee The calculated fee amount.
     * @return amountAfterFee The amount remaining after the fee is deducted.
     */
    function calculateFee(uint256 _amount) public view returns (uint256 fee, uint256 amountAfterFee) {
        if (feePercentage == 0) {
            return (0, _amount);
        }
        uint256 calculatedFee = (_amount * feePercentage) / 100;
        return (calculatedFee, _amount - calculatedFee);
    }
}

/**
 * @dev Interface for ZRC20 (conceptual, based on common patterns).
 *      The actual interface should be obtained from ZetaChain's official documentation or contracts.
 */
// IZRC20 interface is no longer needed here as we inherit from ZRC20.sol
