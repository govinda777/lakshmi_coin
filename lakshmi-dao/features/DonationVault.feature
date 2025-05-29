Feature: DonationVault Functionality

  Background:
    Given a deployed LakshmiZRC20 contract with an initial supply of "1000000" tokens
    And "Alice" (donor) has "1000" LAK tokens
    And a deployed mock GovernanceDAO contract as "mockDAO"
    And a deployed DonationVault contract linked to the LakshmiZRC20 token and "mockDAO"

  Scenario: Deployment Verification
    Then the DonationVault's Lakshmi token should be the deployed LakshmiZRC20 token
    And the DonationVault's governance DAO should be "mockDAO"
    And the DonationVault owner should be the deployer

  Scenario: Ether Donation - Successful
    When "Alice" donates "1.5" ETH to the DonationVault
    Then the DonationVault ETH balance should be "1.5" ETH
    And "Alice" should have an ETH donation total of "1.5" ETH in the DonationVault
    And an "EtherDonated" event should have been emitted by the DonationVault with donor "Alice" and amount "1.5" ETH

  Scenario: Ether Donation - Zero Amount
    When "Alice" attempts to donate "0" ETH to the DonationVault via donateEther
    Then the ETH donation attempt should fail with message "DonationVault: Must send ETH"

  Scenario: ERC20 (LAK) Token Donation - Successful
    Given "Alice" approves the DonationVault to spend "500" LAK tokens
    When "Alice" donates "300" LAK tokens to the DonationVault
    Then the DonationVault LAK token balance should be "300" LAK tokens
    And "Alice" should have a LAK token donation total of "300" LAK tokens in the DonationVault
    And an "ERC20Donated" event should have been emitted by the DonationVault with donor "Alice", the LAK token address, and amount "300" LAK tokens

  Scenario: ERC20 (LAK) Token Donation - Zero Amount
    Given "Alice" approves the DonationVault to spend "10" LAK tokens
    When "Alice" attempts to donate "0" LAK tokens to the DonationVault
    Then the LAK donation attempt should fail with message "DonationVault: Must donate a positive amount"

  Scenario: ERC20 (LAK) Token Donation - Insufficient Allowance
    Given "Alice" approves the DonationVault to spend "50" LAK tokens
    When "Alice" attempts to donate "100" LAK tokens to the DonationVault
    Then the LAK donation attempt should fail with message "ERC20: insufficient allowance" # Or a more specific ZRC20 error

  Scenario: Fund Release (ETH) - Successful by Governance DAO
    Given "Alice" donates "2" ETH to the DonationVault
    And proposal "1" is approved in "mockDAO"
    When "mockDAO" releases "1" ETH from the DonationVault to "Bob" for proposal "1"
    Then "Bob" ETH balance should have increased by approximately "1" ETH
    And the DonationVault ETH balance should be "1" ETH
    And a "FundsReleased" event should have been emitted by the DonationVault with recipient "Bob" and amount "1" ETH

  Scenario: Fund Release (LAK) - Successful by Governance DAO
    Given "Alice" approves the DonationVault to spend "500" LAK tokens
    And "Alice" donates "500" LAK tokens to the DonationVault
    And proposal "2" is approved in "mockDAO"
    When "mockDAO" releases "200" LAK tokens from the DonationVault to "Charlie" for proposal "2"
    Then "Charlie" should have a balance of "200" LAK tokens
    And the DonationVault LAK token balance should be "300" LAK tokens
    And an "ERC20FundsReleased" event should have been emitted by the DonationVault with recipient "Charlie", the LAK token address, and amount "200" LAK tokens

  Scenario: Fund Release (ETH) - Attempt by Non-Governance
    Given "Alice" donates "1" ETH to the DonationVault
    And proposal "3" is approved in "mockDAO"
    When "Eve" (non-governance) attempts to release "0.5" ETH from the DonationVault to "Bob" for proposal "3"
    Then the ETH fund release attempt should fail with message "DonationVault: Caller is not the Governance DAO"

  Scenario: Fund Release (ETH) - Proposal Not Approved
    Given "Alice" donates "1" ETH to the DonationVault
    And proposal "4" is NOT approved in "mockDAO"
    When "mockDAO" attempts to release "0.5" ETH from the DonationVault to "Bob" for proposal "4"
    Then the ETH fund release attempt should fail with message "DonationVault: Proposal not passed"

  Scenario: Emergency ETH Withdrawal - Successful by Owner
    Given "Alice" donates "3" ETH to the DonationVault
    When the deployer (owner) emergency withdraws "1" ETH from the DonationVault to "Eve"
    Then "Eve" ETH balance should have increased by approximately "1" ETH
    And the DonationVault ETH balance should be "2" ETH
    And an "EmergencyWithdrawal" event should have been emitted by the DonationVault for ETH

  Scenario: Emergency LAK Withdrawal - Successful by Owner
    Given "Alice" approves the DonationVault to spend "200" LAK tokens
    And "Alice" donates "200" LAK tokens to the DonationVault
    When the deployer (owner) emergency withdraws "50" LAK tokens from the DonationVault to "Eve"
    Then "Eve" should have a balance of "50" LAK tokens
    And the DonationVault LAK token balance should be "150" LAK tokens
    And an "EmergencyWithdrawal" event should have been emitted by the DonationVault for LAK tokens

  Scenario: Emergency ETH Withdrawal - Attempt by Non-Owner
    Given "Alice" donates "1" ETH to the DonationVault
    When "Alice" attempts to emergency withdraw "0.5" ETH from the DonationVault to "Bob"
    Then the emergency ETH withdrawal attempt should fail with message "Ownable: caller is not the owner"

  Scenario: Setting Governance DAO - Successful by Owner
    Given a new mock GovernanceDAO contract deployed as "newMockDAO"
    When the deployer (owner) sets the DonationVault's governance DAO to "newMockDAO"
    Then the DonationVault's governance DAO should be "newMockDAO"
    And a "GovernanceDAOUpdated" event should have been emitted by the DonationVault with the new address

  Scenario: Setting Governance DAO - Attempt by Non-Owner
    Given a new mock GovernanceDAO contract deployed as "anotherMockDAO"
    When "Alice" attempts to set the DonationVault's governance DAO to "anotherMockDAO"
    Then the set governance DAO attempt should fail with message "Ownable: caller is not the owner"
    And the DonationVault's governance DAO should still be "mockDAO"
