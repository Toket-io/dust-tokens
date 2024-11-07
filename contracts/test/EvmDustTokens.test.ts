import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { PERMIT2_ADDRESS, SignatureTransfer } from "@uniswap/Permit2-sdk";
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
  let notOwner: SignerWithAddress;

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

  function calculateEndTime(duration: number) {
    return Math.floor((Date.now() + duration) / 1000);
  }

  const signPermit = async (swaps: TokenSwap[]) => {
    const nonce = Math.floor(Math.random() * 1e15); // 1 quadrillion potential nonces
    const deadline = calculateEndTime(30 * 60 * 1000); // 30 minute sig deadline

    // Create the permit object for batched transfers
    const permit = {
      deadline: deadline,
      nonce: nonce,
      permitted: swaps.map((s) => {
        return { amount: s.amount, token: s.token };
      }),
      spender: dustTokens.address,
    };

    // Get the chainId (Sepolia = 11155111)
    const network = await hre.ethers.provider.getNetwork();
    const chainId = network.chainId;
    console.log("ChainID:", chainId);

    // Generate the permit return data & sign it
    const { domain, types, values } = SignatureTransfer.getPermitData(
      permit,
      PERMIT2_ADDRESS,
      chainId
    );
    const signature = await signer._signTypedData(domain, types, values);

    return { deadline, nonce, signature };
  };

  // MARK: Setup
  this.beforeAll(async function () {
    // Save Signer
    let signers = await hre.ethers.getSigners();
    signer = signers[0];

    receiver = signers[2];

    notOwner = signers[3];

    console.log("Signer Address:", signer.address);
    console.log("Receiver Address:", receiver.address);
    console.log("Not Owner Address:", notOwner.address);

    // Deploy the SimpleSwap contract
    const simpleSwapFactory = await hre.ethers.getContractFactory("SimpleSwap");
    simpleSwap = await simpleSwapFactory.deploy(UNISWAP_ROUTER, WETH_ADDRESS);
    await simpleSwap.deployed();
    console.log("SimpleSwap deployed to:", simpleSwap.address);

    // Deploy the DustTokens contract
    const evmDustTokensFactory = await hre.ethers.getContractFactory(
      "EvmDustTokens"
    );
    dustTokens = await evmDustTokensFactory.deploy(
      GATEWAY_ADDRESS,
      UNISWAP_ROUTER,
      WETH_ADDRESS,
      signer.address,
      PERMIT2_ADDRESS
    );
    await dustTokens.deployed();
    console.log("DustTokens deployed to:", dustTokens.address);

    // Configure initial whitelisted tokens
    await dustTokens.addToken(DAI_ADDRESS);
    await dustTokens.addToken(LINK_ADDRESS);
    await dustTokens.addToken(UNI_ADDRESS);
    await dustTokens.addToken(WBTC_ADDRESS);

    // Connect to ERC20s
    WETH = new hre.ethers.Contract(WETH_ADDRESS, ercAbi, signer);
    DAI = new hre.ethers.Contract(DAI_ADDRESS, ercAbi, signer);
    USDC = new hre.ethers.Contract(USDC_ADDRESS, ercAbi, signer);
    LINK = new hre.ethers.Contract(LINK_ADDRESS, ercAbi, signer);
    UNI = new hre.ethers.Contract(UNI_ADDRESS, ercAbi, signer);
    WBTC = new hre.ethers.Contract(WBTC_ADDRESS, ercAbi, signer);

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

    // Approve permit2 contract
    await WETH.approve(PERMIT2_ADDRESS, hre.ethers.constants.MaxUint256);
    await DAI.approve(PERMIT2_ADDRESS, hre.ethers.constants.MaxUint256);
    await USDC.approve(PERMIT2_ADDRESS, hre.ethers.constants.MaxUint256);
    await LINK.approve(PERMIT2_ADDRESS, hre.ethers.constants.MaxUint256);
    await UNI.approve(PERMIT2_ADDRESS, hre.ethers.constants.MaxUint256);
    await WBTC.approve(PERMIT2_ADDRESS, hre.ethers.constants.MaxUint256);
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
  it("Should swap input tokens and output specified token on destination chain", async function () {
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

    // Step 4: Sign permit
    const permit = await signPermit(swaps);

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
      revertOptions,
      permit.nonce,
      permit.deadline,
      permit.signature
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

  it("Should swap input tokens and output native token on destination chain", async function () {
    // Step 0: Output token
    const outputTokenContractAddress =
      "0x0000000000000000000000000000000000000000";

    // Step 1: Create destination chain payload
    const destinationPayload = encodeDestinationPayload(
      receiver.address,
      outputTokenContractAddress
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

    // Step 4: Sign permit
    const permit = await signPermit(swaps);

    // Step 5: Save the start balance of the receiver
    const receiverStartBalance = await receiver.getBalance();

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
      revertOptions,
      permit.nonce,
      permit.deadline,
      permit.signature
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
    const receiverBalance = await receiver.getBalance();

    expect(receiverBalance).to.be.greaterThan(receiverStartBalance);
  });

  it("Should handle multiple tokens and balances", async function () {
    const isDaiWhiteListed = await dustTokens.isTokenWhitelisted(DAI.address);
    const isLinkWhiteListed = await dustTokens.isTokenWhitelisted(LINK.address);
    const isUniWhiteListed = await dustTokens.isTokenWhitelisted(UNI.address);
    const isWbtcWhiteListed = await dustTokens.isTokenWhitelisted(WBTC.address);

    expect(isDaiWhiteListed).to.be.true;
    expect(isLinkWhiteListed).to.be.true;
    expect(isUniWhiteListed).to.be.true;
    expect(isWbtcWhiteListed).to.be.true;

    let tokens = await dustTokens.getTokens();
    expect(tokens).to.deep.equal([
      DAI.address,
      LINK.address,
      UNI.address,
      WBTC.address,
    ]);

    await dustTokens.removeToken(DAI.address);

    expect(await dustTokens.isTokenWhitelisted(DAI.address)).to.be.false;
    expect(await dustTokens.isTokenWhitelisted(LINK.address)).to.be.true;
    expect(await dustTokens.isTokenWhitelisted(UNI.address)).to.be.true;
    expect(await dustTokens.isTokenWhitelisted(WBTC.address)).to.be.true;

    const balances = await dustTokens.getBalances(signer.address);
    expect(balances).to.deep.equal([
      [WBTC.address, LINK.address, UNI.address],
      [await WBTC.name(), await LINK.name(), await UNI.name()],
      [await WBTC.symbol(), await LINK.symbol(), await UNI.symbol()],
      [await WBTC.decimals(), await LINK.decimals(), await UNI.decimals()],
      [
        await WBTC.balanceOf(signer.address),
        await LINK.balanceOf(signer.address),
        await UNI.balanceOf(signer.address),
      ],
    ]);

    await dustTokens.addToken(DAI.address);

    expect(await dustTokens.isTokenWhitelisted(DAI.address)).to.be.true;
    expect(await dustTokens.isTokenWhitelisted(LINK.address)).to.be.true;
    expect(await dustTokens.isTokenWhitelisted(UNI.address)).to.be.true;
    expect(await dustTokens.isTokenWhitelisted(WBTC.address)).to.be.true;
  });

  // MARK: Permit2 Tests
  it("Should deposit single token with Permit2 signature transfer", async function () {
    try {
      // declare needed vars
      const nonce = Math.floor(Math.random() * 1e15); // 1 quadrillion potential nonces
      const deadline = calculateEndTime(30 * 60 * 1000); // 30 minute sig deadline
      // permit amount MUST match passed in signature transfer amount,
      // unlike with AllowanceTransfer where permit amount can be uint160.max
      // while the actual transfer amount can be less.
      const token = DAI;
      const amount = hre.ethers.utils.parseUnits("123", 18);

      // create permit object
      const permit = {
        deadline: deadline,
        nonce: nonce,
        permitted: {
          amount: amount,
          token: token.address,
        },
        spender: dustTokens.address,
      };
      console.log("permit object:", permit);

      // Get the chainId (Sepolia = 11155111)
      const network = await hre.ethers.provider.getNetwork();
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
        token.address,
        amount,
        nonce,
        deadline,
        signature
      );
      console.log("Transfer with permit tx sent:", tx.hash);
      await tx.wait();
      console.log("Tx confirmed");

      // Verify the balance
      const balance = await token.balanceOf(dustTokens.address);
      expect(balance).to.equal(amount);

      console.log("Permit2App transfer completed: ", balance);
    } catch (error) {
      console.error("signatureTransfer error:", error);
      throw error;
    }
  });

  it("Should deposit multiple tokens with Permit2 batch signature transfer", async function () {
    try {
      const tokens = [DAI, UNI];
      const swaps: TokenSwap[] = [
        {
          amount: hre.ethers.utils.parseUnits("100", 18),
          token: tokens[0].address,
        },
        {
          amount: hre.ethers.utils.parseUnits("200", 18),
          token: tokens[1].address,
        },
      ];

      const permit = await signPermit(swaps);

      // Call our `signatureTransfer()` function with correct data and signature
      const tx = await dustTokens.signatureBatchTransfer(
        swaps,
        permit.nonce,
        permit.deadline,
        permit.signature
      );
      console.log("Transfer with permit tx sent:", tx.hash);
      await tx.wait();
      console.log("Tx confirmed");

      // Verify the balance
      const balanceTokenA = await tokens[0].balanceOf(dustTokens.address);
      // expect(balanceTokenA).to.equal(amounts[0]);

      const balanceTokenB = await tokens[1].balanceOf(dustTokens.address);
      // expect(balanceTokenB).to.equal(amounts[1]);

      // TODO: Check output balances

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
});
