// cucumber.js for frontend
module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: [
      'features/step_definitions/**/*.ts', // Path to your step definitions
      'features/support/**/*.ts'          // Path to your support files (hooks)
    ],
    format: [
      'summary',
      'progress-bar',
      // 'html:cucumber-report.html' // Optional: for HTML reports
    ],
    paths: ['features/**/*.feature'], // Path to your feature files
    publishQuiet: true,
    // Playwright options are typically managed in hooks (BeforeAll, AfterAll, Before, After)
    // rather than directly in cucumber.js. The hooks will handle browser and page setup.
  },
};
