// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// import "@zetachain/protocol-contracts/contracts/zevm/ZRC20.sol"; // Conceptual import for ZetaChain ZRC20

/**
 * @title LakshmiZRC20Token
 * @author Lakshmi DAO Contributors
 * @notice This contract implements LUCK, an ZRC20-compliant token with omnichain capabilities (conceptual)
 *         and a philanthropic fee mechanism to support charitable causes.
 * @dev This contract uses OpenZeppelin's ERC20 and Ownable implementations.
 *      ZRC20 specific functionalities are stubbed and require integration with ZetaChain's actual ZRC20 interface.
 */
contract LakshmiZRC20 is ERC20, Ownable /*, IZRC20 */ { // IZRC20 would be the ZetaChain ZRC20 interface

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
     * @dev The deployer of the contract becomes the initial owner.
     *      Fee percentage is initialized to 5%.
     */
    constructor(
        uint256 initialSupply,
        address _treasuryAddress
    ) ERC20("Lakshmi ZRC20 Token", "LUCK") Ownable(msg.sender) {
        require(_treasuryAddress != address(0), "LakshmiZRC20: Treasury address cannot be zero");

        _mint(msg.sender, initialSupply);
        treasuryAddress = _treasuryAddress;
        feePercentage = 5; // 5% fee

        emit TreasuryAddressUpdated(address(0), _treasuryAddress);
        emit FeePercentageUpdated(0, feePercentage);
    }

    // --- Owner Functions ---

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
     * @inheritdoc ERC20
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

    // --- ZRC20 Specific Functions (Conceptual Stubs) ---
    // These functions would need to be implemented according to ZetaChain's ZRC20 standard.
    // The actual ZRC20 contract from ZetaChain might provide base implementations or require specific overrides.

    /**
     * @notice Deposits tokens from this ZRC20 contract to a connected chain.
     * @dev This is a conceptual ZRC20 function. Implementation depends on ZetaChain's ZRC20 interface.
     * @param to The recipient address on the target chain (bytes format).
     * @param amount The amount of tokens to deposit.
     * @param targetChainId The ID of the target chain.
     * @param message Additional message data for the cross-chain transaction.
     * @param gasLimit Gas limit for the cross-chain message execution.
     */
    // function deposit(
    //     bytes calldata to,
    //     uint256 amount,
    //     uint256 targetChainId,
    //     bytes calldata message,
    //     uint256 gasLimit
    // ) external virtual /* override (if inheriting from a ZRC20 base) */ {
    //     // Implementation would involve:
    //     // 1. Burning tokens on the source chain (this contract).
    //     // 2. Calling a ZetaChain system contract or function to initiate the cross-chain message.
    //     // _burn(msg.sender, amount);
    //     // IZetaConnector(zetaConnectorAddress).send(...);
    //     revert("LakshmiZRC20: ZRC20 deposit not implemented");
    // }


    /**
     * @notice Processes a withdrawal of tokens that were sent from a connected chain to this ZRC20 contract.
     * @dev This is a conceptual ZRC20 function, often called by the ZetaChain system or a relayer.
     *      It typically involves minting tokens to the recipient on this (target) chain.
     * @param fromChainId The ID of the source chain from which tokens were sent.
     * @param fromAddress The sender address on the source chain.
     * @param to The recipient address on this chain.
     * @param amount The amount of tokens to be minted/credited.
     * @param message Additional message data from the cross-chain transaction.
     * @param ZRC20ContractAddress The address of this ZRC20 contract itself (passed by Zeta system).
     */
    // function onCrossChainCall(
    //     uint256 fromChainId,
    //     address fromAddress, // or bytes
    //     address to,
    //     uint256 amount,
    //     bytes calldata message,
    //     address ZRC20ContractAddress // This contract's address
    // ) external virtual /* override (if inheriting from a ZRC20 base that has this) */ {
    //     // require(msg.sender == zetaSystemContractAddress, "Only Zeta system can call");
    //     // _mint(to, amount);
    //     revert("LakshmiZRC20: ZRC20 onCrossChainCall not implemented");
    // }


    // --- Standard ERC20 functions are inherited from OpenZeppelin's ERC20 contract ---
    // name(), symbol(), decimals(), totalSupply(), balanceOf(), transfer(), allowance(), approve(), transferFrom()
    // No need to explicitly re-declare them unless specific overrides beyond the fee mechanism are needed.

    /**
     * @notice Returns the number of decimals used to display token amounts.
     * @dev Standard ERC20 function. Returns 18 for LUCK token.
     */
    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

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
// interface IZRC20 is ERC20 {
//     function deposit(bytes calldata to, uint256 amount, uint256 targetChainId, bytes calldata message, uint256 gasLimit) external;
//     // This might be part of a different system contract interface that ZRC20 interacts with
//     // function onCrossChainCall(uint256 fromChainId, address fromAddress, address to, uint256 amount, bytes calldata message, address ZRC20ContractAddress) external;
// }
```

I have included:
1.  **ZRC-20 Compliance (Conceptual):** Inherited from `ERC20.sol`. ZRC-20 specific functions (`deposit`, `onCrossChainCall`) and the interface `IZRC20` are commented out as placeholders, as their exact signatures and implementation details depend on ZetaChain's specific libraries, which are not directly available in this environment.
2.  **Token Details:** Name "Lakshmi ZRC20 Token", Symbol "LUCK", Decimals 18.
3.  **Philanthropic Fee (5%):**
    *   Implemented in the overridden `_transfer` internal function.
    *   The fee is transferred to `treasuryAddress`.
    *   Fee logic correctly deducts the fee and sends the remainder.
    *   Transfers involving the `treasuryAddress` (as sender or recipient) or addresses in `isExcludedFromFee` are exempt from the fee.
    *   Minting (`_mint`) and burning (`_burn`) operations, being internal and typically owner-controlled or part of ZRC20 mechanics, are not directly subjected to this `_transfer` fee logic unless they internally call `transfer` that then goes through this path. The current fee logic is tied to the standard `transfer` and `transferFrom` flows via the internal `_transfer`.
4.  **Ownership and Control:**
    *   Uses `Ownable.sol`.
    *   Owner can set/update `treasuryAddress` via `setTreasuryAddress`.
    *   Owner can update `feePercentage` via `setFeePercentage`.
    *   Owner can exclude/include addresses from the fee via `setFeeExclusion`.
5.  **Initial Supply:** Minted to the deployer in the constructor.
6.  **NatSpec Comments:** Added for functions, state variables, and events.
7.  **Utility Function:** `calculateFee` to view expected fee and amount after fee.

The ZRC-20 part is the most significant unknown. If ZetaChain's `ZRC20.sol` is an abstract contract with its own `_transfer` or other hooks, the fee logic might need to be integrated differently or might conflict. The current implementation assumes the fee logic can be applied within the standard OpenZeppelin ERC20 `_transfer` override. If ZetaChain's ZRC20 expects to call its own internal transfer logic, this might need refactoring once the actual ZRC20 base contract is available.
