import fs from "fs";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

// Helper function to read deployed contract addresses
export const readAddressFromFile = (
  network: string,
  contractName: string
): string => {
  const filePath = path.join(__dirname, "deployed_addresses.json");

  if (!fs.existsSync(filePath)) {
    throw new Error(`Deployed contracts file not found at ${filePath}`);
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const networkContracts = data[network];

  if (!networkContracts || !networkContracts[contractName]) {
    throw new Error(
      `Contract address for ${contractName} not found on network ${network}`
    );
  }

  return networkContracts[contractName];
};

const writeAddressToFile = (
  network: string,
  contractName: string,
  address: string
) => {
  const filePath = path.join(__dirname, "deployed_addresses.json");

  let data = {};
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    data = JSON.parse(fileContent || "{}");
  }

  // Update the deployed addresses data
  data[network] = {
    ...(data[network] || {}),
    [contractName]: address,
  };

  // Write the updated data back to the file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`📦 Contract address saved to ${filePath}`);
};

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;

  const [signer] = await hre.ethers.getSigners();
  if (signer === undefined) {
    throw new Error(
      `Wallet not found. Please, run "npx hardhat account --save" or set PRIVATE_KEY env variable (for example, in a .env file)`
    );
  }

  const factory = await hre.ethers.getContractFactory(args.name);
  const contract = await (factory as any).deploy(
    args.systemContract,
    args.gatewayZetaChain
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
    writeAddressToFile(network, args.name, contract.address);
  }
};

const mainDust = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;

  const [signer] = await hre.ethers.getSigners();
  if (signer === undefined) {
    throw new Error(
      `Wallet not found. Please, run "npx hardhat account --save" or set PRIVATE_KEY env variable (for example, in a .env file)`
    );
  }

  // Read the swap address from the deployed contracts file
  const swapAddress = readAddressFromFile(network, "Swap");
  const routerAddress = readAddressFromFile(network, "UniswapV2Router");

  const factory = await hre.ethers.getContractFactory(args.name);
  const contract = await (factory as any).deploy(
    args.systemContract,
    args.gatewayZetaChain,
    swapAddress,
    routerAddress
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
    writeAddressToFile(network, args.name, contract.address);
  }
};

task("deploy", "Deploy the contract", main)
  .addFlag("json", "Output in JSON")
  .addOptionalParam("name", "Contract to deploy", "Swap")
  .addOptionalParam(
    "systemContract",
    "System contract",
    "0x610178dA211FEF7D417bC0e6FeD39F05609AD788"
  )
  .addOptionalParam(
    "gatewayZetaChain",
    "Gateway address",
    "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0"
  );

task("deployDustTokens", "Deploy the contract EVM tokens", mainDust)
  .addFlag("json", "Output in JSON")
  .addOptionalParam("name", "Contract to deploy", "EvmDustTokens")
  .addOptionalParam(
    "systemContract",
    "System contract",
    "0x610178dA211FEF7D417bC0e6FeD39F05609AD788"
  )
  .addOptionalParam(
    "gatewayZetaChain",
    "Gateway address",
    "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
  );
