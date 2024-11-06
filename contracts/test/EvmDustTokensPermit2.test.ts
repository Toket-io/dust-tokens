import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  AllowanceProvider,
  AllowanceTransfer,
  PERMIT2_ADDRESS,
  PermitBatch,
  PermitDetails,
} from "@uniswap/Permit2-sdk";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import hre from "hardhat";

import ContractsConfig from "../../ContractsConfig";
import { EvmDustTokens, SimpleSwap, Swap } from "../typechain-types";

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

const permit2Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

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

    console.log(
      "DustTokens deployed to:",
      GATEWAY_ADDRESS,
      UNISWAP_ROUTER,
      WETH_ADDRESS,
      signer.address,
      permit2Address
    );

    // Deploy EvmDustTokens contract with PERMIT2 address
    const EvmDustTokensFactory = await hre.ethers.getContractFactory(
      "EvmDustTokens"
    );
    dustTokens = await EvmDustTokensFactory.deploy(
      GATEWAY_ADDRESS,
      UNISWAP_ROUTER,
      WETH_ADDRESS,
      signer.address,
      permit2Address
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
    await tokenA.approve(permit2Address, hre.ethers.constants.MaxUint256);
    await tokenB.approve(permit2Address, hre.ethers.constants.MaxUint256);

    // Add tokens to whitelist
    await dustTokens.addToken(tokenA.address);
    await dustTokens.addToken(tokenB.address);

    // Log the balances
    const balanceA = await tokenA.balanceOf(signer.address);
    const balanceB = await tokenB.balanceOf(signer.address);

    console.log("Token A balance:", balanceA.toString());
    console.log("Token B balance:", balanceB.toString());
  });

  it("should transfer tokens using Permit2 batched transfer", async function () {
    const amountA = hre.ethers.utils.parseUnits("1", 18);
    const amountB = hre.ethers.utils.parseUnits("1", 18);

    console.log("Starting batch transfer");

    const nonce = 12;
    const deadline = toDeadline(/* 30 minutes= */ 1000 * 60 * 30);

    const signature = await handlePermit2Approves([tokenA, tokenB]);

    console.log("Permit2 approvals completed: ", signature);

    // Call depositBatchERC20
    await dustTokens.depositBatchERC20(
      [tokenA.address, tokenB.address],
      [amountA, amountB],
      nonce,
      deadline,
      signature
    );

    console.log("Batch transfer completed");

    // Verify the balances
    const balanceA = await tokenA.balanceOf(dustTokens.address);
    const balanceB = await tokenB.balanceOf(dustTokens.address);

    expect(balanceA).to.equal(amountA);
    expect(balanceB).to.equal(amountB);
  });

  function toDeadline(expiration: number): number {
    return Math.floor((Date.now() + expiration) / 1000);
  }

  const handlePermit2Approves = async (tokens: Contract[]) => {
    const spenderAddress = dustTokens.address;
    const user = signer.address;

    const deadline = toDeadline(/* 30 minutes= */ 1000 * 60 * 30);
    const provider = hre.ethers.provider;

    const allowanceProvider = new AllowanceProvider(provider, PERMIT2_ADDRESS);

    // Update the 'tokens.map' function to handle async calls
    const detailsPromises = tokens.map(async (token) => {
      // Fetch allowance data for each token
      const {
        amount: permitAmount,
        expiration,
        nonce,
      } = await allowanceProvider.getAllowanceData(
        user,
        token.address,
        spenderAddress
      );

      // Return the PermitDetails object
      return {
        amount: hre.ethers.utils.parseUnits("1", 18),
        expiration: deadline,
        nonce,
        token: token.address,
      };
    });

    // Wait for all promises to resolve
    const details: PermitDetails[] = await Promise.all(detailsPromises);

    const permitBatch: PermitBatch = {
      details: details,
      sigDeadline: deadline,
      spender: spenderAddress,
    };

    console.log("Permit batch data built: ", permitBatch);

    const chainId = (await provider.getNetwork()).chainId;

    const { domain, types, values } = AllowanceTransfer.getPermitData(
      permitBatch,
      PERMIT2_ADDRESS,
      chainId
    );

    // We use an ethers signer to sign this data:
    const signature = await provider
      .getSigner()
      ._signTypedData(domain, types, values);

    return signature;
  };

  // // Helper function to build permit data
  // async function buildPermitData(tokens: Contract[], amounts: BigNumber[]) {
  //   const permitted = tokens.map((token, index) => {
  //     return {
  //       amount: amounts[index],
  //       token: token.address,
  //     };
  //   });

  //   console.log("Permitted data built");

  //   const permitBatch = {
  //     deadline: Math.floor(Date.now() / 1000) + 3600,
  //     nonce: 0,
  //     permitted: permitted, // 1 hour from now
  //   };

  //   console.log("Permit batch data built");

  //   const transferDetails = tokens.map((token, index) => {
  //     return {
  //       requestedAmount: amounts[index],
  //       to: dustTokens.address,
  //     };
  //   });

  //   console.log("Transfer details built");

  //   // Build the data to sign
  //   const domain = {
  //     chainId: hre.network.config.chainId,
  //     name: "Permit2",
  //     verifyingContract: permit2Address,
  //     version: "1",
  //   };

  //   const types = {
  //     PermitBatchTransferFrom: [
  //       { name: "permitted", type: "PermittedBatch[]" },
  //       { name: "nonce", type: "uint256" },
  //       { name: "deadline", type: "uint256" },
  //     ],
  //     PermittedBatch: [
  //       { name: "token", type: "address" },
  //       { name: "amount", type: "uint256" },
  //     ],
  //   };

  //   const value = permitBatch;

  //   console.log("Data to sign built");

  //   const signature = await signer._signTypedData(domain, types, value);

  //   console.log("Signature built");

  //   return { permit: permitBatch, signature, transferDetails };
  // }
});
