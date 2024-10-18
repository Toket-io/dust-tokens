import { ethers } from "hardhat";

const SWAP_ROUTER_ADDRESS = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"; // SwapRouter02 on mainnet

const swapRouterABI = [
  {
    constant: true,
    inputs: [],
    name: "WETH9",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

async function main() {
  const [deployer] = await ethers.getSigners();

  const router = new ethers.Contract(
    SWAP_ROUTER_ADDRESS,
    swapRouterABI,
    deployer
  );

  try {
    // Query the WETH address from the SwapRouter02 contract
    const wethAddress = await router.WETH9();
    console.log(`Router found! WETH Address: ${wethAddress}`);
  } catch (error) {
    console.error(
      "Error interacting with the Swap Router. Is it deployed on your fork?",
      error
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
