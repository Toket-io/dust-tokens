import { ethers } from "hardhat";

// Uniswap V3 Factory and token addresses
const FACTORY_ADDRESS = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const FEE_TIERS = [500, 3000, 10000]; // 0.05%, 0.3%, 1% fees

// Minimal ABI for Uniswap V3 Factory
const factoryABI = [
  {
    constant: true,
    inputs: [
      { internalType: "address", name: "tokenA", type: "address" },
      { internalType: "address", name: "tokenB", type: "address" },
      { internalType: "uint24", name: "fee", type: "uint24" },
    ],
    name: "getPool",
    outputs: [{ internalType: "address", name: "pool", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

// Minimal ABI for Uniswap V3 Pool
const poolABI = [
  {
    constant: true,
    inputs: [],
    name: "liquidity",
    outputs: [{ internalType: "uint128", name: "", type: "uint128" }],
    stateMutability: "view",
    type: "function",
  },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Using deployer: ${deployer.address}`);

  const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, deployer);

  for (const feeTier of FEE_TIERS) {
    console.log(`\nChecking WETH/DAI pool for fee tier: ${feeTier}...`);

    const poolAddress = await factory.getPool(
      WETH_ADDRESS,
      DAI_ADDRESS,
      feeTier
    );

    if (poolAddress === ethers.constants.AddressZero) {
      console.log(`No pool found for WETH/DAI with ${feeTier / 10000}% fee.`);
    } else {
      console.log(`Pool found at: ${poolAddress}`);
      await checkPoolLiquidity(poolAddress);
    }

    console.log(`\nChecking WETH/USDC pool for fee tier: ${feeTier}...`);

    const usdcPoolAddress = await factory.getPool(
      WETH_ADDRESS,
      USDC_ADDRESS,
      feeTier
    );

    if (usdcPoolAddress === ethers.constants.AddressZero) {
      console.log(`No pool found for WETH/USDC with ${feeTier / 10000}% fee.`);
    } else {
      console.log(`Pool found at: ${usdcPoolAddress}`);
      await checkPoolLiquidity(usdcPoolAddress);
    }
  }
}

async function checkPoolLiquidity(poolAddress: string) {
  const pool = new ethers.Contract(poolAddress, poolABI, ethers.provider);
  const liquidity = await pool.liquidity();

  if (liquidity.isZero()) {
    console.log(`Pool ${poolAddress} has no liquidity.`);
  } else {
    console.log(`Pool ${poolAddress} has liquidity: ${liquidity.toString()}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
