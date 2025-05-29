Feature: DAO Integration - End-to-End Donation and Proposal Lifecycle

  Background:
    Given a deployed LakshmiZRC20 contract with an initial supply of "1000000" LAK
    And a GovernanceDAO contract deployed with the LakshmiZRC20 token, voting period "3" days, quorum "10" percent, approval "60" percent
    And a DonationVault contract deployed and linked to the LakshmiZRC20 token and the GovernanceDAO
    And "Alice" has "300000" LAK tokens # 30%
    And "Bob" has "200000" LAK tokens   # 20%
    And "Charlie" (beneficiary) has "0" LAK tokens
    And "Dave" (another voter) has "100000" LAK tokens # 10%

  Scenario: Full Donation and Proposal Lifecycle (ETH)
    When "Alice" donates "5" ETH to the DonationVault
    Then the DonationVault ETH balance should be "5" ETH
    When "Bob" creates proposal "1" in GovernanceDAO to release "2" ETH from DonationVault to "Charlie" with description "Fund Charlie's ETH project"
    Then proposal "1" in GovernanceDAO should be "Active"
    When "Alice" votes "For" on GovernanceDAO proposal "1"
    And "Bob" votes "For" on GovernanceDAO proposal "1"
    And the voting period of "3" days for GovernanceDAO proposal "1" elapses
    And anyone updates the state of GovernanceDAO proposal "1"
    Then proposal "1" in GovernanceDAO should be "Succeeded"
    When anyone executes GovernanceDAO proposal "1"
    Then "Charlie" ETH balance should have increased by approximately "2" ETH
    And the DonationVault ETH balance should be "3" ETH
    And proposal "1" in GovernanceDAO should be "Executed"

  Scenario: Full Donation and Proposal Lifecycle (LAK Tokens)
    Given "Alice" approves the DonationVault to spend "500" LAK tokens
    When "Alice" donates "500" LAK tokens to the DonationVault
    Then the DonationVault LAK token balance should be "500" LAK tokens
    And "Alice" LAK token balance should be "299500" LAK tokens
    When "Bob" creates proposal "2" in GovernanceDAO to release "200" LAK tokens from DonationVault to "Charlie" with description "Fund Charlie's LAK project"
    Then proposal "2" in GovernanceDAO should be "Active"
    When "Alice" votes "For" on GovernanceDAO proposal "2"
    And "Bob" votes "For" on GovernanceDAO proposal "2"
    And the voting period of "3" days for GovernanceDAO proposal "2" elapses
    And anyone updates the state of GovernanceDAO proposal "2"
    Then proposal "2" in GovernanceDAO should be "Succeeded"
    When anyone executes GovernanceDAO proposal "2"
    Then "Charlie" LAK token balance should be "200" LAK tokens
    And the DonationVault LAK token balance should be "300" LAK tokens
    And proposal "2" in GovernanceDAO should be "Executed"

  Scenario: Proposal Fails (Against Votes) and Funds Remain in Vault (ETH)
    When "Alice" donates "5" ETH to the DonationVault
    Then the DonationVault ETH balance should be "5" ETH
    When "Bob" creates proposal "3" in GovernanceDAO to release "2" ETH from DonationVault to "Charlie" with description "Risky ETH project"
    Then proposal "3" in GovernanceDAO should be "Active"
    # Alice (300k) votes For, Bob (200k) votes For = 500k For
    # Dave (100k) votes Against
    # Total Supply: 1M LAK. Quorum: 10% (100k). Approval Threshold: 60%.
    # Votes: Alice (300k For), Dave (100k Against)
    # Total participating for quorum: 300k + 100k = 400k (40% > 10% Quorum Met)
    # Approval: 300k / (300k + 100k) = 300k / 400k = 75% ( > 60% Approved) --> This would succeed.
    # Let's make it fail: Alice (300k FOR), Bob (200k AGAINST), Dave (100k AGAINST)
    # Total FOR: 300k. Total AGAINST: 200k + 100k = 300k.
    # Quorum: 300k + 300k = 600k (60% > 10% Quorum Met)
    # Approval: 300k / (300k + 300k) = 300k / 600k = 50% (< 60% Not Approved -> Defeated)
    When "Alice" votes "For" on GovernanceDAO proposal "3"
    And "Bob" votes "Against" on GovernanceDAO proposal "3"
    And "Dave" votes "Against" on GovernanceDAO proposal "3"
    And the voting period of "3" days for GovernanceDAO proposal "3" elapses
    And anyone updates the state of GovernanceDAO proposal "3"
    Then proposal "3" in GovernanceDAO should be "Defeated"
    And the DonationVault ETH balance should still be "5" ETH
    When anyone attempts to execute GovernanceDAO proposal "3"
    Then the GovernanceDAO proposal execution attempt should fail with message "Proposal not in succeeded state"
    And "Charlie" ETH balance should not have increased significantly
    And the DonationVault ETH balance should still be "5" ETH

  Scenario: Proposal Fails (Quorum Not Met) and Funds Remain in Vault (ETH)
    When "Alice" donates "5" ETH to the DonationVault
    Then the DonationVault ETH balance should be "5" ETH
    When "Bob" creates proposal "4" in GovernanceDAO to release "2" ETH from DonationVault to "Charlie" with description "Low turnout ETH project"
    Then proposal "4" in GovernanceDAO should be "Active"
    # Only Dave (100k LAK = 10% of total supply) votes For.
    # Quorum: 10%. Total votes cast must be > total supply * quorum / 100.
    # If only Dave votes, total votes = 100k. This meets 10% quorum exactly.
    # The contract uses `proposal.forVotes + proposal.againstVotes >= requiredQuorum`
    # Let's have Dave vote For, and no one else.
    # This meets quorum if requiredQuorum is inclusive. The contract is `votes > requiredQuorum`.
    # To be safe, let's make it clearly not meet quorum.
    # Let's say only "Eve" with 50k LAK (5%) votes.
    Given "Eve" has "50000" LAK tokens # 5%
    When "Eve" votes "For" on GovernanceDAO proposal "4"
    And the voting period of "3" days for GovernanceDAO proposal "4" elapses
    And anyone updates the state of GovernanceDAO proposal "4"
    Then proposal "4" in GovernanceDAO should be "Defeated" # Due to quorum not met
    And the DonationVault ETH balance should still be "5" ETH
    When anyone attempts to execute GovernanceDAO proposal "4"
    Then the GovernanceDAO proposal execution attempt should fail with message "Proposal not in succeeded state"
    And "Charlie" ETH balance should not have increased significantly
    And the DonationVault ETH balance should still be "5" ETH
