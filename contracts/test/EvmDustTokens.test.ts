import { expect } from "chai";
import hre from "hardhat";

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

  it("Should provide a caller with more DAI than they started with after a swap", async function () {
    /* Deploy the SimpleSwap contract */
    const simpleSwapFactory = await hre.ethers.getContractFactory(
      "EvmDustTokens"
    );
    const simpleSwap = await simpleSwapFactory.deploy(
      UNISWAP_ROUTER,
      DAI_ADDRESS,
      WETH_ADDRESS,
      USDC_ADDRESS
    ); // Ensure the contract is deployed
    console.log("SimpleSwap deployed to:", await simpleSwap.address);

    let signers = await hre.ethers.getSigners();
    const signer = signers[0];
    console.log("Using signer address:", signer.address);

    /* Connect to WETH and wrap some eth  */
    const WETH = new hre.ethers.Contract(WETH_ADDRESS, ercAbi, signer);
    const deposit = await WETH.deposit({
      value: hre.ethers.utils.parseEther("10"),
    });
    await deposit.wait();
    console.log("WETH deposited");

    const expandedWETHBalance = await WETH.balanceOf(signer.address);
    const wethBalanceBefore = Number(
      hre.ethers.utils.formatUnits(expandedWETHBalance, DAI_DECIMALS)
    );
    console.log("WETH balance before swap:", wethBalanceBefore);

    /* Check Initial DAI Balance */
    const DAI = new hre.ethers.Contract(DAI_ADDRESS, ercAbi, signer);
    const expandedDAIBalanceBefore = await DAI.balanceOf(signer.address);
    const DAIBalanceBefore = Number(
      hre.ethers.utils.formatUnits(expandedDAIBalanceBefore, DAI_DECIMALS)
    );
    console.log("DAI balance before swap:", DAIBalanceBefore);

    /* Approve the swapper contract to spend WETH for me */
    const approveTx = await WETH.approve(
      simpleSwap.address,
      hre.ethers.utils.parseEther("1")
    );
    await approveTx.wait();
    console.log("WETH approved for SimpleSwap");

    /* Execute the swap */
    const amountIn = hre.ethers.utils.parseEther("0.1");
    const swapTx = await simpleSwap.swapWETHForDAI(amountIn, {
      gasLimit: 300000,
    });
    await swapTx.wait();
    console.log("Swap executed");

    /* Check DAI end balance */
    const expandedDAIBalanceAfter = await DAI.balanceOf(signer.address);
    const DAIBalanceAfter = Number(
      hre.ethers.utils.formatUnits(expandedDAIBalanceAfter, DAI_DECIMALS)
    );
    console.log("DAI balance after swap:", DAIBalanceAfter - DAIBalanceBefore);

    expect(DAIBalanceAfter).is.greaterThan(DAIBalanceBefore);
  });

  it("Should swap WETH for USDC", async function () {
    const evmDustTokensFactory = await hre.ethers.getContractFactory(
      "EvmDustTokens"
    );
    const EvmDustTokens = await evmDustTokensFactory.deploy(
      "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      3000
    );

    const EvmDustTokensAddress = EvmDustTokens.address;
    console.log("EVM Dust Tokens deployed to:", EvmDustTokensAddress);

    let signers = await hre.ethers.getSigners();
    const signer = signers[0];

    /* Connect to WETH and wrap some eth  */
    const WETH = new hre.ethers.Contract(WETH_ADDRESS, ercAbi, signer);
    const deposit = await WETH.deposit({
      value: hre.ethers.utils.parseEther("10"),
    });
    await deposit.wait();
    console.log("WETH deposited");

    const expandedWETHBalance = await WETH.balanceOf(signer.address);
    const wethBalanceBefore = Number(
      hre.ethers.utils.formatUnits(expandedWETHBalance, DAI_DECIMALS)
    );
    console.log("WETH balance before swap:", wethBalanceBefore);

    /* Check Initial DAI Balance */
    const DAI = new hre.ethers.Contract(DAI_ADDRESS, ercAbi, signer);
    const expandedDAIBalanceBefore = await DAI.balanceOf(signer.address);
    const DAIBalanceBefore = Number(
      hre.ethers.utils.formatUnits(expandedDAIBalanceBefore, DAI_DECIMALS)
    );
    console.log("DAI balance before swap:", DAIBalanceBefore);

    const swapAmount = "1";

    /* Approve the swapper contract to spend WETH for me */
    const approveTx = await WETH.approve(
      EvmDustTokensAddress,
      hre.ethers.utils.parseEther(swapAmount)
    );
    await approveTx.wait();
    console.log("WETH approved for SimpleSwap");

    const amountIn = hre.ethers.utils.parseEther(swapAmount);
    console.log("Swapping WETH for DAI:", amountIn.toString());

    const swapTx = await EvmDustTokens.swapWETHForDAI(amountIn, {
      gasLimit: 300000,
    });

    await swapTx.wait();
    console.log("Swap executed");

    /* Check DAI end balance */
    const expandedDAIBalanceAfter = await DAI.balanceOf(signer.address);
    const DAIBalanceAfter = Number(
      hre.ethers.utils.formatUnits(expandedDAIBalanceAfter, DAI_DECIMALS)
    );
    console.log("DAI balance after swap:", DAIBalanceAfter - DAIBalanceBefore);

    // expect(DAIBalanceAfter).is.greaterThan(DAIBalanceBefore);
  });

  it("should swap DAI and USDC for ERC20W", async function () {
    /* Deploy the SimpleSwap contract */
    const simpleSwapFactory = await hre.ethers.getContractFactory(
      "EvmDustTokens"
    );
    const simpleSwap = await simpleSwapFactory.deploy(
      UNISWAP_ROUTER,
      DAI_ADDRESS,
      WETH_ADDRESS,
      USDC_ADDRESS
    ); // Ensure the contract is deployed
    console.log("SimpleSwap deployed to:", await simpleSwap.address);

    let signers = await hre.ethers.getSigners();
    const signer = signers[0];
    console.log("Using signer address:", signer.address);

    /* Connect to WETH and wrap some eth  */
    const WETH = new hre.ethers.Contract(WETH_ADDRESS, ercAbi, signer);
    const deposit = await WETH.deposit({
      value: hre.ethers.utils.parseEther("10"),
    });
    await deposit.wait();
    console.log("WETH deposited");

    // MARK: AMOUNT TO SWAP
    const swapAmount = "0.1";

    const expandedWETHBalance = await WETH.balanceOf(signer.address);
    const wethBalanceBefore = Number(
      hre.ethers.utils.formatUnits(expandedWETHBalance, DAI_DECIMALS)
    );
    console.log("WETH balance before swap:", wethBalanceBefore);

    const LINK = new hre.ethers.Contract(LINK_ADDRESS, ercAbi, signer);
    const expandedUSDCBalanceBefore = await LINK.balanceOf(signer.address);
    const USDCBalanceBefore = Number(
      hre.ethers.utils.formatUnits(expandedUSDCBalanceBefore, DAI_DECIMALS)
    );
    console.log("LINK balance before swap:", USDCBalanceBefore);

    /* Approve the swapper contract to spend WETH for me */
    const USDCapproveTx = await LINK.approve(
      simpleSwap.address,
      hre.ethers.utils.parseEther(swapAmount)
    );
    await USDCapproveTx.wait();
    console.log("USDC approved for MultiSwap");

    /* Check Initial DAI Balance */
    const DAI = new hre.ethers.Contract(DAI_ADDRESS, ercAbi, signer);
    const expandedDAIBalanceBefore = await DAI.balanceOf(signer.address);
    const DAIBalanceBefore = Number(
      hre.ethers.utils.formatUnits(expandedDAIBalanceBefore, DAI_DECIMALS)
    );
    console.log("DAI balance before swap:", DAIBalanceBefore);

    /* Approve the swapper contract to spend WETH for me */
    const approveTx = await DAI.approve(
      simpleSwap.address,
      hre.ethers.utils.parseEther(swapAmount)
    );
    await approveTx.wait();
    console.log("DAI approved for MultiSwap");

    // RESULT BALANCES
    const beforeObj = {
      dai: await DAI.balanceOf(signer.address),
      link: await LINK.balanceOf(signer.address),
    };
    const beforeFormattedObj = {
      dai: Number(hre.ethers.utils.formatUnits(beforeObj.dai, DAI_DECIMALS)),
      link: Number(hre.ethers.utils.formatUnits(beforeObj.link, DAI_DECIMALS)),
    };

    /* Execute the swap */
    const swapTx = await simpleSwap.executeMultiSwap([
      DAI_ADDRESS,
      LINK_ADDRESS,
    ]);
    await swapTx.wait();
    console.log("MultiSwap executed");

    // Verify the recipient received the ERC20W tokens (assuming swap logic transfers all allowances)
    const expandedWETHBalanceAfter = await WETH.balanceOf(signer.address);
    const recipientBalanceAfter = Number(
      hre.ethers.utils.formatUnits(expandedWETHBalanceAfter, DAI_DECIMALS)
    );
    expect(recipientBalanceAfter).to.be.gt(wethBalanceBefore);

    // RESULT BALANCES
    const obj = {
      dai: await DAI.balanceOf(signer.address),
      link: await LINK.balanceOf(signer.address),
    };
    const formattedObj = {
      dai: Number(hre.ethers.utils.formatUnits(obj.dai, DAI_DECIMALS)),
      link: Number(hre.ethers.utils.formatUnits(obj.link, DAI_DECIMALS)),
    };

    // Create a multiline log for each token showing the before and after balances and the diff
    const log = Object.keys(formattedObj).map((key) => {
      return `${key} balance before: ${beforeFormattedObj[key]} \n ${key} balance after: ${formattedObj[key]} balance diff: `;
    });

    console.log(log);

    expect(formattedObj.dai).to.be.lessThan(beforeFormattedObj.dai);
    expect(formattedObj.link).to.be.lessThan(beforeFormattedObj.link);
  });
});
