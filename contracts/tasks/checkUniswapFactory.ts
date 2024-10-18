import { ethers } from "hardhat";

const UNISWAP_V3_FACTORY_ADDRESS = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

const uniswapV3FactoryABI = [
  {
    inputs: [{ internalType: "uint24", name: "fee", type: "uint24" }],
    name: "feeAmountTickSpacing",
    outputs: [{ internalType: "int24", name: "", type: "int24" }],
    stateMutability: "view",
    type: "function",
  },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const factory = new ethers.Contract(
    UNISWAP_V3_FACTORY_ADDRESS,
    uniswapV3FactoryABI,
    deployer
  );

  try {
    // Query the tick spacing for a common Uniswap fee (0.3% = 3000)
    const tickSpacing = await factory.feeAmountTickSpacing(3000);
    console.log(`Factory found! Tick Spacing for 0.3% fee: ${tickSpacing}`);
  } catch (error) {
    console.error(
      "Error interacting with the Uniswap v3 Factory. Is it deployed on your fork?",
      error
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
