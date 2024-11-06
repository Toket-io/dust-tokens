import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { PERMIT2_ADDRESS, SignatureTransfer } from "@uniswap/Permit2-sdk";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import hre from "hardhat";

import ContractsConfig from "../../ContractsConfig";
import {
  EvmDustTokens,
  Permit2App,
  SimpleSwap,
  Swap,
} from "../typechain-types";

const DAI_DECIMALS = 18;
const USDC_DECIMALS = 6;

const GATEWAY_ADDRESS: string = ContractsConfig.evm_gateway;

// Zetachain Contracts
const ZETA_GATEWAY_ADDRESS: string = ContractsConfig.zeta_gateway;
const ZETA_SYSTEM_CONTRACT_ADDRESS: string =
  ContractsConfig.zeta_systemContract;
const ZETA_USDC_ETH_ADDRESS: string = ContractsConfig.zeta_usdcEthToken;
const ZETA_ETH_ADDRESS: string = ContractsConfig.zeta_ethEthToken;

const WETH_ADDRESS: string = ContractsConfig.evm_weth ?? "";
const DAI_ADDRESS: string = process.env.DAI_ADDRESS ?? "";
const USDC_ADDRESS: string = process.env.USDC_ADDRESS ?? "";
const UNI_ADDRESS = process.env.UNI_ADDRESS ?? "";
const LINK_ADDRESS: string = process.env.LINK_ADDRESS ?? "";
const WBTC_ADDRESS: string = process.env.WBTC_ADDRESS ?? "";

const UNISWAP_ROUTER: string = ContractsConfig.evm_uniswapRouterV3;

const ercAbi = [
  // Read-Only Functions
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  // Authenticated Functions
  "function transfer(address to, uint amount) returns (bool)",
  "function deposit() public payable",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function withdraw(uint256 wad) external",
];

type TokenSwap = {
  amount: BigNumber;
  token: string;
};

