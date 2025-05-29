import { Given, When, Then, World } from "@cucumber/cucumber";
import { expect } from "chai";
import type { Page } from "playwright";
import type { CustomWorld } from "../support/hooks"; // Assuming hooks.ts exports CustomWorld

const BASE_URL = "http://localhost:3000"; // Assuming the frontend runs on this port

// Helper to ensure the page is available
function getPage(world: CustomWorld): Page {
  if (!world.page) {
    throw new Error("Playwright page has not been initialized. Check your hooks.");
  }
  return world.page;
}

Given('I navigate to the {string} page', async function (this: CustomWorld, path: string) {
  const page = getPage(this);
  await page.goto(`${BASE_URL}${path}`);
});

Given('the API endpoint {string} will return a balance of {string} LAK', async function (this: CustomWorld, endpointPattern: string, balance: string) {
  const page = getPage(this);
  // Replace {0xUserAddress} with a wildcard or specific address if needed for routing
  const actualEndpoint = endpointPattern.replace("0xUserAddress", "**"); // Use glob pattern for Playwright routing

  await page.route(`**${actualEndpoint}`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ balance: parseFloat(balance) }),
    });
  });
});

Given('the API endpoint {string} is slow and will eventually return {string} LAK', async function (this: CustomWorld, endpointPattern: string, balance: string) {
  const page = getPage(this);
  const actualEndpoint = endpointPattern.replace("0xUserAddress", "**");

  await page.route(`**${actualEndpoint}`, async route => {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 seconds delay
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ balance: parseFloat(balance) }),
    });
  });
});

Given('the API endpoint {string} will return an error {string}', async function (this: CustomWorld, endpointPattern: string, errorMessage: string) {
  const page = getPage(this);
  const actualEndpoint = endpointPattern.replace("0xUserAddress", "**");

  await page.route(`**${actualEndpoint}`, async route => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: errorMessage }),
    });
  });
});

When('the TokenBalanceDisplay component loads for address {string}', async function (this: CustomWorld, userAddress: string) {
  const page = getPage(this);
  // This step assumes that navigating to the test page (e.g., /test-component-tokenbalance)
  // and potentially passing the userAddress via query param or a global state (handled by the test page)
  // is enough to trigger the component to load and fetch data.
  // For example, the test page might look like:
  // if (props.address) { return <TokenBalanceDisplay address={props.address} /> }
  // We'll assume the component is now visible and attempting to load data.
  // We can add a small wait here to ensure any initial rendering has a chance to occur.
  await page.waitForTimeout(100); // Small delay for component to potentially mount and initiate fetch

  // To make this more robust, the test page could emit an event or set a data-attribute
  // when the component specifically for `userAddress` has made its API call or rendered.
  // For now, we rely on the mocked route and subsequent assertions.
  // If the component takes the address as a prop that is set by the test harness page,
  // this step might involve reloading the page with a query parameter:
  // await page.goto(`${BASE_URL}/test-component-tokenbalance?address=${userAddress}`);
  // For this example, we assume the component is already on the page and the address context is set.
});

Then('the component should display the balance {string}', async function (this: CustomWorld, expectedBalance: string) {
  const page = getPage(this);
  // Assuming the component has an element with a specific test ID or class for the balance.
  // For example, <span data-testid="lak-balance">1,234.56 LAK</span>
  const balanceLocator = page.locator('[data-testid="lak-balance"]');
  await expect(await balanceLocator.textContent()).to.equal(expectedBalance);
});

Then('the component should not display a loading state', async function (this: CustomWorld) {
  const page = getPage(this);
  // Assuming loading state has a specific element, e.g., <div data-testid="loading-spinner">...</div>
  const loadingLocator = page.locator('[data-testid="loading-spinner"]');
  const isVisible = await loadingLocator.isVisible();
  expect(isVisible).to.be.false;
});

Then('the component should not display an error message', async function (this: CustomWorld) {
  const page = getPage(this);
  // Assuming error message has a specific element, e.g., <div data-testid="error-message">...</div>
  const errorLocator = page.locator('[data-testid="error-message"]');
  const isVisible = await errorLocator.isVisible();
  expect(isVisible).to.be.false;
});

Then('the component should display a loading state', async function (this: CustomWorld) {
  const page = getPage(this);
  const loadingLocator = page.locator('[data-testid="loading-spinner"]');
  // Wait for the loading state to appear, as the API call is mocked with a delay
  await loadingLocator.waitFor({ state: 'visible', timeout: 500 }); // Wait a bit for it to show
  const isVisible = await loadingLocator.isVisible();
  expect(isVisible).to.be.true;
});

