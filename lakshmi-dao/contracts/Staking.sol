// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol"; // For security on stake/unstake/claim
import "./LakshmiZRC20.sol"; // Assuming LakshmiZRC20 is our $LUCK token

contract Staking is Ownable, ReentrancyGuard {
    LakshmiZRC20 public luckToken;

    struct StakeInfo {
        uint256 amount;
        uint256 sinceTimestamp; // Timestamp when user last staked or claimed rewards
        uint256 accruedReward; // Rewards accrued but not yet claimed (updated at interaction)
    }

    mapping(address => StakeInfo) public stakers;
    uint256 public totalStakedAmount;

    // Example: 10% APY. Rate = 0.1 / (365 * 24 * 60 * 60) per token per second
    // To avoid floating point, we can define reward rate for a larger unit of token, e.g., per 1 full LUCK token.
    // Let's say rewardRate is X units of LUCK per 1 LUCK staked, per second.
    // To represent 10% APY: 0.1 * 1e18 (assuming LUCK is 18 decimals) / (seconds in year)
    // RewardRate = (APY_PERCENT * 1e18 * 1e18) / (SECONDS_IN_YEAR * 100 * PRECISION_FACTOR_FOR_RATE)
    // For simplicity, let's set a rate like: if you stake 100 LUCK, you get X LUCK per second.
    // rewardRatePerTokenPerSecond: (e.g., 10% APY for 1 LUCK (1e18))
    // (0.1 * 1e18) / (365 * 24 * 60 * 60) = 3170979198376 LUCK wei per second per 1 LUCK staked
    // This value should be scaled if LUCK has fewer decimals.
    // Let's use a simpler rewardRate for now: if you stake 1 LUCK, you get `rewardRate` wei of LUCK per second.
    // Owner can set this. e.g., if rewardRate is 100, staking 1 LUCK (1e18) gets 100 wei/sec.
    uint256 public rewardRatePerSecond; // This is amount of LUCK wei earned per 1 LUCK (1e18) staked, per second.

    uint256 public constant REWARD_PRECISION = 1e18; // To handle decimal rates for rewards

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount, uint256 rewardPaid);
    event RewardClaimed(address indexed user, uint256 rewardAmount);
    event RewardRateChanged(uint256 newRate, address indexed changer);
    event FundsDepositedToContract(address indexed sender, uint256 amount);


    constructor(address _luckTokenAddress) {
        require(_luckTokenAddress != address(0), "Staking: Invalid LUCK token address");
        luckToken = LakshmiZRC20(_luckTokenAddress);
        // Initialize rewardRate to a default value, e.g., representing ~10% APY
        // 0.1 LUCK per year per LUCK staked.
        // (0.1 * REWARD_PRECISION) / (365 days * 24 hours * 60 mins * 60 secs)
        // rewardRatePerSecond = (1 * REWARD_PRECISION / 10) / (365 * 24 * 60 * 60); // Approx 10% APY
        // Example: For 1 LUCK (1e18) staked, earn 0.00000000317 LUCK (3170000000 wei) per second for 10% APY
        rewardRatePerSecond = 3170000000; // Owner should set this properly
    }

    // --- Admin Functions ---
    function setRewardRate(uint256 _newRatePerSecond) external onlyOwner {
        // Consider updating all pending rewards before changing rate, or accept minor drift
        // For simplicity, we won't iterate all stakers here.
        rewardRatePerSecond = _newRatePerSecond;
        emit RewardRateChanged(_newRatePerSecond, msg.sender);
    }

    // Function to allow admin/DAO to deposit LUCK tokens into this contract for rewards
    // This contract must hold the LUCK tokens it will pay out as rewards.
    function depositRewardFunds(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Staking: Amount must be greater than 0");
        bool success = luckToken.transferFrom(msg.sender, address(this), _amount);
        require(success, "Staking: Token deposit failed");
        emit FundsDepositedToContract(msg.sender, _amount);
    }

    // --- Core Staking Logic ---

    /**
     * @dev Calculates reward for a staker based on their stake amount and duration.
     * This is a view function and does not change state.
     */
    function calculateReward(address _stakerAddress) public view returns (uint256) {
        StakeInfo storage stake = stakers[_stakerAddress];
        if (stake.amount == 0) {
            return stake.accruedReward; // Return any previously accrued but not yet updated reward
        }

        uint256 timeElapsed = block.timestamp - stake.sinceTimestamp;
        // Reward = amount * timeElapsed * rate / precision
        // (stake.amount * timeElapsed * rewardRatePerSecond) could overflow easily.
        // So, (stake.amount / REWARD_PRECISION) * timeElapsed * rewardRatePerSecond
        // Or, (timeElapsed * rewardRatePerSecond * stake.amount) / REWARD_PRECISION
        uint256 newRewards = (stake.amount * timeElapsed * rewardRatePerSecond) / REWARD_PRECISION;
        return stake.accruedReward + newRewards;
    }

    /**
     * @dev Internal function to update accrued rewards for a staker.
     * This should be called before any action that changes stake amount or claims rewards.
     */
    function _updateAccruedReward(address _stakerAddress) internal {
        StakeInfo storage stake = stakers[_stakerAddress];
        if (stake.amount > 0) { // Only calculate if currently staking
             uint256 timeElapsed = block.timestamp - stake.sinceTimestamp;
             if (timeElapsed > 0) {
                uint256 newRewards = (stake.amount * timeElapsed * rewardRatePerSecond) / REWARD_PRECISION;
                stake.accruedReward += newRewards;
             }
        }
        // Always update the timestamp to current block time for next calculation period
        stake.sinceTimestamp = block.timestamp;
    }


    function stake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Staking: Cannot stake 0 tokens");

        _updateAccruedReward(msg.sender); // Update rewards before changing stake

        StakeInfo storage stake = stakers[msg.sender];

        bool success = luckToken.transferFrom(msg.sender, address(this), _amount);
        require(success, "Staking: LUCK token transfer failed");

        stake.amount += _amount;
        totalStakedAmount += _amount;
        // stake.sinceTimestamp is updated by _updateAccruedReward

        emit Staked(msg.sender, _amount);
    }

    /**
     * @dev Unstakes tokens and pays out any pending rewards.
     */
    function unstake(uint256 _amount) external nonReentrant {
        StakeInfo storage stake = stakers[msg.sender];
        require(_amount > 0, "Staking: Cannot unstake 0 tokens");
        require(stake.amount >= _amount, "Staking: Insufficient staked amount");

        _updateAccruedReward(msg.sender); // Calculate and store rewards up to this point

        uint256 rewardToPay = stake.accruedReward;
        stake.accruedReward = 0; // Reset accrued reward after calculation

        stake.amount -= _amount;
        totalStakedAmount -= _amount;
        // stake.sinceTimestamp is updated by _updateAccruedReward

        // Transfer staked tokens back
        bool sentStaked = luckToken.transfer(msg.sender, _amount);
        require(sentStaked, "Staking: Failed to transfer staked LUCK tokens back");

        // Pay rewards
        if (rewardToPay > 0) {
            require(luckToken.balanceOf(address(this)) >= rewardToPay, "Staking: Contract has insufficient LUCK for rewards");
            bool sentReward = luckToken.transfer(msg.sender, rewardToPay);
            require(sentReward, "Staking: Failed to transfer LUCK rewards");
        }

        // If stake.amount becomes 0, we could clear sinceTimestamp, but _updateAccruedReward handles it.
        // If stake.amount is 0, future calls to _updateAccruedReward won't add new rewards until next stake.

        emit Unstaked(msg.sender, _amount, rewardToPay);
    }

    /**
     * @dev Claims all pending rewards for the staker.
     */
    function claimReward() external nonReentrant {
        _updateAccruedReward(msg.sender); // Calculate and store rewards up to this point

        StakeInfo storage stake = stakers[msg.sender];
        uint256 rewardToClaim = stake.accruedReward;
        require(rewardToClaim > 0, "Staking: No rewards to claim");

        stake.accruedReward = 0; // Reset after claiming
        // stake.sinceTimestamp is updated by _updateAccruedReward

        require(luckToken.balanceOf(address(this)) >= rewardToClaim, "Staking: Contract has insufficient LUCK for rewards");
        bool sentReward = luckToken.transfer(msg.sender, rewardToClaim);
        require(sentReward, "Staking: Failed to transfer LUCK rewards");

        emit RewardClaimed(msg.sender, rewardToClaim);
    }

    // --- View Functions ---

    function getStakeInfo(address _stakerAddress) public view returns (uint256 currentStake, uint256 currentReward, uint256 lastUpdateTime) {
        StakeInfo storage stake = stakers[_stakerAddress];
        uint256 pendingReward = calculateReward(_stakerAddress); // This includes stake.accruedReward + new since last interaction
        return (stake.amount, pendingReward, stake.sinceTimestamp);
    }

    function totalStaked() public view returns (uint256) {
        return totalStakedAmount;
    }
}
