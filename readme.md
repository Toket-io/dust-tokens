# Cross-Chain Dust Aggregator

This repository contains the implementation of a cross-chain dust aggregator using ZetaChain’s interoperability protocol, Permit2, and Uniswap features. The dust aggregator addresses the common issue of accumulating small, often unusable amounts of tokens (“dust”) scattered across different chains. By leveraging these technologies, users can consolidate these dust tokens efficiently and securely into a single, more valuable asset on a chain of their choice.

## Introduction

This project demonstrates how to build a universal application that spans across multiple blockchains, allowing users to:

- **Aggregate Dust Tokens**: Collect and consolidate small amounts of tokens from various chains.
- **Cross-Chain Swapping and Bridging**: Swap tokens into a single asset and bridge them to a destination chain.
- **Seamless User Experience**: Provide a user-friendly interface for selecting tokens, signing transactions, and monitoring cross-chain operations.

The implementation utilizes:

- **ZetaChain**: For cross-chain interoperability.
- **Permit2**: To batch approve multiple token transfers with a single signature.
- **UniswapV3**: For efficient token swapping on EVM chains.
- **UniswapV2**: For token swapping on ZetaChain.

## Project Structure

The repository is organized into two main directories:

### Contracts

The `contracts` directory contains smart contracts written in Solidity, using Hardhat and Foundry for development and testing. The contracts facilitate:

- **Source Chain Contract (`EvmDustTokens.sol`)**: Handles batch token transfers, swaps tokens into ETH using UniswapV3, and initiates cross-chain communication with ZetaChain.
- **ZetaChain Universal App Contract (`Swap.sol`)**: Processes incoming deposits from connected EVM chains, swaps tokens using ZetaChain’s UniswapV2 instance, and facilitates withdrawals to another connected EVM chain.
- **Destination Chain Contract (`EvmDustTokens.sol`)**: Receives tokens from ZetaChain, performs the final swap into the user’s desired output token, and transfers it to the user’s address.
- **Simple Swap Contract (`SimpleSwap.sol`)**: Used mainly for creating dust tokens during the test procedures.

## Getting Started

#### Prerequisites

Ensure you have the following installed on your system:

- **Node.js** (v14 or later)
- **npm** or **yarn**

#### Installation

Clone the repository:

```bash
git clone https://github.com/Toket-io/dust-tokens
```

## Running the Project

### Contracts

Navigate to the contracts directory:

```bash
cd contracts/
```

**Install Dependencies**

```bash
yarn install
```

**Running a Local Blockchain Node**

Start a local blockchain node forked from Arbitrum using Hardhat:

```bash
yarn localnet:arbitrum
```

This command enables interaction with Uniswap instances and pre-deployed tokens like USDC and UNI on a local network.

**Deploying Contracts**

Deploy the ZetaChain Universal App contract:

```bash
yarn deployUniversalApp
```

- Deploys the `Swap.sol` contract to the local ZetaChain instance.
- Saves the contract address to `localnet.json`.

**Deploy the EVM contract:**

```bash
yarn deployEvmContract
```

- Deploys the `EvmDustTokens.sol` contract to the local EVM instance.
- Adds token addresses and Uniswap instances to `localnet.json`.

**Running Tests**

Run the contract tests:

```bash
yarn test
```

- Executes all test scripts in the `test/` directory.
- **Generates Dust Tokens**: The test scripts include procedures to generate “dust tokens” by interacting with the `SimpleSwap.sol` contract. This ensures that user balances are not zero, allowing you to use the application more effectively.
- The tests also serve as examples of how the contracts interact, providing a good starting point for understanding the system.

### Web Application

In a new terminal, navigate to the web directory:

```bash
cd web/
```

**Install Dependencies**

```bash
yarn install
```

**Start the Development Server**

```bash
yarn dev
```

- Starts the Next.js development server.
- Access the application at `http://localhost:3000`.

## Contributing

We welcome contributions to enhance this project! Please follow these steps:

1. **Fork** the repository.
2. **Create a new branch** for your feature or bugfix.
3. **Commit your changes** with clear commit messages.
4. **Submit a pull request** to the main branch.

Before submitting, please ensure:

- Your code follows the existing coding style.
- You've added or updated relevant documentation and comments.
- All tests pass locally.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
