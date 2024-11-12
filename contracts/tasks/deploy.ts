import { PERMIT2_ADDRESS } from "@uniswap/Permit2-sdk";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { readLocalnetAddresses, writeAddressToFile } from "./zetachainUtils";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;

  const [signer] = await hre.ethers.getSigners();
  if (!signer) {
    throw new Error(
      `Wallet not found. Please run "npx hardhat account --save" or set the PRIVATE_KEY environment variable (e.g., in a .env file)`
    );
  }

  const ZETA_SYSTEM_CONTRACT_ADDRESS: string = readLocalnetAddresses(
    "zetachain",
    "systemContract"
  );
  const ZETA_GATEWAY_ADDRESS: string = readLocalnetAddresses(
    "zetachain",
    "gatewayZEVM"
  );

  const factory = await hre.ethers.getContractFactory(args.name);
  const contract = await (factory as any).deploy(
    ZETA_SYSTEM_CONTRACT_ADDRESS,
    ZETA_GATEWAY_ADDRESS
  );
  await contract.deployed();

  if (args.json) {
    console.log(JSON.stringify(contract));
  } else {
    console.log(`🔑 Using account: ${signer.address}
    
🚀 Successfully deployed ${args.name} contract on ${network}.
📜 Contract address: ${contract.address}
`);

    // Save the contract address to the file
    writeAddressToFile("zetachain", args.name, contract.address);
  }
};

const mainDust = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;

  const [signer] = await hre.ethers.getSigners();
  if (!signer) {
    throw new Error(
      `Wallet not found. Please run "npx hardhat account --save" or set the PRIVATE_KEY environment variable (e.g., in a .env file)`
    );
  }

  const GATEWAY_ADDRESS: string = readLocalnetAddresses(
    "ethereum",
    "gatewayEVM"
  );

  const factory = await hre.ethers.getContractFactory(args.name);
  const contract = await (factory as any).deploy(
    GATEWAY_ADDRESS,
    args.uniswapRouterV3,
    args.weth,
    signer.address,
    PERMIT2_ADDRESS
  );
  await contract.deployed();

  if (args.json) {
    console.log(JSON.stringify(contract));
  } else {
    console.log(`🔑 Using account: ${signer.address}
    
🚀 Successfully deployed ${args.name} contract on ${network}.
📜 Contract address: ${contract.address}
`);

    // Save the contract address to the file
    writeAddressToFile("ethereum", args.name, contract.address);
    writeAddressToFile("ethereum", "uniswapRouterV3", args.uniswapRouterV3);
    writeAddressToFile("ethereum", "uniswapQuoterV3", args.uniswapQuoterV3);
    writeAddressToFile("ethereum", "weth", args.weth);
    writeAddressToFile("ethereum", "dai", args.dai);
    writeAddressToFile("ethereum", "usdc", args.usdc);
    writeAddressToFile("ethereum", "uni", args.uni);
    writeAddressToFile("ethereum", "wbtc", args.wbtc);
    writeAddressToFile("ethereum", "link", args.link);

    // Print default addresses
    console.log(`📦 Default Addresses:
----------------------------------------
🦄 Uniswap Instances:
- Uniswap Router V3: ${args.uniswapRouterV3}
- Uniswap Quoter V3: ${args.uniswapQuoterV3}

🪙 Token Addresses:
- WETH: ${args.weth}
- DAI:  ${args.dai}
- USDC: ${args.usdc}
- UNI:  ${args.uni}
- WBTC: ${args.wbtc}
- LINK: ${args.link}
----------------------------------------
`);
  }
};

task("deployUniversalApp", "Deploy the Universal App contract", main)
  .addFlag("json", "Output in JSON")
  .addOptionalParam("name", "Contract to deploy", "Swap");

task("deployEvmContract", "Deploy the contract EVM Dust tokens", mainDust)
  .addFlag("json", "Output in JSON")
  .addOptionalParam("name", "Contract to deploy", "EvmDustTokens")
  .addOptionalParam(
    "uniswapRouterV3",
    "Uniswap V3 Router instance. Defaults to Arbitrum address",
    "0xE592427A0AEce92De3Edee1F18E0157C05861564"
  )
  .addOptionalParam(
    "uniswapQuoterV3",
    "Uniswap V3 Quoter instance. Defaults to Arbitrum address",
    "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"
  )
  .addOptionalParam(
    "weth",
    "WETH instance. Defaults to Arbitrum address",
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
  )
  .addOptionalParam(
    "dai",
    "DAI instance. Defaults to Arbitrum address",
    "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  )
  .addOptionalParam(
    "usdc",
    "USDC instance. Defaults to Arbitrum address",
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
  )
  .addOptionalParam(
    "uni",
    "UNI instance. Defaults to Arbitrum address",
    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0"
  )
  .addOptionalParam(
    "wbtc",
    "WBTC instance. Defaults to Arbitrum address",
    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f"
  )
  .addOptionalParam(
    "link",
    "LINK instance. Defaults to Arbitrum address",
    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4"
  );
