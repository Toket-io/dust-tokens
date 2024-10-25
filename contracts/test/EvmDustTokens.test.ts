import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import hre from "hardhat";

import { EvmDustTokens, Swap } from "../typechain-types";

const DAI_DECIMALS = 18;
const USDC_DECIMALS = 6;

const GATEWAY_ADDRESS: string = process.env.GATEWAY_ADDRESS ?? "";

// Zetachain Contracts
const ZETA_GATEWAY_ADDRESS: string = process.env.ZETA_GATEWAY_ADDRESS ?? "";
const ZETA_SYSTEM_CONTRACT_ADDRESS: string =
  process.env.ZETA_SYSTEM_CONTRACT_ADDRESS ?? "";
const ZETA_USDC_ETH_ADDRESS: string = process.env.ZETA_USDC_ETH ?? "";
const ZETA_ETH_ADDRESS: string = process.env.ZETA_ETH ?? "";

const WETH_ADDRESS: string = process.env.WETH_ADDRESS ?? "";
const DAI_ADDRESS: string = process.env.DAI_ADDRESS ?? "";
const USDC_ADDRESS: string = process.env.USDC_ADDRESS ?? "";
const UNI_ADDRESS = process.env.UNI_ADDRESS ?? "";
const LINK_ADDRESS: string = process.env.LINK_ADDRESS ?? "";
const WBTC_ADDRESS: string = process.env.WBTC_ADDRESS ?? "";

const WETH_PRICE_FEED: string = process.env.WETH_PRICE_FEED ?? "";
const DAI_PRICE_FEED: string = process.env.DAI_PRICE_FEED ?? "";
const WBTC_PRICE_FEED: string = process.env.WBTC_PRICE_FEED ?? "";
const LINK_PRICE_FEED: string = process.env.LINK_PRICE_FEED ?? "";
const ARB_PRICE_FEED: string = process.env.ARB_PRICE_FEED ?? "";

const UNISWAP_ROUTER: string = process.env.UNISWAP_ROUTER ?? "";

const ercAbi = [
  // Read-Only Functions
  "function balanceOf(address owner) view returns (uint256)",
  // Authenticated Functions
  "function transfer(address to, uint amount) returns (bool)",
  "function deposit() public payable",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function withdraw(uint256 wad) external",
];

