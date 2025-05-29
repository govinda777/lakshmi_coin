Feature: LakshmiZRC20 Token

  Background:
    Given a deployed LakshmiZRC20 contract with an initial supply of "1000000" tokens

  Scenario: Deployment Verification
    Then the total supply should be "1000000" tokens
    And the contract owner should be the deployer
    And the deployer should have a balance of "1000000" tokens
    And the token name should be "Lakshmi Governance Token"
    And the token symbol should be "LAK"

  Scenario: Token Transfers - Successful
    Given "Alice" has "0" LAK tokens
    When the deployer transfers "100" LAK tokens to "Alice"
    Then "Alice" should have a balance of "100" LAK tokens
    And the deployer's balance should be "999900" LAK tokens

  Scenario: Token Transfers - Insufficient Balance
    Given "Alice" has "10" LAK tokens
    When "Alice" attempts to transfer "20" LAK tokens to "Bob"
    Then the transfer should fail with message "ERC20: transfer amount exceeds balance"
    And "Alice" should still have a balance of "10" LAK tokens

  Scenario: Token Transfers - To Zero Address
    When the deployer attempts to transfer "10" LAK tokens to the zero address
    Then the transfer should fail with message "ERC20: transfer to the zero address"

  Scenario: Token Minting - Successful by Owner
    When the deployer mints "5000" LAK tokens for "Alice"
    Then "Alice" should have a balance of "5000" LAK tokens
    And the total supply should be "1005000" tokens

  Scenario: Token Minting - Attempt by Non-Owner
    Given "Alice" is not the owner
    When "Alice" attempts to mint "1000" LAK tokens for "Bob"
    Then the minting attempt should fail with message "Ownable: caller is not the owner"
    And the total supply should still be "1000000" tokens

  Scenario: Token Burning - Successful by Token Holder
    Given the deployer has "1000000" LAK tokens
    When the deployer burns "100" LAK tokens
    Then the deployer's balance should be "999900" LAK tokens
    And the total supply should be "999900" tokens

  Scenario: Token Burning - Attempt to Burn More Than Balance
    Given "Alice" has "50" LAK tokens
    When "Alice" attempts to burn "60" LAK tokens
    Then the burning attempt should fail with message "ERC20: burn amount exceeds balance"
    And "Alice" should still have a balance of "50" LAK tokens

  Scenario: Allowance and TransferFrom - Successful
    Given "Alice" approves "Bob" to spend "200" LAK tokens from the deployer's account
    When "Bob" transfers "150" LAK tokens from the deployer's account to "Charlie"
    Then "Charlie" should have a balance of "150" LAK tokens
    And the deployer's balance should be "999850" LAK tokens
    And the allowance of "Bob" for the deployer's account should be "50" LAK tokens

  Scenario: Allowance and TransferFrom - Exceeding Allowance
    Given "Alice" approves "Bob" to spend "100" LAK tokens from the deployer's account
    When "Bob" attempts to transfer "120" LAK tokens from the deployer's account to "Charlie"
    Then the transferFrom attempt should fail with message "ERC20: insufficient allowance"
    And the deployer's balance should still be "1000000" LAK tokens
    And "Charlie" should have a balance of "0" LAK tokens

  Scenario: Allowance and TransferFrom - Transfer to Zero Address
    Given "Alice" approves "Bob" to spend "100" LAK tokens from the deployer's account
    When "Bob" attempts to transfer "50" LAK tokens from the deployer's account to the zero address
    Then the transferFrom attempt should fail with message "ERC20: transfer to the zero address"
    And the deployer's balance should still be "1000000" LAK tokens
    And the allowance of "Bob" for the deployer's account should still be "100" LAK tokens
