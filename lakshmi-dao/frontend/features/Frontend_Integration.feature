Feature: Frontend Application Integration

  Background:
    Given I am on the homepage

  Scenario: User Connects Wallet and Sees Balance
    When I click the "Connect Wallet" button
    And the API endpoint "/api/connect-wallet" for address "0xMockAddress" will return user data including LAK balance "100.00"
    And I approve the connection in my mock wallet action for "0xMockAddress"
    Then my wallet address "0xMockAddress" should be displayed on the page
    And my LAK token balance should be displayed as "100.00 LAK"

  Scenario: User Makes an ETH Donation
    Given my wallet "0xMockAddress" is connected with LAK balance "100.00"
    And I am on the "DonationVault" page
    And the API endpoint "/api/donation-vault/stats" initially returns total ETH donated "10.5"
    And the API endpoint "/api/donate-eth" will succeed for a "0.1" ETH donation from "0xMockAddress"
    And the API endpoint "/api/donation-vault/stats" subsequently returns total ETH donated "10.6"
    When I enter "0.1" in the ETH donation amount input
    And I click the "Donate ETH" button
    And I confirm the ETH donation transaction in my mock wallet action
    Then a success message "Donation successful!" should be displayed
    And the displayed total ETH donated in the vault should be "10.6 ETH"

  Scenario: User Makes a LAK Donation
    Given my wallet "0xMockAddress" is connected with LAK balance "500.00"
    And I am on the "DonationVault" page
    And the API endpoint "/api/donation-vault/stats" initially returns total LAK donated "1250.75"
    And the API endpoint "/api/donate-lak" will succeed for a "50" LAK donation from "0xMockAddress"
    And the API endpoint "/api/donation-vault/stats" subsequently returns total LAK donated "1300.75"
    And my LAK token balance will be updated to "450.00" LAK post-donation
    When I enter "50" in the LAK donation amount input
    And I click the "Donate LAK" button
    And I confirm the LAK donation transaction in my mock wallet action
    Then a success message "LAK Donation successful!" should be displayed
    And the displayed total LAK donated in the vault should be "1300.75 LAK"
    And my LAK token balance should be displayed as "450.00 LAK"
