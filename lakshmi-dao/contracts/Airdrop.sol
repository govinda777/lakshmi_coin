// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./LakshmiZRC20.sol"; // Assuming LakshmiZRC20 is our $LUCK token

contract Airdrop is Ownable {
    LakshmiZRC20 public luckToken;
    bytes32 public currentMerkleRoot;
    uint256 public totalTokensForCurrentAirdrop;
    bool public isAirdropActive;

    // Mapping to track claimed status for the current airdrop
    // Note: If running multiple airdrops sequentially with this contract,
    // this mapping might need to be associated with a specific airdrop ID or be reset.
    // For V1, assuming one active airdrop campaign at a time, reset via new `createAirdrop` call.
    mapping(address => bool) public hasUserClaimed;

    uint256 public totalClaimedAmount; // Total tokens claimed in the current airdrop

    event AirdropCreated(bytes32 indexed merkleRoot, uint256 totalTokens, address indexed creator);
    event AirdropClaimed(address indexed user, uint256 amount);
    event AirdropEnded(address indexed endedBy, uint256 remainingTokensWithdrawn);
    event AirdropFundsDeposited(address indexed depositor, uint256 amount);

    constructor(address _luckTokenAddress) {
        require(_luckTokenAddress != address(0), "Airdrop: Invalid LUCK token address");
        luckToken = LakshmiZRC20(_luckTokenAddress);
        isAirdropActive = false;
    }

    /**
     * @dev Sets up a new airdrop campaign. Only owner can call this.
     * Any previous unclaimed tokens from an old airdrop should ideally be handled (e.g., withdrawn by owner)
     * before starting a new one if the contract is reused. This version implicitly ends the previous one.
     * The contract must be funded with `_totalTokens` LUCK tokens.
     */
    function createAirdrop(bytes32 _merkleRoot, uint256 _totalTokens) external onlyOwner {
        require(_merkleRoot != bytes32(0), "Airdrop: Merkle root cannot be zero");
        require(_totalTokens > 0, "Airdrop: Total tokens must be greater than zero");

        // Consider what happens to funds from a previous airdrop if not all claimed.
        // For simplicity, this function resets the state for a new airdrop.
        // A more robust system might have distinct airdrop campaign IDs.
        // Ensure contract has enough balance for this new airdrop
        require(luckToken.balanceOf(address(this)) >= _totalTokens, "Airdrop: Insufficient LUCK balance for this airdrop total");

        currentMerkleRoot = _merkleRoot;
        totalTokensForCurrentAirdrop = _totalTokens;
        isAirdropActive = true;
        totalClaimedAmount = 0;
        // Note: `hasUserClaimed` mapping is NOT reset here. This means a user who claimed in a previous
        // airdrop (if contract is reused with same user list) couldn't claim in this new one.
        // This is a design choice. If reset is needed, an explicit reset function or per-campaign tracking is required.
        // For V1, let's assume it's okay, or the list of users changes for new airdrops.
        // A better approach for multiple airdrops: add an airdropId and key claims by `mapping(uint256 => mapping(address => bool)) public hasClaimed`

        emit AirdropCreated(_merkleRoot, _totalTokens, msg.sender);
    }

    /**
     * @dev Allows an eligible user to claim their airdropped tokens.
     * User provides a Merkle proof and the amount they are eligible for.
     * The leaf for the Merkle proof should be keccak256(abi.encodePacked(userAddress, amount)).
     */
    function claimAirdrop(bytes32[] calldata _merkleProof, uint256 _amount) external {
        require(isAirdropActive, "Airdrop: No active airdrop campaign");
        require(!hasUserClaimed[msg.sender], "Airdrop: Tokens already claimed");
        require(_amount > 0, "Airdrop: Amount must be greater than zero");

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, _amount));
        bool isValidProof = MerkleProof.verify(_merkleProof, currentMerkleRoot, leaf);
        require(isValidProof, "Airdrop: Invalid Merkle proof or incorrect amount");

        require(totalTokensForCurrentAirdrop >= totalClaimedAmount + _amount, "Airdrop: Claim exceeds total airdrop pool (should not happen with valid proof if pool was funded correctly)");
        require(luckToken.balanceOf(address(this)) >= _amount, "Airdrop: Insufficient LUCK balance in contract for this claim");

        hasUserClaimed[msg.sender] = true;
        totalClaimedAmount += _amount;

        bool sent = luckToken.transfer(msg.sender, _amount);
        require(sent, "Airdrop: LUCK token transfer failed");

        emit AirdropClaimed(msg.sender, _amount);
    }

    /**
     * @dev Allows the owner to end the current airdrop campaign and withdraw remaining tokens.
     */
    function endAirdropAndWithdrawRemainingTokens() external onlyOwner {
        require(isAirdropActive, "Airdrop: No active airdrop to end");
        isAirdropActive = false; // Deactivate airdrop

        uint256 remainingTokens = luckToken.balanceOf(address(this));
        // This could also be: totalTokensForCurrentAirdrop - totalClaimedAmount,
        // but balanceOf(this) is safer if extra funds were somehow sent.
        // However, if the contract is used for other things, balanceOf(this) might be too much.
        // Let's refine: calculate remaining specifically from this airdrop allocation.
        // This assumes no other LUCK tokens are managed by this contract for other purposes.
        // If createAirdrop ensures balance >= _totalTokens, then this is fine.

        if (remainingTokens > 0) {
            bool sent = luckToken.transfer(owner(), remainingTokens);
            require(sent, "Airdrop: Failed to withdraw remaining LUCK tokens");
            emit AirdropEnded(msg.sender, remainingTokens);
        } else {
            emit AirdropEnded(msg.sender, 0);
        }
        // Resetting for a potential next airdrop (optional, depending on reuse strategy)
        currentMerkleRoot = bytes32(0);
        totalTokensForCurrentAirdrop = 0;
        // `hasUserClaimed` is not reset here, see comment in createAirdrop.
    }

    /**
     * @dev Allows owner to deposit LUCK tokens into this contract (e.g., to fund an airdrop).
     * This is an alternative or supplement to ensuring balance before createAirdrop.
     */
    function depositAirdropFunds(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Airdrop: Amount must be greater than 0");
        bool success = luckToken.transferFrom(msg.sender, address(this), _amount);
        require(success, "Airdrop: Token deposit failed");
        emit AirdropFundsDeposited(msg.sender, _amount);
    }


    // --- View Functions ---

    function hasClaimed(address _user) public view returns (bool) {
        return hasUserClaimed[_user];
    }

    function getAirdropDetails() public view returns (bytes32 merkleRoot, uint256 totalTokens, uint256 claimedTokens, bool isActive) {
        return (currentMerkleRoot, totalTokensForCurrentAirdrop, totalClaimedAmount, isAirdropActive);
    }
}
