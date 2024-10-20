import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import hre from "hardhat";

import { EvmDustTokens } from "../typechain-types";

const UNI_ADDRESS = process.env.UNI_ADDRESS ?? "";
const UNI_PRICE_FEED = process.env.UNI_PRICE_FEED ?? "";

const DAI_DECIMALS = 18;
const USDC_DECIMALS = 6;

const WETH_ADDRESS: string = process.env.WETH_ADDRESS ?? "";
const DAI_ADDRESS: string = process.env.DAI_ADDRESS ?? "";
const USDC_ADDRESS: string = process.env.USDC_ADDRESS ?? "";
const WBTC_ADDRESS: string = process.env.WBTC_ADDRESS ?? "";
const LINK_ADDRESS: string = process.env.LINK_ADDRESS ?? "";
const ARB_ADDRESS: string = process.env.ARB_ADDRESS ?? "";

const WETH_PRICE_FEED: string = process.env.WETH_PRICE_FEED ?? "";
const DAI_PRICE_FEED: string = process.env.DAI_PRICE_FEED ?? "";
const WBTC_PRICE_FEED: string = process.env.WBTC_PRICE_FEED ?? "";
const LINK_PRICE_FEED: string = process.env.LINK_PRICE_FEED ?? "";
const ARB_PRICE_FEED: string = process.env.ARB_PRICE_FEED ?? "";

const GELATO_AUTOMATE: string = process.env.GELATO_AUTOMATE ?? "";
const UNISWAP_ROUTER: string = process.env.UNISWAP_ROUTER ?? "";

const GELATO_PAYMENT_TOKEN: string = process.env.GELATO_PAYMENT_TOKEN ?? "";

const ercAbi = [
  // Read-Only Functions
  "function balanceOf(address owner) view returns (uint256)",
  // Authenticated Functions
  "function transfer(address to, uint amount) returns (bool)",
  "function deposit() public payable",
  "function approve(address spender, uint256 amount) returns (bool)",
];

