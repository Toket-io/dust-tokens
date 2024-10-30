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

  // MARK: Helper Functions
  const encodeDestinationPayload = (
    recipient: string,
    outputToken: string
  ): string => {
    const destinationPayloadTypes = ["address", "address"];
    const destinationFunctionParams = hre.ethers.utils.defaultAbiCoder.encode(
      destinationPayloadTypes,
      [outputToken, recipient]
    );

    const functionName = "ReceiveTokens(address,address)";
    const functionSignature = hre.ethers.utils.id(functionName).slice(0, 10);
    const destinationPayload = hre.ethers.utils.hexlify(
      hre.ethers.utils.concat([functionSignature, destinationFunctionParams])
    );

    return destinationPayload;
  };

  const encodeZetachainPayload = (
    outputChainToken: string,
    destinationContract: string,
    destinationPayload: string
  ) => {
    const args = {
      types: ["address", "bytes", "bytes"],
      values: [outputChainToken, destinationContract, destinationPayload],
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

    return encodedParameters;
  };

  const approveTokens = async (tokenSwaps: TokenSwap[]) => {
    for (const swap of tokenSwaps) {
      const contract = new hre.ethers.Contract(swap.token, ercAbi, signer);
      const approveTx = await contract.approve(dustTokens.address, swap.amount);
      await approveTx.wait();

      const tokenName = await contract.name();
      const tokenDecimals = await contract.decimals();
      const formattedAmount = hre.ethers.utils.formatUnits(
        swap.amount,
        tokenDecimals
      );

      console.log(`${tokenName} approved ${formattedAmount}`);
    }
  };

  // MARK: Setup
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

  // MARK: Tests
  it("Test balance of UNI", async function () {
    const balance = await UNI.balanceOf(signer.address);
    const formatedBalance = hre.ethers.utils.formatUnits(balance, DAI_DECIMALS);

    console.log("UNI balance:", formatedBalance);
  });

  it.only("SwapAndBridgeTokens", async function () {
    // Step 0: Output token
    const outputTokenContract = UNI;

    // Step 1: Create destination chain payload
    const destinationPayload = encodeDestinationPayload(
      receiver.address,
      outputTokenContract.address
    );

    // Step 2: Create Zetachain payload
    const encodedParameters = encodeZetachainPayload(
      ZETA_ETH_ADDRESS,
      dustTokens.address,
      destinationPayload
    );

    // Step 3: Create input token swaps
    const swaps: TokenSwap[] = [
      {
        amount: hre.ethers.utils.parseUnits("1", DAI_DECIMALS),
        token: DAI.address,
      },
      {
        amount: hre.ethers.utils.parseUnits("1", DAI_DECIMALS),
        token: LINK.address,
      },
      {
        amount: hre.ethers.utils.parseUnits("1", DAI_DECIMALS),
        token: UNI.address,
      },
    ];

    // Step 4: Approve tokens
    await approveTokens(swaps);

    // Step 5: Save the start balance of the receiver
    const receiverStartBalance = await outputTokenContract.balanceOf(
      receiver.address
    );

    // Step 6: Execute SwapAndBridgeTokens
    const revertOptions = {
      abortAddress: "0x0000000000000000000000000000000000000000", // not used
      callOnRevert: false,
      onRevertGasLimit: 7000000,
      revertAddress: "0x0000000000000000000000000000000000000000",
      revertMessage: hre.ethers.utils.hexlify(
        hre.ethers.utils.toUtf8Bytes("0x")
      ),
    };

    const tx = await dustTokens.SwapAndBridgeTokens(
      swaps,
      universalApp.address,
      encodedParameters,
      revertOptions
    );
    const receipt = await tx.wait();

    // Step 7: Check that the receipt includes the event SwappedAndDeposited
    const depositEvent = receipt.events?.find(
      (e) => e.event === "SwappedAndDeposited"
    );

    expect(tx).not.reverted;
    expect(depositEvent).exist;

    // Wait for 5 second
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Step 8: Check the receiver's balance for the output token
    const receiverBalance = await outputTokenContract.balanceOf(
      receiver.address
    );

    expect(receiverBalance).to.be.greaterThan(receiverStartBalance);
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
