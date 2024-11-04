import { ethers } from "hardhat";

const SWAP_ROUTER_ADDRESS = ethers.utils.getAddress(
  "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"
);
const WETH_ADDRESS = ethers.utils.getAddress(
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
);
const DAI_ADDRESS = ethers.utils.getAddress(
  "0x6B175474E89094C44Da98b954EedeAC495271d0F"
);
const FACTORY_ADDRESS = ethers.utils.getAddress(
  "0x1F98431c8aD98523631AE4a59f267346ea31F984"
); // Uniswap V3 Factory
const FEE_TIER = 3000; // 0.3% pool fee

const amountIn = ethers.utils.parseEther("0.1"); // 0.1 WETH

async function main() {
  const [deployer] = await ethers.getSigners();

  // Set up contracts
  const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
  const router = await ethers.getContractAt("ISwapRouter", SWAP_ROUTER_ADDRESS);

  console.log("Checking WETH balance...");
  const wethBalance = await weth.balanceOf(deployer.address);
  console.log(`WETH Balance: ${ethers.utils.formatEther(wethBalance)} WETH`);

  console.log("Checking WETH allowance...");
  const allowance = await weth.allowance(deployer.address, SWAP_ROUTER_ADDRESS);
  console.log(`WETH Allowance: ${ethers.utils.formatEther(allowance)} WETH`);

  if (wethBalance.lt(amountIn)) {
    throw new Error("Insufficient WETH balance.");
  }
  if (allowance.lt(amountIn)) {
    console.log("Approving router to spend WETH...");
    const approveTx = await weth.approve(SWAP_ROUTER_ADDRESS, amountIn);
    await approveTx.wait();
  }

  console.log("Performing swap: WETH -> DAI...");
  try {
    const tx = await router.exactInputSingle(
      {
        // 10 minutes from now
        amountIn: amountIn,

        amountOutMinimum: 1,

        deadline: Math.floor(Date.now() / 1000) + 60 * 10,

        fee: FEE_TIER,
        recipient: deployer.address,
        // Set to 1 to avoid slippage issues
        sqrtPriceLimitX96: 0,

        tokenIn: WETH_ADDRESS,
        tokenOut: DAI_ADDRESS, // No price limit
      },
      { gasLimit: 500000 } // Manually setting gas limit
    );

    const receipt = await tx.wait();
    console.log(`Swap successful! Tx hash: ${receipt.transactionHash}`);
  } catch (error) {
    console.error("Swap failed: ", error);
    throw new Error("Swap transaction reverted.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