describe("EvmDustTokens", function () {
  let signer: SignerWithAddress;
  let dustTokens: EvmDustTokens;
  let WETH: Contract;
  let DAI: Contract;
  let USDC: Contract;
  let LINK: Contract;
  let startBalances: Object;

  this.beforeAll(async function () {
    // Save Signer
    let signers = await hre.ethers.getSigners();
    signer = signers[0];

    // Deploy the DustTokens contract
    const evmDustTokensFactory = await hre.ethers.getContractFactory(
      "EvmDustTokens"
    );
    dustTokens = await evmDustTokensFactory.deploy(
      UNISWAP_ROUTER,
      DAI_ADDRESS,
      WETH_ADDRESS,
      USDC_ADDRESS,
      LINK_ADDRESS,
      UNI_ADDRESS,
      WBTC_ADDRESS
    );
    await dustTokens.deployed();

    // Connect to ERC20s
    WETH = new hre.ethers.Contract(WETH_ADDRESS, ercAbi, signer);
    DAI = new hre.ethers.Contract(DAI_ADDRESS, ercAbi, signer);
    USDC = new hre.ethers.Contract(USDC_ADDRESS, ercAbi, signer);
    LINK = new hre.ethers.Contract(LINK_ADDRESS, ercAbi, signer);

    const balances = {
      dai: await DAI.balanceOf(signer.address),
      link: await LINK.balanceOf(signer.address),
      usdc: await USDC.balanceOf(signer.address),
      weth: await WETH.balanceOf(signer.address),
    };

    const formattedBalances = {
      dai: Number(hre.ethers.utils.formatUnits(balances.dai, DAI_DECIMALS)),
      link: Number(hre.ethers.utils.formatUnits(balances.link, DAI_DECIMALS)),
      usdc: Number(hre.ethers.utils.formatUnits(balances.usdc, USDC_DECIMALS)),
      weth: Number(hre.ethers.utils.formatUnits(balances.weth, DAI_DECIMALS)),
    };

    console.log(
      "\n-------\n Start Balances: ",
      formattedBalances,
      "\n-------\n"
    );

    startBalances = formattedBalances;
  });

  this.beforeEach(async function () {
    // Fund signer with some WETH and USDC
    let signers = await hre.ethers.getSigners();
    const signer = signers[0];

    const WETH = new hre.ethers.Contract(WETH_ADDRESS, ercAbi, signer);

    // const wethBalanceBefore = await WETH.balanceOf(signer.address);

    const depositWETH = await WETH.deposit({
      value: hre.ethers.utils.parseEther("100"),
    });
    await depositWETH.wait();

    // const wethBalanceAfter = await WETH.balanceOf(signer.getAddress());

    // console.log(
    //   `WETH balance before: ${wethBalanceBefore} - WETH balance after: ${wethBalanceAfter}`
    // );

    // const simpleSwapFactory = await hre.ethers.getContractFactory("SimpleSwap");
    // const simpleSwap = await simpleSwapFactory.deploy(
    //   UNISWAP_ROUTER,
    //   DAI_ADDRESS,
    //   WETH_ADDRESS,
    //   USDC_ADDRESS
    // ); // Ensure the contract is deployed
    // simpleSwap.waitForDeployment();

    // /* Approve the swapper contract to spend WETH for me */
    // const approveTx = await WETH.approve(
    //   simpleSwap.getAddress(),
    //   hre.ethers.utils.parseEther("0.2")
    // );
    // await approveTx.wait();

    // const amountIn = hre.ethers.utils.parseEther("0.2");
    // const swapTx = await simpleSwap.swapWETHForUSDC(amountIn, {
    //   gasLimit: 300000,
    // });
    // await swapTx.wait();

    // const usdcBalanceAfter = await USDC.balanceOf(signer.address);
    // const usdcBalanceAfterFormatted = Number(
    //   hre.ethers.utils.formatUnits(usdcBalanceAfter, USDC_DECIMALS)
    // );
  });

  it("Should swap WETH for DAI", async function () {
    const swapAmount = "0.1";
    const amountIn = hre.ethers.utils.parseEther(swapAmount);

    /* Approve WETH */
    const approveTx = await WETH.approve(dustTokens.address, amountIn);
    await approveTx.wait();
    console.log("WETH approved for SimpleSwap");

    /* Execute the swap */
    console.log("Swapping WETH for DAI:", amountIn.toString());
    const swapTx = await dustTokens.swapWETHForDAI(amountIn, {
      gasLimit: 300000,
    });

    await swapTx.wait();
    console.log("Swap executed");

    expect(swapTx).not.reverted;

    /* Check DAI end balance */
    const expandedDAIBalanceAfter = await DAI.balanceOf(signer.address);
    const DAIBalanceAfter = Number(
      hre.ethers.utils.formatUnits(expandedDAIBalanceAfter, DAI_DECIMALS)
    );
    console.log("DAI balance after swap:", DAIBalanceAfter);

    expect(DAIBalanceAfter).is.greaterThan(startBalances["dai"]);
  });

  it("Should swap WETH for USDC", async function () {
    const swapAmount = "0.1";
    const amountIn = hre.ethers.utils.parseEther(swapAmount);

    /* Approve WETH */
    const approveTx = await WETH.approve(dustTokens.address, amountIn);
    await approveTx.wait();
    console.log("WETH approved for SimpleSwap");

    /* Execute the swap */
    console.log("Swapping WETH for USDC:", amountIn.toString());
    const swapTx = await dustTokens.swapWETHForUSDC(amountIn, {
      gasLimit: 300000,
    });

    await swapTx.wait();
    console.log("Swap executed");

    expect(swapTx).not.reverted;

    /* Check USDC end balance */
    const expandedUSDCBalanceAfter = await USDC.balanceOf(signer.address);
    const USDCBalanceAfter = Number(
      hre.ethers.utils.formatUnits(expandedUSDCBalanceAfter, USDC_DECIMALS)
    );
    console.log("DAI balance after swap:", USDCBalanceAfter);

    expect(USDCBalanceAfter).is.greaterThan(startBalances["usdc"]);
  });

  it("Should swap WETH for LINK", async function () {
    const swapAmount = "0.1";
    const amountIn = hre.ethers.utils.parseEther(swapAmount);

    /* Approve WETH */
    const approveTx = await WETH.approve(dustTokens.address, amountIn);
    await approveTx.wait();
    console.log("WETH approved for SimpleSwap");

    /* Execute the swap */
    console.log("Swapping WETH for LINK:", amountIn.toString());
    const swapTx = await dustTokens.swapWETHForLINK(amountIn, {
      gasLimit: 300000,
    });

    await swapTx.wait();
    console.log("Swap executed");

    expect(swapTx).not.reverted;

    /* Check LINK end balance */
    const expandedLINKBalanceAfter = await LINK.balanceOf(signer.address);
    const LINKBalanceAfter = Number(
      hre.ethers.utils.formatUnits(expandedLINKBalanceAfter, DAI_DECIMALS)
    );
    console.log("DAI balance after swap:", LINKBalanceAfter);

    expect(LINKBalanceAfter).is.greaterThan(startBalances["link"]);
  });

  it("Should swap all tokens for WETH", async function () {
    // AMOUNT TO SWAP
    const swapAmount = "1";

    // ERC-20 Contracts to be swapped, with their names
    const ercContracts = [
      { contract: DAI, decimals: DAI_DECIMALS, name: "DAI" },
      { contract: USDC, decimals: USDC_DECIMALS, name: "USDC" },
      { contract: LINK, decimals: DAI_DECIMALS, name: "LINK" }, // Assuming LINK uses the same decimals as DAI
    ];

    // Approve the MultiSwap contract to spend tokens
    for (const { name, contract, decimals } of ercContracts) {
      const formattedAmount = hre.ethers.utils.parseUnits(swapAmount, decimals);

      const approveTx = await contract.approve(
        dustTokens.address,
        formattedAmount
      );
      await approveTx.wait();

      console.log(`${name} approved for MultiSwap`);
    }

    // Check Initial Balances
    const beforeBalances = {};
    for (const { name, contract, decimals } of ercContracts) {
      const balance = await contract.balanceOf(signer.address);
      beforeBalances[name] = Number(
        hre.ethers.utils.formatUnits(balance, decimals)
      );
    }

    // Execute the swap
    const tokenAddresses = ercContracts.map(({ contract }) => contract.address);
    const swapTx = await dustTokens.executeMultiSwap(tokenAddresses);
    await swapTx.wait();
    console.log("MultiSwap executed");

    // Check Result Balances
    const afterBalances = {};
    for (const { name, contract, decimals } of ercContracts) {
      const balance = await contract.balanceOf(signer.address);
      afterBalances[name] = Number(
        hre.ethers.utils.formatUnits(balance, decimals)
      );
    }

    // Log the balance differences
    for (const { name } of ercContracts) {
      const before = beforeBalances[name];
      const after = afterBalances[name];
      console.log(
        `${name} balance - Before: ${before}, After: ${after}, Diff: ${
          before - after
        }`
      );
    }

    // Assertions: Ensure each token's balance decreased after the swap
    for (const { name } of ercContracts) {
      const diff = beforeBalances[name] - afterBalances[name];

      // Ensure the final balance is less than the initial balance
      expect(afterBalances[name]).to.be.lessThan(beforeBalances[name]);

      // Ensure the difference matches the swap amount
      expect(diff).to.equal(Number(swapAmount));
    }
  });
});
