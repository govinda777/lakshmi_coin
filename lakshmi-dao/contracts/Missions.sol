// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./LakshmiZRC20.sol"; // Assuming LakshmiZRC20 is our $LUCK token

contract Missions is Ownable {
    struct Mission {
        uint256 id;
        string name;
        string description;
        uint256 rewardAmount;
        bool isActive;
        // bool isCompleted; // Replaced by user-specific claim tracking
        address creator; // Could be admin/DAO
    }

    // $LUCK Token instance
    LakshmiZRC20 public luckToken;

    // Mapping from mission ID to Mission struct
    mapping(uint256 => Mission) public missions;
    // Array to store all mission IDs for easier iteration, if needed for getAllMissions
    uint256[] public missionIds;

    // Counter for generating unique mission IDs
    uint256 public missionCounter;

    // Mapping to track if a user has claimed a reward for a mission
    // missionId => userAddress => bool (true if claimed)
    mapping(uint256 => mapping(address => bool)) public hasClaimedReward;

    // Events
    event MissionCreated(
        uint256 id,
        string name,
        string description,
        uint256 rewardAmount,
        address indexed creator
    );
    event MissionCompleted(uint256 indexed missionId, address indexed user); // Simplified for now
    event RewardClaimed(uint256 indexed missionId, address indexed user, uint256 amount);
    event FundsDepositedToContract(address indexed sender, uint256 amount);

    modifier onlyAdmin() {
        require(owner() == msg.sender, "Missions: Caller is not the owner");
        _;
    }

    constructor(address _luckTokenAddress) {
        require(_luckTokenAddress != address(0), "Missions: Invalid LUCK token address");
        luckToken = LakshmiZRC20(_luckTokenAddress);
    }

    /**
     * @dev Allows the owner (admin/DAO) to create a new mission.
     * The contract must have enough LUCK tokens approved/deposited to cover rewards.
     */
    function createMission(
        string calldata _name,
        string calldata _description,
        uint256 _rewardAmount
    ) external onlyAdmin {
        require(bytes(_name).length > 0, "Missions: Name cannot be empty");
        require(_rewardAmount > 0, "Missions: Reward amount must be greater than 0");

        missionCounter++;
        uint256 newMissionId = missionCounter;

        missions[newMissionId] = Mission({
            id: newMissionId,
            name: _name,
            description: _description,
            rewardAmount: _rewardAmount,
            isActive: true,
            // isCompleted: false, // Initially not completed
            creator: msg.sender
        });
        missionIds.push(newMissionId);

        emit MissionCreated(newMissionId, _name, _description, _rewardAmount, msg.sender);
    }

    /**
     * @dev Allows a user to mark a mission as complete.
     * For V1, this is a direct call by a user to indicate they believe they've met requirements.
     * It does not directly gate `claimReward` but serves as an on-chain signal/event.
     * Actual reward eligibility is managed by `hasClaimedReward` and off-chain/frontend logic.
     */
    function completeMission(uint256 _missionId) external {
        Mission storage mission = missions[_missionId];
        require(mission.id != 0, "Missions: Mission does not exist");
        require(mission.isActive, "Missions: Mission is not active");

        // This function now primarily serves to emit an event.
        // User-specific completion state for reward claiming is handled by `hasClaimedReward` mapping.
        // No change to mission struct state here.
        emit MissionCompleted(_missionId, msg.sender);
    }

    /**
     * @dev Allows a user to claim rewards for a completed mission.
     * The contract must hold enough LUCK tokens.
     */
    function claimReward(uint256 _missionId) external {
        Mission storage mission = missions[_missionId];
        require(mission.id != 0, "Missions: Mission does not exist");
        require(mission.isActive, "Missions: Mission is not active");
        // require(mission.isCompleted, "Missions: Mission not marked as complete"); // If global completion is a step
        // For user-specific completion:
        // require(userMissionCompletions[_missionId][msg.sender], "Missions: You have not completed this mission");
        require(!hasClaimedReward[_missionId][msg.sender], "Missions: Reward already claimed");

        // Ensure the contract has enough balance (or has approval to spend owner's tokens)
        // This example assumes the contract itself holds the tokens for rewards.
        uint256 currentBalance = luckToken.balanceOf(address(this));
        require(currentBalance >= mission.rewardAmount, "Missions: Insufficient LUCK tokens in contract for reward");

        hasClaimedReward[_missionId][msg.sender] = true;
        bool sent = luckToken.transfer(msg.sender, mission.rewardAmount);
        require(sent, "Missions: Failed to transfer LUCK tokens");

        emit RewardClaimed(_missionId, msg.sender, mission.rewardAmount);
    }

    /**
     * @dev Returns details of a specific mission.
     */
    function getMission(uint256 _missionId)
        public
        view
        returns (
            uint256 id,
            string memory name,
            string memory description,
            uint256 rewardAmount,
            bool isActive,
            // bool isCompleted, // Removed global completion flag
            address creator
        )
    {
        Mission storage mission = missions[_missionId];
        require(mission.id != 0, "Missions: Mission does not exist");
        return (
            mission.id,
            mission.name,
            mission.description,
            mission.rewardAmount,
            mission.isActive,
            // mission.isCompleted,
            mission.creator
        );
    }

    /**
     * @dev Returns a list of all available (active) mission IDs.
     * Potentially could return full mission structs, but that can be gas-intensive.
     * Returning IDs and letting frontend fetch details one-by-one or in batches is common.
     */
    function getAllMissionIds() public view returns (uint256[] memory) {
        return missionIds;
    }

    /**
     * @dev Returns all missions. Potentially very gas intensive.
     * Prefer paginated retrieval or fetching by IDs from getAllMissionIds.
     */
    function getAllMissions() public view returns (Mission[] memory) {
        Mission[] memory allMissionsList = new Mission[](missionIds.length);
        for (uint i = 0; i < missionIds.length; i++) {
            allMissionsList[i] = missions[missionIds[i]];
        }
        return allMissionsList;
    }

    /**
     * @dev Allows the owner to deactivate or reactivate a mission.
     */
    function toggleMissionActiveStatus(uint256 _missionId) external onlyAdmin {
        Mission storage mission = missions[_missionId];
        require(mission.id != 0, "Missions: Mission does not exist");
        mission.isActive = !mission.isActive;
    }

    // Function to allow admin/DAO to deposit LUCK tokens into this contract for rewards
    function depositRewardTokens(uint256 _amount) external onlyAdmin {
        require(_amount > 0, "Missions: Amount must be greater than 0");
        // The admin must have approved this contract to spend their LUCK tokens
        // OR the admin sends LUCK tokens to this contract address directly and this function is just for record-keeping.
        // Assuming tokens are transferred to the contract first, then this function is called,
        // or this function facilitates the transferFrom.
        // For simplicity, let's assume the owner will call `luckToken.approve(address(this), amount)`
        // and then this function will call `transferFrom`.
        bool success = luckToken.transferFrom(msg.sender, address(this), _amount);
        require(success, "Missions: Token deposit failed");
        emit FundsDepositedToContract(msg.sender, _amount);
    }

    // Fallback function to receive ETH (if needed, though not directly used for LUCK rewards)
    receive() external payable {}
    fallback() external payable {}
}