describe("EvmDustTokens", function () {
  let signer: SignerWithAddress;
  let receiver: SignerWithAddress;

  // EVM side Contracts
  let dustTokens: EvmDustTokens;
  let WETH: Contract;
  let DAI: Contract;
  let USDC: Contract;
  let LINK: Contract;
  let UNI: Contract;
  let WBTC: Contract;
  let startBalances: Object;

  // ZetaChain side Contracts
  let universalApp: Swap;
  let ZETA_USDC_ETH: Contract;
  let ZETA_ETH: Contract;

  this.beforeAll(async function () {
    // Save Signer
    let signers = await hre.ethers.getSigners();
    signer = signers[0];

    receiver = signers[1];

    // Deploy the DustTokens contract
    const evmDustTokensFactory = await hre.ethers.getContractFactory(
      "EvmDustTokens"
    );
    dustTokens = await evmDustTokensFactory.deploy(
      GATEWAY_ADDRESS,
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
    UNI = new hre.ethers.Contract(UNI_ADDRESS, ercAbi, signer);
    WBTC = new hre.ethers.Contract(WBTC_ADDRESS, ercAbi, signer);

    // Connect to ZetaChain contracts
    // Deploy the Universal App contract
    const universalAppFactory = await hre.ethers.getContractFactory("Swap");
    universalApp = await universalAppFactory.deploy(
      ZETA_SYSTEM_CONTRACT_ADDRESS,
      ZETA_GATEWAY_ADDRESS
    );
    await universalApp.deployed();

    // Connect to ERC20s
    ZETA_USDC_ETH = new hre.ethers.Contract(
      ZETA_USDC_ETH_ADDRESS,
      ercAbi,
      signer
    );
    ZETA_ETH = new hre.ethers.Contract(ZETA_ETH_ADDRESS, ercAbi, signer);
  });

  this.beforeEach(async function () {
    // Fund signer with some WETH
    const depositWETH = await WETH.deposit({
      value: hre.ethers.utils.parseEther("10"),
    });
    await depositWETH.wait();

    const balances = {
      dai: await DAI.balanceOf(signer.address),
      link: await LINK.balanceOf(signer.address),
      nativeEth: await signer.getBalance(),
      uni: await UNI.balanceOf(signer.address),
      usdc: await USDC.balanceOf(signer.address),
      wbtc: await WBTC.balanceOf(signer.address),
      weth: await WETH.balanceOf(signer.address),
      zeta_eth: await ZETA_ETH.balanceOf(signer.address),
      zeta_usdc_eth: await ZETA_USDC_ETH.balanceOf(signer.address),
    };

    const formattedBalances = {
      dai: Number(hre.ethers.utils.formatUnits(balances.dai, DAI_DECIMALS)),
      link: Number(hre.ethers.utils.formatUnits(balances.link, DAI_DECIMALS)),
      nativeEth: Number(
        hre.ethers.utils.formatUnits(balances.nativeEth, DAI_DECIMALS)
      ),
      uni: Number(hre.ethers.utils.formatUnits(balances.uni, DAI_DECIMALS)),
      usdc: Number(hre.ethers.utils.formatUnits(balances.usdc, USDC_DECIMALS)),
      wbtc: Number(hre.ethers.utils.formatUnits(balances.wbtc, DAI_DECIMALS)),
      weth: Number(hre.ethers.utils.formatUnits(balances.weth, DAI_DECIMALS)),
      zeta_eth: Number(
        hre.ethers.utils.formatUnits(balances.zeta_eth, DAI_DECIMALS)
      ),
      zeta_usdc_eth: Number(
        hre.ethers.utils.formatUnits(balances.zeta_usdc_eth, DAI_DECIMALS)
      ),
    };

    console.log(
      "\n-------\n Start Balances: ",
      formattedBalances,
      "\n-------\n"
    );

    startBalances = formattedBalances;
  });

  it("Should withdraw WETH", async function () {
    // Withdraw some WETH
    const swapAmount = "1";
    const amount = hre.ethers.utils.parseEther(swapAmount);
    const withdrawWETH = await WETH.withdraw(amount);
    await withdrawWETH.wait();

    // Check native ETH balance
    const expandedNativeEthBalanceAfter = await signer.getBalance();
    const nativeEthBalanceAfter = Number(
      hre.ethers.utils.formatUnits(expandedNativeEthBalanceAfter, DAI_DECIMALS)
    );

    const nativeEthBalanceBefore = startBalances["nativeEth"];
    const diff = nativeEthBalanceBefore - nativeEthBalanceAfter;

    console.log(
      `Native ETH balance - Before: ${nativeEthBalanceBefore}, After: ${nativeEthBalanceAfter}, Diff: ${diff}`
    );

    expect(nativeEthBalanceAfter).is.greaterThan(nativeEthBalanceBefore);

    // Check WETH balance
    const expandedWETHBalanceAfter = await WETH.balanceOf(signer.address);
    const WETHBalanceAfter = Number(
      hre.ethers.utils.formatUnits(expandedWETHBalanceAfter, DAI_DECIMALS)
    );
    const WETHBalanceBefore = startBalances["weth"];
    const WETHDiff = WETHBalanceBefore - WETHBalanceAfter;
    console.log(
      `WETH balance - Before: ${WETHBalanceBefore}, After: ${WETHBalanceAfter}, Diff: ${WETHDiff}`
    );
    // Ensure the WETH balance increased after the swap
    expect(WETHBalanceBefore).to.be.greaterThan(WETHBalanceAfter);

    // Ensure the difference matches the swap amount
    expect(WETHDiff).to.equal(Number(swapAmount));
  });

  it("Should swap WETH for DAI", async function () {
    const swapAmount = "0.1";
    const amountIn = hre.ethers.utils.parseEther(swapAmount);

    /* Approve WETH */
    const approveTx = await WETH.approve(dustTokens.address, amountIn);
    await approveTx.wait();
    console.log("WETH approved for SimpleSwap");

    /* Execute the swap */
    console.log("Swapping WETH for DAI:", swapAmount);
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
    console.log("Swapping WETH for USDC:", swapAmount);
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
    console.log("USDC balance after swap:", USDCBalanceAfter);

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
    console.log("Swapping WETH for LINK:", swapAmount);
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
    console.log("LINK balance after swap:", LINKBalanceAfter);

    expect(LINKBalanceAfter).is.greaterThan(startBalances["link"]);
  });

  it("Should swap WETH for UNI", async function () {
    const swapAmount = "0.1";
    const amountIn = hre.ethers.utils.parseEther(swapAmount);

    /* Approve WETH */
    const approveTx = await WETH.approve(dustTokens.address, amountIn);
    await approveTx.wait();
    console.log("WETH approved for SimpleSwap");

    /* Execute the swap */
    console.log("Swapping WETH for UNI:", swapAmount);
    const swapTx = await dustTokens.swapWETHForUNI(amountIn, {
      gasLimit: 300000,
    });

    await swapTx.wait();
    console.log("Swap executed");

    expect(swapTx).not.reverted;

    /* Check UNI end balance */
    const expandedUNIBalanceAfter = await UNI.balanceOf(signer.address);
    const UNIBalanceAfter = Number(
      hre.ethers.utils.formatUnits(expandedUNIBalanceAfter, DAI_DECIMALS)
    );
    console.log("UNI balance after swap:", UNIBalanceAfter);

    expect(UNIBalanceAfter).is.greaterThan(startBalances["uni"]);
  });

  it("Should swap WETH for WBTC", async function () {
    const swapAmount = "1";
    const amountIn = hre.ethers.utils.parseEther(swapAmount);

    /* Approve WETH */
    const currentBalance = await WETH.balanceOf(signer.address);
    console.log(
      "Current WETH balance:",
      hre.ethers.utils.formatUnits(currentBalance, DAI_DECIMALS)
    );
    const approveTx = await WETH.approve(dustTokens.address, amountIn);
    await approveTx.wait();
    console.log("WETH approved for SimpleSwap");

    /* Execute the swap */
    console.log("Swapping WETH for WBTC:", swapAmount);
    const swapTx = await dustTokens.swapWETHForWBTC(amountIn);

    await swapTx.wait();
    console.log("Swap executed");

    expect(swapTx).not.reverted;

    /* Check WBTC end balance */
    const expandedWBTCBalanceAfter = await WBTC.balanceOf(signer.address);
    const WBTCBalanceAfter = Number(
      hre.ethers.utils.formatUnits(expandedWBTCBalanceAfter, DAI_DECIMALS)
    );
    console.log("WBTC balance after swap:", WBTCBalanceAfter);

    expect(WBTCBalanceAfter).is.greaterThan(startBalances["wbtc"]);
  });

  it("Should swap all tokens for WETH", async function () {
    // AMOUNT TO SWAP
    const swapAmount = "1";

    // ERC-20 Contracts to be swapped, with their names
    const ercContracts = [
      { contract: DAI, decimals: DAI_DECIMALS, name: "DAI" },
      { contract: USDC, decimals: USDC_DECIMALS, name: "USDC" },
      { contract: LINK, decimals: DAI_DECIMALS, name: "LINK" }, // Assuming LINK uses the same decimals as DAI
      { contract: UNI, decimals: DAI_DECIMALS, name: "UNI" }, // Assuming LINK uses the same decimals as DAI
      //   { contract: WBTC, decimals: DAI_DECIMALS, name: "WBTC" }, // Assuming LINK uses the same decimals as DAI
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

    // Check WETH balance
    const expandedWETHBalanceAfter = await WETH.balanceOf(signer.address);
    const WETHBalanceAfter = Number(
      hre.ethers.utils.formatUnits(expandedWETHBalanceAfter, DAI_DECIMALS)
    );
    const WETHBalanceBefore = startBalances["weth"];
    console.log(
      `WETH balance - Before: ${WETHBalanceBefore}, After: ${WETHBalanceAfter}, Diff: ${
        WETHBalanceBefore - WETHBalanceAfter
      }`
    );
    // Ensure the WETH balance increased after the swap
    expect(WETHBalanceAfter).to.be.greaterThan(WETHBalanceBefore);
  });

  it("Should swap all tokens for NATIVE ETH", async function () {
    // AMOUNT TO SWAP
    const swapAmount = "1";

    const expandedWETHBalanceBefore = await WETH.balanceOf(dustTokens.address);
    const WETHBalanceBefore = Number(
      hre.ethers.utils.formatUnits(expandedWETHBalanceBefore, DAI_DECIMALS)
    );

    // ERC-20 Contracts to be swapped, with their names
    const ercContracts = [
      { contract: DAI, decimals: DAI_DECIMALS, name: "DAI" },
      { contract: USDC, decimals: USDC_DECIMALS, name: "USDC" },
      { contract: LINK, decimals: DAI_DECIMALS, name: "LINK" }, // Assuming LINK uses the same decimals as DAI
      { contract: UNI, decimals: DAI_DECIMALS, name: "UNI" }, // Assuming LINK uses the same decimals as DAI
      //   { contract: WBTC, decimals: DAI_DECIMALS, name: "WBTC" }, // Assuming LINK uses the same decimals as DAI
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
    const swapTx = await dustTokens.executeMultiSwapAndWithdraw(tokenAddresses);
    await swapTx.wait();
    console.log("MultiSwap and withdraw executed");

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
      expect(diff).to.greaterThanOrEqual(Number(swapAmount) * 0.99);
    }

    // CONTRACT WETH BALANCE
    const expandedWETHBalanceAfter = await WETH.balanceOf(dustTokens.address);
    const WETHBalanceAfter = Number(
      hre.ethers.utils.formatUnits(expandedWETHBalanceAfter, DAI_DECIMALS)
    );

    console.log(
      `WETH balance - Before: ${WETHBalanceBefore}, After: ${WETHBalanceAfter}, Diff: ${
        WETHBalanceBefore - WETHBalanceAfter
      }`
    );

    // Check native balance
    const expandedNativeEthBalanceAfter = await signer.getBalance();
    const nativeEthBalanceAfter = Number(
      hre.ethers.utils.formatUnits(expandedNativeEthBalanceAfter, DAI_DECIMALS)
    );

    const nativeEthBalanceBefore = startBalances["nativeEth"];
    const diff = nativeEthBalanceBefore - nativeEthBalanceAfter;

    console.log(
      `Native ETH balance - Before: ${nativeEthBalanceBefore}, After: ${nativeEthBalanceAfter}, Diff: ${diff}`
    );

    expect(nativeEthBalanceAfter).is.greaterThan(nativeEthBalanceBefore);
  });

  it("Should swap all tokens for USDC", async function () {
    // AMOUNT TO SWAP
    const swapAmount = "1";

    const expandedUSDCBalanceBefore = await USDC.balanceOf(signer.address);
    const USDCBalanceBefore = Number(
      hre.ethers.utils.formatUnits(expandedUSDCBalanceBefore, USDC_DECIMALS)
    );

    // ERC-20 Contracts to be swapped, with their names
    const ercContracts = [
      { contract: DAI, decimals: DAI_DECIMALS, name: "DAI" },
      { contract: WETH, decimals: DAI_DECIMALS, name: "WETH" },
      { contract: LINK, decimals: DAI_DECIMALS, name: "LINK" },
      { contract: UNI, decimals: DAI_DECIMALS, name: "UNI" },
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
    const swapTx = await dustTokens.executeMultiSwapAndWithdrawUSDC(
      tokenAddresses
    );
    const receipt = await swapTx.wait(); // Wait for the transaction to be mined

    // Extract the totalReceived value from the emitted event
    const event = receipt.events?.find(
      (e) => e.event === "MultiSwapExecutedAndWithdrawn"
    );
    const totalReceived = event?.args?.totalWethReceived;
    const formmateTotalReceived = hre.ethers.utils.formatUnits(
      totalReceived,
      USDC_DECIMALS
    );

    console.log(`Total received in USDC: ${formmateTotalReceived}`);

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
      expect(diff).to.greaterThanOrEqual(Number(swapAmount) * 0.99);
    }

    // CONTRACT WETH BALANCE
    const expandedUSDCBalanceAfter = await USDC.balanceOf(signer.address);
    const USDCBalanceAfter = Number(
      hre.ethers.utils.formatUnits(expandedUSDCBalanceAfter, USDC_DECIMALS)
    );
    const USDCDiff = USDCBalanceBefore - USDCBalanceAfter;

    console.log(
      `USDC balance - Before: ${USDCBalanceBefore}, After: ${USDCBalanceAfter}, Diff: ${USDCDiff}`
    );

    expect(USDCBalanceAfter).is.greaterThan(USDCBalanceBefore);
  });

  it("Should deposit and withdraw WETH from contract", async function () {
    const depositAmount = hre.ethers.utils.parseEther("0.5");
    const withdrawAmount = hre.ethers.utils.parseEther("0.5");

    const signerBalanceBefore = await receiver.getBalance();

    console.log(
      "Signer ETH Balance before deposit:",
      signerBalanceBefore.toString()
    );

    // Perform deposit
    const depositTx = await dustTokens.TestDeposit({ value: depositAmount });
    await depositTx.wait();

    // Verify balance after deposit
    const wethBalance = await dustTokens.TestGetBalance();
    expect(wethBalance).to.equal(depositAmount);

    // Perform withdrawal
    const withdrawTx = await dustTokens.TestWithdrawToCaller(
      receiver.address,
      withdrawAmount
    );
    await withdrawTx.wait();

    // Check if ETH has been transferred correctly (you may need a helper to check balance)
    const contractBalanceAfter = await dustTokens.TestGetBalance();

    console.log(
      "Contract ETH Balance after withdrawal:",
      contractBalanceAfter.toString()
    );

    // Check if the contract balance is 0
    expect(contractBalanceAfter).to.equal(0);

    // Check if the signer balance has increased
    const signerBalanceAfter = await receiver.getBalance();
    console.log(
      "Signer ETH Balance after withdrawal:",
      signerBalanceAfter.toString()
    );

    // Check signer balance diff (should be equal to the withdraw amount)
    const diff = signerBalanceAfter.sub(signerBalanceBefore);

    console.log("Diff:", hre.ethers.utils.formatEther(diff));

    // Check if the signer balance has increased
    expect(diff).to.be.equal(withdrawAmount);
  });

  it("Should swap all tokens for USDC and deposit in Gateway", async function () {
    // AMOUNT TO SWAP
    const swapAmount = "1";

    const expandedUSDCBalanceBefore = await USDC.balanceOf(signer.address);
    const USDCBalanceBefore = Number(
      hre.ethers.utils.formatUnits(expandedUSDCBalanceBefore, USDC_DECIMALS)
    );

    // ERC-20 Contracts to be swapped, with their names
    const ercContracts = [
      { contract: DAI, decimals: DAI_DECIMALS, name: "DAI" },
      { contract: WETH, decimals: DAI_DECIMALS, name: "WETH" },
      { contract: LINK, decimals: DAI_DECIMALS, name: "LINK" },
      { contract: UNI, decimals: DAI_DECIMALS, name: "UNI" },
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
    const swapTx = await dustTokens.multiSwapAndDepositAndCall(tokenAddresses);
    const receipt = await swapTx.wait(); // Wait for the transaction to be mined

    // Extract the totalReceived value from the emitted event
    const event = receipt.events?.find(
      (e) => e.event === "MultiSwapExecutedAndWithdrawn"
    );
    const totalReceived = event?.args?.totalWethReceived;
    const formmateTotalReceived = hre.ethers.utils.formatUnits(
      totalReceived,
      USDC_DECIMALS
    );

    console.log(`Total received in USDC: ${formmateTotalReceived}`);

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
      expect(diff).to.greaterThanOrEqual(Number(swapAmount) * 0.99);
    }

    // CONTRACT WETH BALANCE
    const expandedUSDCBalanceAfter = await USDC.balanceOf(signer.address);
    const USDCBalanceAfter = Number(
      hre.ethers.utils.formatUnits(expandedUSDCBalanceAfter, USDC_DECIMALS)
    );
    const USDCDiff = USDCBalanceBefore - USDCBalanceAfter;

    console.log(
      `USDC balance - Before: ${USDCBalanceBefore}, After: ${USDCBalanceAfter}, Diff: ${USDCDiff}`
    );

    expect(USDCBalanceAfter).is.greaterThan(USDCBalanceBefore);
  });

  it("Test deposit directly", async function () {
    const depositAmount = hre.ethers.utils.parseEther("0.5");
    const tx = await dustTokens.TestGatewayDeposit(signer.address, {
      value: depositAmount,
    });
    await tx.wait();
    expect(tx).not.reverted;

    // Wait for 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if ZETA_ETH balance has increased
    const expandedZETA_ETHBalanceAfter = await ZETA_ETH.balanceOf(
      signer.address
    );
    const ZETA_ETHBalanceAfter = Number(
      hre.ethers.utils.formatUnits(expandedZETA_ETHBalanceAfter, DAI_DECIMALS)
    );

    const ZETA_ETHBalanceBefore = startBalances["zeta_eth"];
    const ZETA_ETHDiff = ZETA_ETHBalanceAfter - ZETA_ETHBalanceBefore;
    console.log(
      `ZETA_ETH balance - Before: ${ZETA_ETHBalanceBefore}, After: ${ZETA_ETHBalanceAfter}, Diff: ${ZETA_ETHDiff}`
    );

    // Ensure the ZETA_ETH balance increased after the deposit
    expect(ZETA_ETHBalanceAfter).to.be.greaterThan(ZETA_ETHBalanceBefore);
    expect(ZETA_ETHDiff).to.equal(
      Number(hre.ethers.utils.formatEther(depositAmount))
    );
  });

  it("Test deposit and call directly", async function () {
    const depositAmount = hre.ethers.utils.parseEther("0.5");

    const args = {
      amount: "10",
      erc20: null,
      gatewayEvm: GATEWAY_ADDRESS,
      receiver: universalApp.address,
      revertOptions: {
        callOnRevert: false,
        onRevertGasLimit: 7000000,
        revertAddress: "0x0000000000000000000000000000000000000000",
        revertMessage: "0x",
      },
      txOptions: {
        gasLimit: 1000000,
        gasPrice: {
          hex: "0x3b9aca00",
          type: "BigNumber",
        },
      },
      types: ["address", "bytes"],
      values: [ZETA_USDC_ETH_ADDRESS, signer.address],
    };

    const revertOptions = {
      abortAddress: "0x0000000000000000000000000000000000000000", // not used
      callOnRevert: args.revertOptions.callOnRevert,
      onRevertGasLimit: args.revertOptions.onRevertGasLimit,
      revertAddress: args.revertOptions.revertAddress,
      revertMessage: hre.ethers.utils.hexlify(
        hre.ethers.utils.toUtf8Bytes(args.revertOptions.revertMessage)
      ),
    };

    // Prepare encoded parameters for the call
    const valuesArray = args.values.map((value, index) => {
      const type = args.types[index];
      if (type === "bool") {
        try {
          return JSON.parse(value.toLowerCase());
        } catch (e) {
          throw new Error(`Invalid boolean value: ${value}`);
        }
      } else if (type.startsWith("uint") || type.startsWith("int")) {
        return hre.ethers.BigNumber.from(value);
      } else {
        return value;
      }
    });

    const encodedParameters = hre.ethers.utils.defaultAbiCoder.encode(
      args.types,
      valuesArray
    );

    const tx = await dustTokens.TestGatewayDepositAndCall(
      universalApp.address,
      encodedParameters,
      revertOptions,
      {
        value: depositAmount,
      }
    );
    await tx.wait();

    expect(tx).not.reverted;

    // Wait for 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if USDC balance has increased
    const expandedUSDCBalanceAfter = await USDC.balanceOf(signer.address);
    const UsdcBalanceAfter = Number(
      hre.ethers.utils.formatUnits(expandedUSDCBalanceAfter, USDC_DECIMALS)
    );
    const UsdcBalanceBefore = startBalances["usdc"];
    const UsdcDiff = UsdcBalanceAfter - UsdcBalanceBefore;

    console.log(
      `USDC balance - Before: ${UsdcBalanceBefore}, After: ${UsdcBalanceAfter}, Diff: ${UsdcDiff}`
    );

    expect(UsdcBalanceAfter).is.greaterThan(UsdcBalanceBefore);
  });

  it.only("SwapAndBridgeTokens", async function () {
    const args = {
      amount: "10",
      erc20: null,
      gatewayEvm: GATEWAY_ADDRESS,
      receiver: universalApp.address,
      revertOptions: {
        callOnRevert: false,
        onRevertGasLimit: 7000000,
        revertAddress: "0x0000000000000000000000000000000000000000",
        revertMessage: "0x",
      },
      txOptions: {
        gasLimit: 1000000,
        gasPrice: {
          hex: "0x3b9aca00",
          type: "BigNumber",
        },
      },
      types: ["address", "bytes"],
      values: [ZETA_USDC_ETH_ADDRESS, signer.address],
    };

    const revertOptions = {
      abortAddress: "0x0000000000000000000000000000000000000000", // not used
      callOnRevert: args.revertOptions.callOnRevert,
      onRevertGasLimit: args.revertOptions.onRevertGasLimit,
      revertAddress: args.revertOptions.revertAddress,
      revertMessage: hre.ethers.utils.hexlify(
        hre.ethers.utils.toUtf8Bytes(args.revertOptions.revertMessage)
      ),
    };

    // Prepare encoded parameters for the call
    const valuesArray = args.values.map((value, index) => {
      const type = args.types[index];
      if (type === "bool") {
        try {
          return JSON.parse(value.toLowerCase());
        } catch (e) {
          throw new Error(`Invalid boolean value: ${value}`);
        }
      } else if (type.startsWith("uint") || type.startsWith("int")) {
        return hre.ethers.BigNumber.from(value);
      } else {
        return value;
      }
    });

    const encodedParameters = hre.ethers.utils.defaultAbiCoder.encode(
      args.types,
      valuesArray
    );

    // Tokens lists
    // ERC-20 Contracts to be swapped, with their names
    const ercContracts = [
      { amount: "1.1", contract: DAI, decimals: DAI_DECIMALS, name: "DAI" },
      { amount: "1.2", contract: USDC, decimals: USDC_DECIMALS, name: "USDC" },
      { amount: "1.3", contract: LINK, decimals: DAI_DECIMALS, name: "LINK" }, // Assuming LINK uses the same decimals as DAI
      { amount: "1.4", contract: UNI, decimals: DAI_DECIMALS, name: "UNI" }, // Assuming LINK uses the same decimals as DAI
      //   { contract: WBTC, decimals: DAI_DECIMALS, name: "WBTC" }, // Assuming LINK uses the same decimals as DAI
    ];

    // Approve the MultiSwap contract to spend tokens
    for (const { amount, name, contract, decimals } of ercContracts) {
      const formattedAmount = hre.ethers.utils.parseUnits(amount, decimals);

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
      // beforeBalances[`${name}-original`] = balance;
      // beforeBalances[`${name}-formatted`] = Number(
      //   hre.ethers.utils.parseUnits(`${beforeBalances[name]}`, decimals)
      // );
    }

    // console.log("Before Balances:", beforeBalances);

    // Execute the swap
    type TokenSwap = {
      amount: BigNumber;
      token: string;
    };
    const tokenSwaps: TokenSwap[] = ercContracts.map(
      ({ amount, decimals, contract }) => {
        const formattedAmount = hre.ethers.utils.parseUnits(amount, decimals);
        const token: TokenSwap = {
          amount: formattedAmount,
          token: contract.address,
        };
        return token;
      }
    );

    // console.log("Token Swaps:", tokenSwaps);

    const tx = await dustTokens.SwapAndBridgeTokens(
      tokenSwaps,
      universalApp.address,
      encodedParameters,
      revertOptions
    );
    await tx.wait();

    expect(tx).not.reverted;
  });
});