describe("EvmDustTokens with Permit2", function () {
  let signer: SignerWithAddress;
  let dustTokens: EvmDustTokens;
  let tokenA: Contract;
  let tokenB: Contract;

  before(async function () {
    console.log("Starting tests");
    const signers = await hre.ethers.getSigners();
    signer = signers[0];
    console.log("Signer Address:", signer.address);

    // Deploy EvmDustTokens contract with PERMIT2 address
    const EvmDustTokensFactory = await hre.ethers.getContractFactory(
      "EvmDustTokens"
    );
    dustTokens = await EvmDustTokensFactory.deploy(
      GATEWAY_ADDRESS,
      UNISWAP_ROUTER,
      WETH_ADDRESS,
      signer.address,
      PERMIT2_ADDRESS
    );
    await dustTokens.deployed();

    console.log("DustTokens deployed to:", dustTokens.address);

    // Deploy two new ERC20 tokens
    const ERC20Factory = await hre.ethers.getContractFactory("ERC20Mock");
    tokenA = await ERC20Factory.deploy("TokenA", "TKNA", 18, signer.address);
    await tokenA.deployed();

    tokenB = await ERC20Factory.deploy("TokenB", "TKNB", 18, signer.address);
    await tokenB.deployed();

    // Mint tokens to signer
    await tokenA.mint(signer.address, hre.ethers.utils.parseEther("1000"));
    await tokenB.mint(signer.address, hre.ethers.utils.parseEther("1000"));

    // Approve token for Permit2
    await tokenA.approve(PERMIT2_ADDRESS, hre.ethers.constants.MaxUint256);
    await tokenB.approve(PERMIT2_ADDRESS, hre.ethers.constants.MaxUint256);

    // Add tokens to whitelist
    await dustTokens.addToken(tokenA.address);
    await dustTokens.addToken(tokenB.address);

    // Log the balances
    const balanceA = await tokenA.balanceOf(signer.address);
    const balanceB = await tokenB.balanceOf(signer.address);

    console.log("Token A balance:", balanceA.toString());
    console.log("Token B balance:", balanceB.toString());
  });

  it("should work Permit2App", async function () {
    const tokenAddress = tokenA.address;
    const provider = hre.ethers.provider;

    try {
      // declare needed vars
      const nonce = Math.floor(Math.random() * 1e15); // 1 quadrillion potential nonces
      const deadline = calculateEndTime(30 * 60 * 1000); // 30 minute sig deadline
      // permit amount MUST match passed in signature transfer amount,
      // unlike with AllowanceTransfer where permit amount can be uint160.max
      // while the actual transfer amount can be less.
      const amount = hre.ethers.utils.parseUnits("123", 18);

      // create permit object
      const permit = {
        deadline: deadline,
        nonce: nonce,
        permitted: {
          amount: amount,
          token: tokenAddress,
        },
        spender: dustTokens.address,
      };
      console.log("permit object:", permit);

      // Get the chainId (Sepolia = 11155111)
      const network = await provider.getNetwork();
      const chainId = network.chainId;
      console.log("ChainID:", chainId);

      // Generate the permit return data & sign it
      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        PERMIT2_ADDRESS,
        chainId
      );
      const signature = await signer._signTypedData(domain, types, values);
      console.log("Signature:", signature);

      // Call our `signatureTransfer()` function with correct data and signature
      const tx = await dustTokens.signatureTransfer(
        tokenAddress,
        amount,
        nonce,
        deadline,
        signature
      );
      console.log("Transfer with permit tx sent:", tx.hash);
      await tx.wait();
      console.log("Tx confirmed");

      // Verify the balance
      const balance = await tokenA.balanceOf(dustTokens.address);
      expect(balance).to.equal(amount);

      console.log("Permit2App transfer completed: ", balance);
    } catch (error) {
      console.error("signatureTransfer error:", error);
      throw error;
    }
  });

  it("should work Permit2App batch", async function () {
    const provider = hre.ethers.provider;

    try {
      // declare needed vars
      const nonce = Math.floor(Math.random() * 1e15); // 1 quadrillion potential nonces
      const deadline = calculateEndTime(30 * 60 * 1000); // 30 minute sig deadline
      // permit amount MUST match passed in signature transfer amount,
      // unlike with AllowanceTransfer where permit amount can be uint160.max
      // while the actual transfer amount can be less.

      // Arrays of tokens and amounts
      const tokens = [tokenA, tokenB];
      const amounts = [
        hre.ethers.utils.parseUnits("100", 18),
        hre.ethers.utils.parseUnits("200", 18),
      ];

      // Create the permit object for batched transfers
      const permit = {
        deadline: deadline,
        nonce: nonce,
        permitted: [
          { amount: amounts[0], token: tokens[0].address },
          { amount: amounts[1], token: tokens[1].address },
        ],
        spender: dustTokens.address,
      };

      console.log("permit object:", permit);

      // Get the chainId (Sepolia = 11155111)
      const network = await provider.getNetwork();
      const chainId = network.chainId;
      console.log("ChainID:", chainId);

      // Generate the permit return data & sign it
      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        PERMIT2_ADDRESS,
        chainId
      );
      const signature = await signer._signTypedData(domain, types, values);
      console.log("Signature:", signature);

      // Call our `signatureTransfer()` function with correct data and signature
      const tx = await dustTokens.signatureBatchTransfer(
        tokens.map((t) => t.address),
        amounts,
        nonce,
        deadline,
        signature
      );
      console.log("Transfer with permit tx sent:", tx.hash);
      await tx.wait();
      console.log("Tx confirmed");

      // Verify the balance
      const balanceTokenA = await tokens[0].balanceOf(dustTokens.address);
      // expect(balanceTokenA).to.equal(amounts[0]);

      const balanceTokenB = await tokens[1].balanceOf(dustTokens.address);
      // expect(balanceTokenB).to.equal(amounts[1]);

      console.log(
        "Permit2App transfer completed: ",
        balanceTokenA,
        balanceTokenB
      );
    } catch (error) {
      console.error("signatureTransfer error:", error);
      throw error;
    }
  });

  function calculateEndTime(duration: number) {
    return Math.floor((Date.now() + duration) / 1000);
  }
});
