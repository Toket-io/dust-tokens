import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name as any;

  const [signer] = await hre.ethers.getSigners();
  if (signer === undefined) {
    throw new Error(
      `Wallet not found. Please, run "npx hardhat account --save" or set PRIVATE_KEY env variable (for example, in a .env file)`
    );
  }

  const signerAddress = signer.address;

  // Minimal ERC-20 ABI
  const erc20Abi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ];

  // Create a new instance of the ERC-20 contract
  const tokenContract = new hre.ethers.Contract(
    args.erc20Address,
    erc20Abi,
    hre.ethers.provider
  );

  const balance = await hre.ethers.provider.getBalance(signerAddress);

  // Get ERC-20 token balance
  const tokenBalance = await tokenContract.balanceOf(signerAddress);
  const decimals = await tokenContract.decimals();
  const formattedTokenBalance = hre.ethers.utils.formatUnits(
    tokenBalance,
    decimals
  );

  console.log(`
    🚀 From account ${signerAddress}.
    💰 Balance: ${hre.ethers.utils.formatEther(balance)} ETH
    🪙  ERC-20 token balance: ${formattedTokenBalance}
    `);
};

task("balance", "Deploy the contract", main)
  .addFlag("json", "Output in JSON")
  .addOptionalParam("name", "Contract to deploy", "Swap")
  .addOptionalParam(
    "erc20Address",
    "ERC-20 token address",
    "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82"
  );
