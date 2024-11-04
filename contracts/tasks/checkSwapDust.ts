import { ethers } from "hardhat";

// Replace these with your contract addresses
const SWAP_ROUTER_ADDRESS = ethers.utils.getAddress(
  "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"
);
const WETH_ADDRESS = ethers.utils.getAddress(
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
);
const DAI_ADDRESS = ethers.utils.getAddress(
  "0x6B175474E89094C44Da98b954EedeAC495271d0F"
);
const FEE_TIER = 3000;
const CONTRACT_ADDRESS = "0x2098cb47B17082Ab6969FB2661f2759A9BF357c4"; // Replace with your deployed contract address

const amountIn = ethers.utils.parseEther("0.1"); // 0.1 WETH

async function main() {
  const [deployer] = await ethers.getSigners();
  const contract = await ethers.getContractAt(
    "EvmDustTokens",
    CONTRACT_ADDRESS
  );

  console.log("Checking WETH balance...");
  const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
  const wethBalance = await weth.balanceOf(deployer.address);
  console.log(`WETH Balance: ${ethers.utils.formatEther(wethBalance)} WETH`);

  if (wethBalance.lt(amountIn)) {
    throw new Error("Insufficient WETH balance.");
  }

  console.log("Approving router to spend WETH...");
  const approveTx = await weth.approve(CONTRACT_ADDRESS, amountIn);
  await approveTx.wait();
  console.log("Router approved to spend WETH.");

  const allowance = await weth.allowance(deployer.address, CONTRACT_ADDRESS);
  console.log(
    `Allowance set for router: ${ethers.utils.formatEther(allowance)} WETH`
  );

  console.log("Calling swapWETHForDAI...");
  const tx = await contract.swapWETHForDAI(amountIn);
  const receipt = await tx.wait();

  console.log(`Swap successful! Tx hash: ${receipt.transactionHash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
