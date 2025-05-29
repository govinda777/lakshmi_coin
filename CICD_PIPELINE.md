# Lakshmi DAO CI/CD Pipeline

This document describes the Continuous Integration (CI) pipeline for the Lakshmi DAO project, implemented using GitHub Actions.

## Overview

The CI pipeline is designed to automate the process of testing and building the project whenever changes are pushed to the repository. This helps ensure code quality, catch errors early, and maintain a stable codebase.

The pipeline is defined in the `.github/workflows/ci.yml` file.

## Triggers

The CI pipeline is automatically triggered by the following events:

*   **Push to `main` branch:** When code is pushed directly to the `main` branch.
*   **Pull Request:** When a pull request is opened or updated targeting any branch.

## Pipeline Jobs

The pipeline consists of two main jobs that run in parallel:

1.  **`smart_contracts`**: Handles CI for the Solidity smart contracts.
2.  **`frontend`**: Handles CI for the React/TypeScript frontend application.

### 1. `smart_contracts` Job

This job performs the following steps for the smart contracts located in the `lakshmi-dao` directory:

*   **Environment:** Runs on `ubuntu-latest` with Node.js version 18.
*   **Checkout code:** Checks out the latest version of the repository.
*   **Install backend dependencies:** Runs `npm install` in the `lakshmi-dao` directory to install all necessary packages for the Hardhat environment and smart contract development.
*   **Compile smart contracts:** Runs `npm run compile` (which executes `hardhat compile`) to compile the Solidity smart contracts.
*   **Run Hardhat tests:** Runs `npm run test` (which executes `hardhat test`) to run the automated tests written for the smart contracts.
*   **Run Cucumber BDD tests for contracts:** Runs `npx cucumber-js` in the `lakshmi-dao` directory to execute Behavior-Driven Development tests, ensuring contracts meet specified behaviors.

### 2. `frontend` Job

This job performs the following steps for the frontend application located in the `lakshmi-dao/frontend` directory:

*   **Environment:** Runs on `ubuntu-latest` with Node.js version 18.
*   **Checkout code:** Checks out the latest version of the repository.
*   **Install frontend dependencies:** Runs `npm install` in the `lakshmi-dao/frontend` directory to install all necessary packages for the React application.
*   **Run frontend tests (Jest/ESLint):** Runs `npm run test -- --watchAll=false` to execute unit and integration tests using Jest. This command also typically includes ESLint checks to ensure code quality and style. The `--watchAll=false` flag ensures tests run once and exit, which is suitable for CI environments.
*   **Run Cucumber BDD tests for frontend:** Runs `npx cucumber-js` in the `lakshmi-dao/frontend` directory to execute Behavior-Driven Development tests for the user interface and frontend logic.
*   **Build frontend application:** Runs `npm run build` to create a production-ready build of the frontend application.

## Viewing Workflow Runs

You can view the status and logs of the CI pipeline runs in the "Actions" tab of the GitHub repository. Each run will show the status of both the `smart_contracts` and `frontend` jobs.

## Troubleshooting

*   **Workflow Failures:** If a job or step fails, click on it in the Actions tab to view the detailed logs. The logs will usually indicate the command that failed and provide error messages.
*   **Dependency Issues:** Ensure that `package-lock.json` (for both the root and frontend directories) is up-to-date and committed to the repository. This helps ensure reproducible builds.
*   **Test Failures:** Address any failing tests as indicated in the logs. Run tests locally to debug before pushing changes.

## Future Enhancements (CD - Continuous Deployment)

Currently, this pipeline focuses on CI (Continuous Integration). Future enhancements could include:

*   **Automated deployment of smart contracts:** To testnets (e.g., Sepolia, Goerli) or mainnet upon successful builds and tests on specific branches (e.g., `main`). This would require secure handling of private keys and potentially approval steps.
*   **Automated deployment of the frontend:** To hosting platforms like Vercel, Netlify, or GitHub Pages after successful builds.