Then('eventually the component should display the balance {string}', async function (this: CustomWorld, expectedBalance: string) {
  const page = getPage(this);
  const balanceLocator = page.locator('[data-testid="lak-balance"]');
  // Wait for the text content to match, allowing time for the delayed API response and UI update
  await expect(balanceLocator).to.eventually.have.text(expectedBalance, { timeout: 5000 });
});

Then('the component should display an error message {string}', async function (this: CustomWorld, expectedErrorMessage: string) {
  const page = getPage(this);
  const errorLocator = page.locator('[data-testid="error-message"]');
  await errorLocator.waitFor({ state: 'visible', timeout: 500 });
  // This could check for the exact error message if the component renders it,
  // or just the presence of an error state.
  // For this example, let's assume the component displays the error text.
  // If the component shows a generic error, then check for that generic text.
  const actualErrorMessage = await errorLocator.textContent();
  expect(actualErrorMessage).to.include(expectedErrorMessage); // Use include if component might add prefixes/suffixes
});

// Note: The locators used (e.g., `[data-testid="lak-balance"]`) are assumptions.
// The actual application would need these or similar test hooks in its component's HTML.
// The test harness page (`/test-component-tokenbalance`) is also assumed to exist and render
// the TokenBalanceDisplay component in a way that it can be tested.
// Chai with `chai-as-promised` (implicitly handled by Playwright's expect with await) is useful for eventual assertions.
// The `expect(locator).to.eventually.have.text()` pattern is a conceptual representation;
// Playwright's own `expect(locator).toHaveText(expected, { timeout })` is more direct.
// I will adjust the "eventually" step to use Playwright's recommended way.

// Adjusted "eventually" step:
Then('eventually the component should display the balance {string}', {timeout: 6 * 1000}, async function (this: CustomWorld, expectedBalance: string) {
    const page = getPage(this);
    const balanceLocator = page.locator('[data-testid="lak-balance"]');
    // Playwright's expect handles waiting for the condition to be met.
    await expect(balanceLocator).toHaveText(expectedBalance, { timeout: 5000 });
  });

// The `chai-as-promised` style `await expect(promise).to.eventually...` is not standard with Playwright's `expect`.
// Playwright's `expect` is auto-retrying. So `await expect(locator).toHaveText()` is the way.
// The step definition for "eventually" has been updated above to reflect this.
// Also, added a specific timeout to the step definition itself to override the default if necessary for longer waits.
// The `chai` import is for direct assertions if needed, but Playwright's `expect` is preferred for UI.
// The `chai.expect(value).to.equal()` is fine for non-Playwright locator assertions.
// For Playwright locators, use `await expect(locator)...`.
// The `expect` from `chai` is used for boolean checks on visibility. Playwright's `expect(locator).toBeVisible()` is also an option.
// Let's stick to Playwright's expect for locators for consistency.

// --- Revised boolean checks using Playwright's expect ---
Then('the component should not display a loading state', async function (this: CustomWorld) {
  const page = getPage(this);
  const loadingLocator = page.locator('[data-testid="loading-spinner"]');
  await expect(loadingLocator).not.toBeVisible();
});

Then('the component should not display an error message', async function (this: CustomWorld) {
  const page = getPage(this);
  const errorLocator = page.locator('[data-testid="error-message"]');
  await expect(errorLocator).not.toBeVisible();
});

Then('the component should display a loading state', async function (this: CustomWorld) {
  const page = getPage(this);
  const loadingLocator = page.locator('[data-testid="loading-spinner"]');
  await expect(loadingLocator).toBeVisible({ timeout: 500 }); // Wait a bit for it to show
});

Then('the component should display an error message {string}', async function (this: CustomWorld, expectedErrorMessage: string) {
  const page = getPage(this);
  const errorLocator = page.locator('[data-testid="error-message"]');
  await expect(errorLocator).toBeVisible({ timeout: 500 });
  await expect(errorLocator).toContainText(expectedErrorMessage);
});

// Final check on balance display (already using Playwright's expect style)
Then('the component should display the balance {string}', async function (this: CustomWorld, expectedBalance: string) {
  const page = getPage(this);
  const balanceLocator = page.locator('[data-testid="lak-balance"]');
  await expect(balanceLocator).toHaveText(expectedBalance); // Default timeout from hooks.ts will apply
});
