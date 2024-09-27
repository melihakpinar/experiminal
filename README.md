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

## Introduction

Welcome to **Experiminal**, an innovative solution leveraging the power of the [Mina Protocol](https://minaprotocol.com/) to conduct secure, private, and transparent surveys for researches.

By utilizing zero-knowledge proofs (zkApps), our platform ensures that participants' data remains confidential while providing verifiable results. It also allows researchers to automate participant verification and democratize the survey process.

## Features
- **Zero-Knowledge Proofs**: Ensure participant anonymity and data integrity without revealing sensitive information.
- **Automated Participant Verification**: Smart contracts validate participant eligibility based on predefined key questions.
- **Mina Protocol Integration**: Utilize Mina's lightweight blockchain for scalable and decentralized applications.

## Architecture

The Experiminal Survey Platform comprises two main components:

1. **Smart Contract (zkApp)**: Developed using Mina Protocol's zkApps, it handles participant verification, data hashing, and transaction management.
2. **User Interface (UI)**: Built with Next.js and React, it provides an interactive platform for participants to take surveys and view real-time results.

## Getting Started

Follow these instructions to set up and run the Experiminal Survey Platform on your local machine.

### Prerequisites

Before you begin, ensure you have met the following requirements:

- **Node.js**: Install [Node.js](https://nodejs.org/) (v14 or later recommended).
- **npm or Yarn**: Comes bundled with Node.js. Alternatively, install [Yarn](https://classic.yarnpkg.com/en/docs/install) if preferred.
- **Mina Wallet**: Install a Mina-compatible wallet like [Auro Wallet](https://www.aurowallet.com/).

### Installation

#### Clone the Repository

```bash
git clone https://github.com/melihakpinar/experiminal.git
cd experiminal
```

#### Install Dependencies

```bash
npm install
```

### Deploying the Smart Contract

#### Navigate to Contracts Directory

```bash
cd contracts
```

#### Install Contract Dependencies

```bash
npm install
```

#### Compile the Smart Contract

```bash
npm run compile
```

#### Deploy the Contract to Mina Devnet

Ensure you have some test Mina tokens in your wallet. Then run:

```bash
npm run deploy
```

### Configuring the UI

#### Navigate Back to UI Directory

```bash
cd ../ui
```

#### Update zkApp Address

Open `src/pages/index.tsx` and replace the `ZKAPP_ADDRESS` constant with your deployed zkApp address:

```javascript
const ZKAPP_ADDRESS = 'Your_Deploy_ZkApp_Address_Here';
```

#### Define Survey Questions and Key Questions

In the same file (`src/pages/index.tsx`), customize the `questions` and `keyQuestions` arrays to fit your survey needs:

```javascript
const questions = [
    "Your first question?",
    "Your second question?",
    // ... add more questions
];
const keyQuestions = [1, 3]; // Indices of key eligibility questions
```

#### Start the Development Server

Run the following command:

```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.