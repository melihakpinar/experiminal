# Experiminal

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Mina Protocol](https://img.shields.io/badge/Protocol-Mina%20Protocol-orange.svg)
![GitHub Issues](https://img.shields.io/github/issues/melihakpinar/experiminal)
![GitHub Forks](https://img.shields.io/github/forks/melihakpinar/experiminal)
![GitHub Stars](https://img.shields.io/github/stars/melihakpinar/experiminal)

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Deploying the Smart Contract](#deploying-the-smart-contract)
  - [Configuring the UI](#configuring-the-ui)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Introduction

Welcome to **Experiminal**, an innovative solution leveraging the power of the [Mina Protocol](https://minaprotocol.com/) to conduct secure, private, and transparent surveys for research. Our platform combines the benefits of blockchain technology with zero-knowledge proofs to ensure data integrity and participant anonymity.

By utilizing zero-knowledge proofs (zkApps), Experiminal ensures that participants' data remains confidential while providing verifiable results. It also allows researchers to automate participant verification and democratize the survey process, making it easier to conduct large-scale studies with enhanced privacy guarantees.

## Features

- **Zero-Knowledge Proofs**: Ensure participant anonymity and data integrity without revealing sensitive information.
- **Automated Participant Verification**: Smart contracts validate participant eligibility based on predefined key questions.
- **Mina Protocol Integration**: Utilize Mina's lightweight blockchain for scalable and decentralized applications.
- **Customizable Surveys**: Researchers can easily create and configure surveys with both standard and key questions.
- **Real-time Results**: View aggregated survey results in real-time while maintaining individual privacy.
- **Secure Data Storage**: Participant responses are securely stored and can only be accessed by authorized parties.
- **User-friendly Interface**: Intuitive UI for both researchers and participants, built with Next.js and React.

## Architecture

The Experiminal Survey Platform comprises two main components:

1. **Smart Contract (zkApp)**: 
   - Developed using Mina Protocol's zkApps
   - Handles participant verification
   - Manages data hashing and integrity checks
   - Controls access to survey results

2. **User Interface (UI)**:
   - Built with Next.js and React
   - Provides an interactive platform for:
     - Researchers to create and manage surveys
     - Participants to take surveys
     - Authorized users to view real-time results

3. **Database**:
   - Stores survey configurations, questions, and encrypted responses
   - Ensures data persistence and quick retrieval

## Getting Started

Follow these instructions to set up and run the Experiminal Survey Platform on your local machine.

### Prerequisites

Before you begin, ensure you have met the following requirements:

- **Node.js**: Install [Node.js](https://nodejs.org/) (v14 or later recommended)
- **npm or Yarn**: Comes bundled with Node.js. Alternatively, install [Yarn](https://classic.yarnpkg.com/en/docs/install) if preferred
- **Mina Wallet**: Install a Mina-compatible wallet like [Auro Wallet](https://www.aurowallet.com/)
- **MySQL**: Install and set up a MySQL database server

### Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/melihakpinar/experiminal.git
   cd experiminal
   ```

2. **Install Dependencies**

   ```bash
   cd ui
   npm install
   cd ../contracts
   npm install
   ```

3. **Set Up the Database**

   - Create a new MySQL database named `experiminal`
   - Import the schema from `db/experiminal.sql`
   - Go to `ui/src/pages/api/db_config.ts` and set the correct credentials for your MySQL server.

### Deploying the Smart Contract

1. **Compile the Smart Contract**

   ```bash
   cd contracts
   npm run build
   ```

2. **Deploy the Contract to Mina Devnet**

   Ensure you have some test Mina tokens in your wallet. Then run:

   ```bash
   npm run deploy
   ```

   Note the deployed contract address for the next step.

### Configuring the UI

1. **Update zkApp Address**

   Open `ui/src/pages/index.tsx` and `ui/src/pages/configure.tsx`, then replace the `zkappAddress` constant with your deployed zkApp address:

   ```javascript
   const zkappAddress = 'Your_Deployed_ZkApp_Address_Here';
   ```

2. **Start the Development Server**

   ```bash
   cd ../ui
   npm run dev
   ```

   The application will be accessible at `http://localhost:3000`.

## Usage

1. **Configuring a Survey**:
   - Navigate to `/configure`
   - Set the survey end time
   - Add questions, marking key questions as needed
   - Submit the configuration

2. **Participating in a Survey**:
   - Visit the main page
   - Connect your Mina wallet
   - Answer the survey questions
   - Submit your responses

## Contributing

I welcome contributions to Experiminal! Please follow these steps to contribute:

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit them: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For any questions or concerns, please open an issue on the GitHub repository or contact the maintainers directly.

Project Link: [https://github.com/melihakpinar/experiminal](https://github.com/melihakpinar/experiminal)