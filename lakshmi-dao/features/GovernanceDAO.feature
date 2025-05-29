Feature: GovernanceDAO Functionality

  Background:
    Given a deployed LakshmiZRC20 contract with an initial supply of "1000000" LAK
    And a deployed DonationVault contract linked to the LakshmiZRC20 token
    And a GovernanceDAO contract deployed with the LakshmiZRC20 token, voting period "3" days, quorum "10" percent, approval "60" percent
    And the GovernanceDAO is linked to the DonationVault
    And "Proposer1" has "10000" LAK tokens # 1% of total supply
    And "VoterA" has "200000" LAK tokens   # 20%
    And "VoterB" has "150000" LAK tokens   # 15%
    And "VoterC" has "50000" LAK tokens    # 5%
    And "NonTokenHolder" has "0" LAK tokens

  Scenario: Deployment Verification
    Then the GovernanceDAO's Lakshmi token should be the deployed LakshmiZRC20 token
    And the GovernanceDAO's voting period should be "3" days
    And the GovernanceDAO's quorum percentage should be "10"
    And the GovernanceDAO's approval threshold percentage should be "60"
    And the GovernanceDAO's owner should be the deployer

  Scenario: Proposal Creation - Successful
    When "Proposer1" creates a proposal to release "1" ETH from DonationVault to "Recipient" with description "Fund Project X"
    Then proposal "1" should exist in GovernanceDAO
    And proposal "1" should have been proposed by "Proposer1"
    And proposal "1" description should be "Fund Project X"
    And proposal "1" target should be the DonationVault address
    And proposal "1" state should be "Active"
    And an event "ProposalCreated" should have been emitted by GovernanceDAO for proposal "1"

  Scenario: Proposal Creation - By Non-Token Holder
    When "NonTokenHolder" attempts to create a proposal to release "0.5" ETH from DonationVault to "Recipient"
    Then the proposal creation attempt should fail with message "GovernanceDAO: Caller is not a token holder"

  Scenario: Proposal Creation - Empty Description
    When "Proposer1" attempts to create a proposal with an empty description
    Then the proposal creation attempt should fail with message "Description cannot be empty"

  Scenario: Voting - Successful For, Against, Abstain
    Given "Proposer1" creates proposal "1" to release "1" ETH to "Recipient"
    When "VoterA" votes "For" on proposal "1"
    Then "VoterA" should have voted "For" on proposal "1"
    And proposal "1" should have "200000" For votes
    And an event "Voted" should have been emitted by GovernanceDAO for proposal "1" by "VoterA" with vote type "For"

    When "VoterB" votes "Against" on proposal "1"
    Then "VoterB" should have voted "Against" on proposal "1"
    And proposal "1" should have "150000" Against votes

    When "VoterC" votes "Abstain" on proposal "1"
    Then "VoterC" should have voted "Abstain" on proposal "1"
    And proposal "1" should have "50000" Abstain votes

  Scenario: Voting - By Non-Token Holder
    Given "Proposer1" creates proposal "1" to release "1" ETH to "Recipient"
    When "NonTokenHolder" attempts to vote "For" on proposal "1"
    Then the voting attempt should fail with message "GovernanceDAO: No voting power"

  Scenario: Voting - Multiple Votes by Same Holder
    Given "Proposer1" creates proposal "1" to release "1" ETH to "Recipient"
    And "VoterA" votes "For" on proposal "1"
    When "VoterA" attempts to vote "Against" on proposal "1"
    Then the voting attempt should fail with message "GovernanceDAO: Already voted on this proposal"

  Scenario: Voting - After Voting Period Ends
    Given "Proposer1" creates proposal "1" to release "1" ETH to "Recipient"
    And the voting period of "3" days for proposal "1" elapses
    When "VoterA" attempts to vote "For" on proposal "1"
    Then the voting attempt should fail with message "GovernanceDAO: Voting period has ended"

  Scenario: Proposal State Transition - Active to Succeeded (Quorum Met, Approved)
    # Total Supply: 1,000,000 LAK. Quorum: 10% (100,000 LAK). Approval: 60%.
    # VoterA (200k For) + VoterB (150k For) = 350k For. VoterC (50k Against) = 50k Against.
    # Total votes for quorum: 350k + 50k = 400k (40% > 10% Quorum Met)
    # Approval: 350k / (350k + 50k) = 350k / 400k = 87.5% (> 60% Approved)
    Given "Proposer1" creates proposal "1" to release "1" ETH to "Recipient"
    And "VoterA" votes "For" on proposal "1"
    And "VoterB" votes "For" on proposal "1"
    And "VoterC" votes "Against" on proposal "1"
    And the voting period of "3" days for proposal "1" elapses
    When anyone updates the state of proposal "1"
    Then proposal "1" state should be "Succeeded"
    And an event "ProposalStateChanged" should have been emitted for proposal "1" with state "Succeeded"

  Scenario: Proposal State Transition - Active to Defeated (Quorum Not Met)
    # VoterC (50k For). Total votes: 50k (5% < 10% Quorum Not Met)
    Given "Proposer1" creates proposal "1" to release "1" ETH to "Recipient"
    And "VoterC" votes "For" on proposal "1"
    And the voting period of "3" days for proposal "1" elapses
    When anyone updates the state of proposal "1"
    Then proposal "1" state should be "Defeated"
    And an event "ProposalStateChanged" should have been emitted for proposal "1" with state "Defeated"

  Scenario: Proposal State Transition - Active to Defeated (Quorum Met, Not Approved)
    # VoterA (200k For). VoterB (150k Against), VoterC (50k Against) -> 200k Against
    # Total votes for quorum: 200k + 200k = 400k (40% > 10% Quorum Met)
    # Approval: 200k / (200k + 200k) = 200k / 400k = 50% (< 60% Not Approved)
    Given "Proposer1" creates proposal "1" to release "1" ETH to "Recipient"
    And "VoterA" votes "For" on proposal "1"
    And "VoterB" votes "Against" on proposal "1"
    And "VoterC" votes "Against" on proposal "1"
    And the voting period of "3" days for proposal "1" elapses
    When anyone updates the state of proposal "1"
    Then proposal "1" state should be "Defeated"

  Scenario: Proposal Execution - Successful
    Given proposal "1" is "Succeeded" to release "1" ETH to "Recipient" from DonationVault
    And the DonationVault has "5" ETH
    When "Proposer1" executes proposal "1"
    Then proposal "1" state should be "Executed"
    And an event "ProposalExecuted" should have been emitted by GovernanceDAO for proposal "1"
    And an event "ProposalStateChanged" should have been emitted for proposal "1" with state "Executed"
    And "Recipient" ETH balance should have increased by approximately "1" ETH
    And the DonationVault ETH balance should be "4" ETH

  Scenario: Proposal Execution - Attempt on Non-Succeeded Proposal (Active)
    Given "Proposer1" creates proposal "1" to release "1" ETH to "Recipient" (it's Active)
    When "Proposer1" attempts to execute proposal "1"
    Then the proposal execution attempt should fail with message "GovernanceDAO: Proposal not in succeeded state"

  Scenario: Proposal Execution - Attempt on Non-Succeeded Proposal (Defeated)
    Given proposal "1" is "Defeated"
    When "Proposer1" attempts to execute proposal "1"
    Then the proposal execution attempt should fail with message "GovernanceDAO: Proposal not in succeeded state"

  Scenario: Proposal Execution - Target Contract Call Fails
    Given proposal "1" is "Succeeded" to release "10" ETH to "Recipient" from DonationVault
    And the DonationVault has only "1" ETH # Not enough ETH
    When "Proposer1" attempts to execute proposal "1"
    Then the proposal execution attempt should fail # Specific error from DonationVault or DAO's wrapper error
    # e.g., "Proposal execution failed" or "DonationVault: Insufficient ETH balance"
    And proposal "1" state should still be "Succeeded" # Execution failed, not marked as Executed

  Scenario: Proposal Cancellation - By Proposer (Active Proposal)
    Given "Proposer1" creates proposal "1" to release "1" ETH to "Recipient"
    When "Proposer1" cancels proposal "1"
    Then proposal "1" state should be "Canceled"
    And an event "ProposalStateChanged" should have been emitted for proposal "1" with state "Canceled"

  Scenario: Proposal Cancellation - By Owner (Active Proposal)
    Given "Proposer1" creates proposal "1" to release "1" ETH to "Recipient"
    When the deployer (owner) cancels proposal "1"
    Then proposal "1" state should be "Canceled"

  Scenario: Proposal Cancellation - Attempt by Non-Proposer/Non-Owner
    Given "Proposer1" creates proposal "1" to release "1" ETH to "Recipient"
    When "VoterA" attempts to cancel proposal "1"
    Then the proposal cancellation attempt should fail with message "GovernanceDAO: Only proposer or owner can cancel"

  Scenario: Proposal Cancellation - Attempt on Succeeded Proposal
    Given proposal "1" is "Succeeded"
    When "Proposer1" attempts to cancel proposal "1"
    Then the proposal cancellation attempt should fail with message "GovernanceDAO: Proposal cannot be canceled in its current state"

  Scenario: Admin Functions - Set Voting Period by Owner
    When the deployer (owner) sets the GovernanceDAO voting period to "5" days
    Then the GovernanceDAO's voting period should be "5" days
    And an event "VotingPeriodSet" should have been emitted with "5" days

  Scenario: Admin Functions - Set Voting Period by Non-Owner
    When "Proposer1" attempts to set the GovernanceDAO voting period to "7" days
    Then the set voting period attempt should fail with message "Ownable: caller is not the owner"
    And the GovernanceDAO's voting period should still be "3" days

  Scenario: Admin Functions - Set Quorum Percentage by Owner
    When the deployer (owner) sets the GovernanceDAO quorum percentage to "20"
    Then the GovernanceDAO's quorum percentage should be "20"
    And an event "QuorumPercentageSet" should have been emitted with "20"

  Scenario: Admin Functions - Set Approval Threshold by Owner
    When the deployer (owner) sets the GovernanceDAO approval threshold to "75"
    Then the GovernanceDAO's approval threshold percentage should be "75"
    And an event "ApprovalThresholdSet" should have been emitted with "75"

  Scenario: Update Proposal State - Before Voting Period Ends
    Given "Proposer1" creates proposal "1" to release "1" ETH to "Recipient"
    When anyone attempts to update the state of proposal "1"
    Then the update proposal state attempt should fail with message "Voting period not yet ended"

  Scenario: Update Proposal State - For Non-Active Proposal
    Given proposal "1" is "Succeeded"
    When anyone attempts to update the state of proposal "1"
    Then the update proposal state attempt should fail with message "Proposal not active for state update"
