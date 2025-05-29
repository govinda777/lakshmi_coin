import { BeforeAll, AfterAll, Before, After, World, IWorldOptions, setDefaultTimeout } from "@cucumber/cucumber";
import { Browser, Page, chromium, BrowserContext } from "playwright";

// Set default timeout for hooks and steps to 60 seconds
setDefaultTimeout(60 * 1000);

export interface CustomWorld extends World {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
}

let globalBrowser: Browser;

BeforeAll(async function (this: CustomWorld) {
  // Launch the browser once before all scenarios
  globalBrowser = await chromium.launch({ headless: true }); // Use headless: false for debugging
});

AfterAll(async function (this: CustomWorld) {
  // Close the browser after all scenarios
  if (globalBrowser) {
    await globalBrowser.close();
  }
});

Before(async function (this: CustomWorld, options: IWorldOptions) {
  // Create a new browser context and page for each scenario
  if (!globalBrowser) {
    throw new Error("Browser not initialized. BeforeAll hook might have failed.");
  }
  this.context = await globalBrowser.newContext({
    // You can set viewport, record video, etc. here if needed for all scenarios
    // viewport: { width: 1280, height: 720 },
    // recordVideo: { dir: 'videos/' } // Example: records video for each scenario
  });
  this.page = await this.context.newPage();
});

After(async function (this: CustomWorld) {
  // Close the page and context after each scenario
  if (this.page) {
    await this.page.close();
  }
  if (this.context) {
    await this.context.close();
  }
});

// Make sure CustomWorld is correctly interpreted by Cucumber
declare module '@cucumber/cucumber' {
  interface World extends CustomWorld {}
}
