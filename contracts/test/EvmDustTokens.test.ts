import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
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

const WETH_ADDRESS: string | null = ContractsConfig.evm_weth;
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

describe("EvmDustTokens", function () {
  let signer: SignerWithAddress;
  let receiver: SignerWithAddress;

  // EVM side Contracts
  let simpleSwap: SimpleSwap;
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

    receiver = signers[2];


    // Deploy the SimpleSwap contract
    const simpleSwapFactory = await hre.ethers.getContractFactory("SimpleSwap");
    simpleSwap = await simpleSwapFactory.deploy(UNISWAP_ROUTER, WETH_ADDRESS);
    await simpleSwap.deployed();

    // Deploy the DustTokens contract
    const evmDustTokensFactory = await hre.ethers.getContractFactory(
      "EvmDustTokens"
    );
    dustTokens = await evmDustTokensFactory.deploy(
      GATEWAY_ADDRESS,
      UNISWAP_ROUTER,
      WETH_ADDRESS
    );
    await dustTokens.deployed();
    console.log("DustTokens deployed to:", dustTokens.address);

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
    console.log("Universal App deployed to:", universalApp.address);

    // Connect to ERC20s
    ZETA_USDC_ETH = new hre.ethers.Contract(
      ZETA_USDC_ETH_ADDRESS,
      ercAbi,
      signer
    );
    ZETA_ETH = new hre.ethers.Contract(ZETA_ETH_ADDRESS, ercAbi, signer);
  });

  this.beforeEach(async function () {
    const WETHAmount = hre.ethers.utils.parseEther("10");
    // Fund signer with some WETH
    const depositWETH = await WETH.deposit({
      value: WETHAmount,
    });
    await depositWETH.wait();

    // Approve the SimpleSwap contract to spend WETH
    const approveWETH = await WETH.approve(simpleSwap.address, WETHAmount);
    await approveWETH.wait();

    // Fund signer with ERC20 tokens
    const erc20s = [
      DAI_ADDRESS,
      USDC_ADDRESS,
      LINK_ADDRESS,
      UNI_ADDRESS,
      WBTC_ADDRESS,
    ];
    const swapAmount = hre.ethers.utils.parseEther("1");
    const simpleSwapTx = await simpleSwap.ExecuteMultiSwapFromWETH(
      erc20s,
      swapAmount
    );
    await simpleSwapTx.wait();

    // Check balances
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

  it("Test balance of UNI", async function () {
    const balance = await UNI.balanceOf(signer.address);
    const formatedBalance = hre.ethers.utils.formatUnits(balance, DAI_DECIMALS);

    console.log("UNI balance:", formatedBalance);
  });

  it.only("SwapAndBridgeTokens", async function () {
    const destinationPayloadTypes = ["address", "address"];
    const destinationOutputToken = UNI.address;
    const destinationRecipient = receiver.address;
    const destinationFunctionParams = hre.ethers.utils.defaultAbiCoder.encode(
      destinationPayloadTypes,
      [destinationOutputToken, destinationRecipient]
    );

    const functionName = "ReceiveTokens(address,address)";
    const functionSignature = hre.ethers.utils.id(functionName).slice(0, 10);
    const destinationPayload = hre.ethers.utils.hexlify(
      hre.ethers.utils.concat([functionSignature, destinationFunctionParams])
    );

    const args = {
      revertOptions: {
        callOnRevert: false,
        onRevertGasLimit: 7000000,
        revertAddress: "0x0000000000000000000000000000000000000000",
        revertMessage: "0x",
      },
      types: ["address", "bytes", "bytes"],
      values: [ZETA_ETH_ADDRESS, dustTokens.address, destinationPayload],
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
      { amount: "100", contract: DAI, decimals: DAI_DECIMALS, name: "DAI" },
      { amount: "1", contract: LINK, decimals: DAI_DECIMALS, name: "LINK" }, // Assuming LINK uses the same decimals as DAI
      { amount: "6", contract: UNI, decimals: DAI_DECIMALS, name: "UNI" }, // Assuming LINK uses the same decimals as DAI
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
    }

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
    const receipt = await tx.wait();

    // Check that the receipt includes the event SwappedAndDeposited
    const event = receipt.events?.find(
      (e) => e.event === "SwappedAndDeposited"
    );

    expect(tx).not.reverted;
    expect(event).exist;

    const totalTokensDeposited = hre.ethers.utils.formatEther(event?.args[2]);
    console.log("Swap Event: ", totalTokensDeposited);

    // // Wait for 1 second
    // await new Promise((resolve) => setTimeout(resolve, 1000));

    // // Check if USDC balance has increased
    // const expandedUSDCBalanceAfter = await USDC.balanceOf(signer.address);
    // const UsdcBalanceAfter = Number(
    //   hre.ethers.utils.formatUnits(expandedUSDCBalanceAfter, USDC_DECIMALS)
    // );
    // const UsdcBalanceBefore = startBalances["usdc"];
    // const UsdcDiff = UsdcBalanceAfter - UsdcBalanceBefore;

    // console.log(
    //   `USDC balance - Before: ${UsdcBalanceBefore}, After: ${UsdcBalanceAfter}, Diff: ${UsdcDiff}`
    // );

    // expect(UsdcBalanceAfter).is.greaterThan(UsdcBalanceBefore);

    // Check native eth balance
    const expandedNativeEthBalanceAfter = await signer.getBalance();
    const nativeEthBalanceAfter = Number(
      hre.ethers.utils.formatUnits(expandedNativeEthBalanceAfter, DAI_DECIMALS)
    );
    const nativeEthBalanceBefore = startBalances["nativeEth"];
    const nativeEthDiff = nativeEthBalanceAfter - nativeEthBalanceBefore;

    console.log(
      `Native ETH balance - Before: ${nativeEthBalanceBefore}, After: ${nativeEthBalanceAfter}, Diff: ${nativeEthDiff}`
    );
  });

  it("Should handle multiple tokens and balances", async function () {
    await dustTokens.addToken(DAI.address);
    await dustTokens.addToken(LINK.address);
    await dustTokens.addToken(UNI.address);

    let tokens = await dustTokens.getTokens();
    expect(tokens).to.deep.equal([DAI.address, LINK.address, UNI.address]);

    await dustTokens.removeToken(DAI.address);

    tokens = await dustTokens.getTokens();
    expect(tokens).to.deep.equal([UNI.address, LINK.address]);

    const balances = await dustTokens.getBalances(signer.address);
    expect(balances).to.deep.equal([
      [UNI.address, LINK.address],
      [await UNI.name(), await LINK.name()],
      [await UNI.symbol(), await LINK.symbol()],
      [await UNI.decimals(), await LINK.decimals()],
      [
        await UNI.balanceOf(signer.address),
        await LINK.balanceOf(signer.address),
      ],
    ]);
  });
});
