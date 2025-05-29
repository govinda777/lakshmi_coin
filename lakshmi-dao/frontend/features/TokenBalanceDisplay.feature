Feature: TokenBalanceDisplay Component

  Background:
    Given I navigate to the "/test-component-tokenbalance" page

  Scenario: Displaying positive LAK token balance
    Given the API endpoint "/api/lak-balance/0xUserAddress" will return a balance of "1234.56" LAK
    When the TokenBalanceDisplay component loads for address "0xUserAddress"
    Then the component should display the balance "1,234.56 LAK"
    And the component should not display a loading state
    And the component should not display an error message

  Scenario: Displaying zero LAK token balance
    Given the API endpoint "/api/lak-balance/0xUserAddress" will return a balance of "0" LAK
    When the TokenBalanceDisplay component loads for address "0xUserAddress"
    Then the component should display the balance "0.00 LAK"
    And the component should not display a loading state
    And the component should not display an error message

  Scenario: Displaying loading state while fetching balance
    Given the API endpoint "/api/lak-balance/0xUserAddress" is slow and will eventually return "500" LAK
    When the TokenBalanceDisplay component loads for address "0xUserAddress"
    Then the component should display a loading state
    And eventually the component should display the balance "500.00 LAK"
    And the component should not display an error message

  Scenario: Displaying error message if fetching balance fails
    Given the API endpoint "/api/lak-balance/0xUserAddress" will return an error "Failed to fetch balance"
    When the TokenBalanceD
