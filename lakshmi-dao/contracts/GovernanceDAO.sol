// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol"; // For sqrt if needed, or simple square
import "@openzeppelin/contracts/utils/Timers.sol"; // For block number based timing

// --- Interfaces ---
interface ILakshmiZRC20 {
    /**
     * @notice Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);
}

interface IDonationVault {
    /**
     * @notice Releases funds from the vault.
     * @param tokenAddress The address of the token to release (address(0) for ETH).
     * @param recipient The recipient of the funds.
     * @param amount The amount to release.
     */
    function releaseFunds(address tokenAddress, address payable recipient, uint256 amount) external;
}

/**
 * @title GovernanceDAO
 * @author Lakshmi DAO Contributors
 * @notice A DAO contract for governing proposals using LUCK (LakshmiZRC20) tokens with quadratic voting.
 * @dev Manages proposal creation, voting, execution, and parameter updates by the owner.
 */
contract GovernanceDAO is Ownable {
    using Timers for Timers.BlockNumber;

    // --- Events ---
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address[] targets,
        uint256[] values,
        string[] signatures, // More descriptive than raw calldatas for UI
        bytes[] calldatas,
        uint256 voteStartBlock,
        uint256 voteEndBlock,
        string description
    );
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        uint8 support, // 0=Against, 1=For, 2=Abstain
        uint256 numVotes,
        string reason // Optional reason
    );
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    event VotingParametersUpdated(
        uint256 votingDelay,
        uint256 votingPeriod,
        uint256 proposalThreshold,
        uint256 quorumVotes,
        uint256 thresholdPercentage
    );

    // --- State Variables ---
    ILakshmiZRC20 public immutable lakshmiToken;

    // Governance Parameters
    uint256 public votingDelay; // Blocks after proposal creation until voting starts
    uint256 public votingPeriod; // Blocks for how long voting lasts
    uint256 public proposalThreshold; // Minimum LUCK tokens required to create a proposal
    uint256 public quorumVotes; // Minimum total numVotes (sum of individual votes, not token-weighted for quorum)
    uint256 public thresholdPercentage; // e.g., 50 for >50% of non-abstain votes must be 'For'

    // Proposal Data
    struct Proposal {
        uint256 id;
        address proposer;
        address[] targets;
        uint256[] values;
        bytes[] calldatas;
        string description;
        Timers.BlockNumber voteEndBlock; // Stores both start and end via Timers.BlockNumber
        uint256 forVotes; // Sum of numVotes cast 'For'
        uint256 againstVotes; // Sum of numVotes cast 'Against'
        uint256 abstainVotes; // Sum of numVotes cast 'Abstain'
        bool executed;
        bool cancelled;
        mapping(address => VotedInfo) voters;
    }

    struct VotedInfo {
        bool hasVoted;
        uint8 support; // 0=Against, 1=For, 2=Abstain
        uint256 numVotes;
    }

    enum ProposalState {
        Pending, // Waiting for votingDelay
        Active, // Voting in progress
        Succeeded, // Voting ended, quorum and threshold met
        Defeated, // Voting ended, quorum or threshold not met
        Executed,
        Cancelled
    }

    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;

    // --- Constructor ---
    /**
     * @notice Initializes the DAO with governance parameters and the LUCK token.
     * @param _lakshmiTokenAddress The address of the LakshmiZRC20 (LUCK) token.
     * @param _votingDelay Blocks to wait after proposal creation before voting starts.
     * @param _votingPeriod Blocks for the duration of the voting period.
     * @param _proposalThreshold Minimum LUCK tokens required to create a proposal.
     * @param _quorumVotes Minimum sum of individual `numVotes` for a proposal to be eligible.
     * @param _thresholdPercentage Percentage of (For / (For + Against)) votes required to pass (e.g., 50 means >50%).
     * @param _initialOwner The initial owner of this DAO contract (e.g., a multisig).
     */
    constructor(
        address _lakshmiTokenAddress,
        uint256 _votingDelay,
        uint256 _votingPeriod,
        uint256 _proposalThreshold,
        uint256 _quorumVotes,
        uint256 _thresholdPercentage,
        address _initialOwner
    ) Ownable() {
        if (msg.sender != _initialOwner && _initialOwner != address(0)) {
             _transferOwnership(_initialOwner);
        }
        require(_lakshmiTokenAddress != address(0), "DAO: LUCK token is zero address");
        require(_votingPeriod > 0, "DAO: Voting period must be > 0");
        require(_thresholdPercentage <= 100, "DAO: Threshold percentage cannot exceed 100"); // Can be 0 if desired

        lakshmiToken = ILakshmiZRC20(_lakshmiTokenAddress);
        votingDelay = _votingDelay;
        votingPeriod = _votingPeriod;
        proposalThreshold = _proposalThreshold;
        quorumVotes = _quorumVotes;
        thresholdPercentage = _thresholdPercentage;

        emit VotingParametersUpdated(_votingDelay, _votingPeriod, _proposalThreshold, _quorumVotes, _thresholdPercentage);
    }

    // --- Proposal Management ---

    /**
     * @notice Creates a new proposal.
     * @param targets Array of target addresses for execution.
     * @param values Array of ETH values to send with each call.
     * @param calldatas Array of calldata for each function call.
     * @param description A human-readable description of the proposal.
     * @return proposalId The ID of the newly created proposal.
     * @dev Caller must hold at least `proposalThreshold` LUCK tokens.
     *      `signatures` array (e.g., "transfer(address,uint256)") can be passed instead of full calldatas for some use cases,
     *      but `calldatas` provides full flexibility. For this implementation, we use `calldatas`.
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) external returns (uint256 proposalId) {
        require(lakshmiToken.balanceOf(msg.sender) >= proposalThreshold, "DAO: Proposer below proposal threshold");
        require(targets.length == values.length && targets.length == calldatas.length, "DAO: Input array lengths mismatch");
        require(targets.length > 0, "DAO: Must provide at least one action");
        require(bytes(description).length > 0, "DAO: Description cannot be empty");

        proposalId = ++proposalCount;
        Proposal storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.targets = targets;
        newProposal.values = values;
        newProposal.calldatas = calldatas;
        newProposal.description = description;

        uint256 currentBlock = block.number;
        uint256 voteStart = currentBlock + votingDelay;
        uint256 voteEnd = voteStart + votingPeriod;
        newProposal.voteEndBlock.setDeadline(uint64(voteEnd)); // Stores the end block
        // To get start block, it would be voteEnd - votingPeriod. Or store it separately.
        // For simplicity, we'll use a helper `getProposalVoteStartBlock`.

        emit ProposalCreated(
            proposalId,
            msg.sender,
            targets,
            values,
            new string[](targets.length), // Placeholder for signatures if we were using them
            calldatas,
            voteStart,
            voteEnd,
            description
        );
        return proposalId;
    }

    // --- Voting ---

    /**
     * @notice Casts a vote on a proposal without providing a reason.
     * @param proposalId The ID of the proposal to vote on.
     * @param support The type of vote: 0 for Against, 1 for For, 2 for Abstain.
     * @param numVotes The number of votes to cast. Voter must hold at least `numVotes^2` LUCK tokens.
     */
    function castVote(uint256 proposalId, uint8 support, uint256 numVotes) external {
        castVoteWithReason(proposalId, support, numVotes, string(""));
    }

    /**
     * @notice Casts a vote on a proposal.
     * @param proposalId The ID of the proposal to vote on.
     * @param support The type of vote: 0 for Against, 1 for For, 2 for Abstain.
     * @param numVotes The number of votes to cast. Voter must hold at least `numVotes^2` LUCK tokens.
     * @param reason Optional string stating the reason for the vote.
     * @dev A user can only vote once per proposal. Voting power is based on current LUCK balance.
     */
    function castVoteWithReason(
        uint256 proposalId,
        uint8 support,
        uint256 numVotes,
        string memory reason // Optional: reason for voting
    ) public { // Changed to public so castVote can call it
        Proposal storage p = proposals[proposalId];
        require(state(proposalId) == ProposalState.Active, "DAO: Proposal not active for voting");
        require(!p.voters[msg.sender].hasVoted, "DAO: Voter already voted");
        require(support <= 2, "DAO: Invalid vote type"); // 0=Against, 1=For, 2=Abstain
        require(numVotes > 0, "DAO: Must cast at least one vote");

        uint256 requiredTokens = numVotes * numVotes; // Quadratic voting requirement
        require(lakshmiToken.balanceOf(msg.sender) >= requiredTokens, "DAO: Insufficient tokens for quadratic vote");

        p.voters[msg.sender] = VotedInfo({hasVoted: true, support: support, numVotes: numVotes});

        if (support == 0) { // Against
            p.againstVotes += numVotes;
        } else if (support == 1) { // For
            p.forVotes += numVotes;
        } else { // Abstain
            p.abstainVotes += numVotes;
        }

        emit VoteCast(msg.sender, proposalId, support, numVotes, reason);
    }

    // --- Execution & Cancellation ---

    /**
     * @notice Executes a succeeded proposal.
     * @param proposalId The ID of the proposal to execute.
     * @dev Proposal must be in `Succeeded` state. Executes all transactions defined in the proposal.
     */
    function execute(uint256 proposalId) external payable { // Payable if DAO needs to receive ETH during execution (e.g. from a refund)
        require(state(proposalId) == ProposalState.Succeeded, "DAO: Proposal not in succeeded state");
        Proposal storage p = proposals[proposalId];
        p.executed = true; // Mark as executed before external calls

        for (uint256 i = 0; i < p.targets.length; i++) {
            (bool success, bytes memory returnData) = p.targets[i].call{value: p.values[i]}(p.calldatas[i]);
            if (!success) {
                // Revert with the error from the external call if possible, or a generic error
                if (returnData.length > 0) {
                    // solhint-disable-next-line no-inline-assembly
                    assembly {
                        let returndata_size := mload(returnData)
                        revert(add(32, returnData), returndata_size)
                    }
                } else {
                    revert("DAO: Proposal execution reverted with no reason");
                }
            }
        }
        emit ProposalExecuted(proposalId);
    }

    /**
     * @notice Cancels a proposal.
     * @param proposalId The ID of the proposal to cancel.
     * @dev Can be called by the proposer if the proposal is `Pending` (before voting starts).
     *      Can also be called by the DAO owner at any time before execution if the proposal is not yet Succeeded/Defeated.
     */
    function cancel(uint256 proposalId) external {
        ProposalState currentState = state(proposalId);
        Proposal storage p = proposals[proposalId];

        bool canProposerCancel = (msg.sender == p.proposer && currentState == ProposalState.Pending);
        bool canOwnerCancel = (msg.sender == owner() &&
                               currentState != ProposalState.Executed &&
                               currentState != ProposalState.Succeeded && // Owner cannot cancel once passed
                               currentState != ProposalState.Defeated);  // Or defeated

        require(canProposerCancel || canOwnerCancel, "DAO: Not authorized or proposal not cancellable");
        require(!p.cancelled, "DAO: Proposal already cancelled");

        p.cancelled = true;
        emit ProposalCancelled(proposalId);
    }


    // --- State & View Functions ---

    /**
     * @notice Gets the current state of a proposal.
     * @param proposalId The ID of the proposal.
     * @return The current `ProposalState`.
     */
    function state(uint256 proposalId) public view returns (ProposalState) {
        require(proposalId > 0 && proposalId <= proposalCount, "DAO: Invalid proposal ID");
        Proposal storage p = proposals[proposalId];

        if (p.cancelled) {
            return ProposalState.Cancelled;
        } else if (p.executed) {
            return ProposalState.Executed;
        }

        uint256 currentBlock = block.number;
        uint256 voteStartBlock = getProposalVoteStartBlock(proposalId);

        if (currentBlock < voteStartBlock) {
            return ProposalState.Pending;
        } else if (!p.voteEndBlock.isExpired()) { // voteEndBlock stores the deadline
            return ProposalState.Active;
        } else { // Voting has ended
            uint256 totalVotesCast = p.forVotes + p.againstVotes + p.abstainVotes;
            if (totalVotesCast < quorumVotes) {
                return ProposalState.Defeated; // Quorum not met
            }

            uint256 nonAbstainVotes = p.forVotes + p.againstVotes;
            if (nonAbstainVotes == 0) { // Only abstains or no for/against votes
                return ProposalState.Defeated; // Or Succeeded if all abstain means pass by policy (not here)
            }
            // Check if For votes are strictly greater than thresholdPercentage of non-abstain votes
            // e.g., if thresholdPercentage = 50, forVotes must be > 50% of (forVotes + againstVotes)
            // forVotes * 100 > (forVotes + againstVotes) * thresholdPercentage
            if (p.forVotes * 100 > nonAbstainVotes * thresholdPercentage) {
                return ProposalState.Succeeded;
            } else {
                return ProposalState.Defeated;
            }
        }
    }

    /**
     * @notice Gets the block number when voting for a proposal starts.
     * @param proposalId The ID of the proposal.
     * @return The block number for vote start.
     */
    function getProposalVoteStartBlock(uint256 proposalId) public view returns (uint256) {
        require(proposalId > 0 && proposalId <= proposalCount, "DAO: Invalid proposal ID");
        Proposal storage p = proposals[proposalId];
        // voteEndBlock stores the deadline (end block). Start block is end - duration.
        return p.voteEndBlock.getDeadline() - votingPeriod;
    }

    /**
     * @notice Gets the block number when voting for a proposal ends (deadline).
     * @param proposalId The ID of the proposal.
     * @return The block number for vote end.
     */
    function getProposalVoteEndBlock(uint256 proposalId) public view returns (uint256) {
        require(proposalId > 0 && proposalId <= proposalCount, "DAO: Invalid proposal ID");
        return proposals[proposalId].voteEndBlock.getDeadline();
    }

    /**
     * @notice Gets the details of a vote cast by a specific voter on a proposal.
     * @param proposalId The ID of the proposal.
     * @param voter The address of the voter.
     * @return hasVoted True if the voter has voted.
     * @return support The type of vote (0=Against, 1=For, 2=Abstain).
     * @return numVotes The number of votes cast by the voter.
     */
    function getVote(uint256 proposalId, address voter)
        external
        view
        returns (bool hasVoted, uint8 support, uint256 numVotes)
    {
        require(proposalId > 0 && proposalId <= proposalCount, "DAO: Invalid proposal ID");
        VotedInfo storage votedInfoRecord = proposals[proposalId].voters[voter];
        return (votedInfoRecord.hasVoted, votedInfoRecord.support, votedInfoRecord.numVotes);
    }


    // --- Administrative Functions ---

    /**
     * @notice Updates the governance parameters.
     * @dev Only callable by the contract owner.
     * @param _newVotingDelay New voting delay in blocks.
     * @param _newVotingPeriod New voting period in blocks.
     * @param _newProposalThreshold New minimum LUCK tokens to propose.
     * @param _newQuorumVotes New minimum sum of `numVotes` for quorum.
     * @param _newThresholdPercentage New threshold percentage for proposal success.
     */
    function updateVotingParameters(
        uint256 _newVotingDelay,
        uint256 _newVotingPeriod,
        uint256 _newProposalThreshold,
        uint256 _newQuorumVotes,
        uint256 _newThresholdPercentage
    ) external onlyOwner {
        require(_newVotingPeriod > 0, "DAO: Voting period must be > 0");
        require(_newThresholdPercentage <= 100, "DAO: Threshold percentage cannot exceed 100");

        votingDelay = _newVotingDelay;
        votingPeriod = _newVotingPeriod;
        proposalThreshold = _newProposalThreshold;
        quorumVotes = _newQuorumVotes;
        thresholdPercentage = _newThresholdPercentage;

        emit VotingParametersUpdated(votingDelay, votingPeriod, proposalThreshold, quorumVotes, thresholdPercentage);
    }

    // Fallback to receive ETH, e.g., from proposal executions that send ETH to the DAO
    receive() external payable {}
}
