import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { PERMIT2_ADDRESS } from "@uniswap/Permit2-sdk";
import { expect } from "chai";
import { Contract } from "ethers";
import hre from "hardhat";

import ContractsConfig from "../../ContractsConfig";
import {
  encodeDestinationPayload,
  encodeZetachainPayload,
  getUniswapV3EstimatedAmountOut,
  preparePermitData,
  readLocalnetAddresses,
  TokenSwap,
} from "../../web/src/lib/zetachainUtils";
import { EvmDustTokens, SimpleSwap, Swap } from "../typechain-types";

const DAI_DECIMALS = 18;
const USDC_DECIMALS = 6;

// EVM Gateway
const GATEWAY_ADDRESS: string = readLocalnetAddresses("ethereum", "gatewayEVM");

// Zetachain Contracts
const ZETA_GATEWAY_ADDRESS: string = readLocalnetAddresses(
  "zetachain",
  "gatewayZEVM"
);
const ZETA_SYSTEM_CONTRACT_ADDRESS: string = readLocalnetAddresses(
  "zetachain",
  "systemContract"
);
const ZETA_USDC_ETH_ADDRESS: string = readLocalnetAddresses(
  "zetachain",
  "ZRC-20 USDC on 5"
);
const ZETA_ETH_ADDRESS: string = readLocalnetAddresses(
  "zetachain",
  "ZRC-20 ETH on 5"
);

const WETH_ADDRESS: string = ContractsConfig.evm_weth ?? "";
const DAI_ADDRESS: string = process.env.DAI_ADDRESS ?? "";
const USDC_ADDRESS: string = process.env.USDC_ADDRESS ?? "";
const UNI_ADDRESS = process.env.UNI_ADDRESS ?? "";
const LINK_ADDRESS: string = process.env.LINK_ADDRESS ?? "";
const WBTC_ADDRESS: string = process.env.WBTC_ADDRESS ?? "";

const UNISWAP_ROUTER: string = ContractsConfig.evm_uniswapRouterV3;
const UNISWAP_QUOTER: string = ContractsConfig.evm_uniswapQuoterV3;

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

  // ZetaChain side Contracts
  let universalApp: Swap;
  let ZETA_USDC_ETH: Contract;
  let ZETA_ETH: Contract;

  // MARK: Helper Functions
  const signPermit = async (swaps: TokenSwap[]) => {
    const { domain, types, values, deadline, nonce } = await preparePermitData(
      hre.ethers.provider,
      swaps,
      dustTokens.address
    );
    const signature = await signer._signTypedData(domain, types, values);

    return { deadline, nonce, signature };
  };

  const getTokenSwaps = async (
    tokens: Contract[] = [DAI, LINK, UNI],
    swapAmount: string = "1",
    slippageBPS: number = 50
  ): Promise<TokenSwap[]> => {
    const amount = hre.ethers.utils.parseUnits(swapAmount, DAI_DECIMALS);

    const swapPromises: Promise<TokenSwap>[] = tokens.map(async (token) => {
      const minAmountOut = await getUniswapV3EstimatedAmountOut(
        hre.ethers.provider,
        UNISWAP_QUOTER,
        token.address,
        WETH.address,
        amount,
        slippageBPS
      );

      return {
        amount,
        minAmountOut,
        token: token.address,
      };
    });

    // Await all Promises to resolve
    const swaps: TokenSwap[] = await Promise.all(swapPromises);

    return swaps;
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
    console.log("EvmDustTokens deployed to:", dustTokens.address);

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
    console.log("Permit2 contract approved to spend tokens");
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
      receiver.address,
      destinationPayload
    );

    // Step 3: Create input token swaps
    const swaps: TokenSwap[] = await getTokenSwaps();

    // Step 4: Sign permit
    const permit = await signPermit(swaps);

    // Step 5: Save the start balance of the receiver
    const receiverStartBalance = await outputTokenContract.balanceOf(
      receiver.address
    );

    // Step 6: Execute SwapAndBridgeTokens
    const tx = await dustTokens.SwapAndBridgeTokens(
      swaps,
      universalApp.address,
      encodedParameters,
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
      receiver.address,
      destinationPayload
    );

    // Step 3: Create input token swaps
    const swaps: TokenSwap[] = await getTokenSwaps();

    // Step 4: Sign permit
    const permit = await signPermit(swaps);

    // Step 5: Save the start balance of the receiver
    const receiverStartBalance = await receiver.getBalance();

    // Step 6: Execute SwapAndBridgeTokens
    const tx = await dustTokens.SwapAndBridgeTokens(
      swaps,
      universalApp.address,
      encodedParameters,
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

  it("Should revert on destination chain and withdraw native gas token to receiver", async function () {
    // Step 0: Set unsoported output token
    const outputTokenContract = "0x25d887Ce7a35172C62FeBFD67a1856F20FaEbB00"; // PEPE token

    // Step 1: Create destination chain payload
    const destinationPayload = encodeDestinationPayload(
      receiver.address,
      outputTokenContract
    );

    // Step 2: Create Zetachain payload
    const encodedParameters = encodeZetachainPayload(
      ZETA_ETH_ADDRESS,
      dustTokens.address,
      receiver.address,
      destinationPayload
    );

    // Step 3: Create input token swaps
    const swaps: TokenSwap[] = await getTokenSwaps();

    // Step 4: Sign permit
    const permit = await signPermit(swaps);

    // Step 5: Save the start balance of the receiver
    const receiverStartBalance = await receiver.getBalance();

    // Step 6: Execute SwapAndBridgeTokens
    const tx = await dustTokens.SwapAndBridgeTokens(
      swaps,
      universalApp.address,
      encodedParameters,
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

  it("Should revert on Zeta chain and return input tokens to sender", async function () {
    // Step 0: Set unsoported output token
    const outputTokenContract = "0x25d887Ce7a35172C62FeBFD67a1856F20FaEbB00"; // PEPE token

    // Step 1: Create destination chain payload
    const destinationPayload = encodeDestinationPayload(
      receiver.address,
      outputTokenContract
    );

    // Step 2: Create invalid Zetachain payload to trigger revert
    const encodedParameters = encodeZetachainPayload(
      "0x0000000000000000000000000000000000000000",
      dustTokens.address,
      receiver.address,
      destinationPayload
    );

    // Step 3: Create input token swaps
    const swaps: TokenSwap[] = await getTokenSwaps();

    // Step 4: Sign permit
    const permit = await signPermit(swaps);

    // Step 5: Save the start balance of the receiver
    const signerStartBalance = await signer.getBalance();

    // Step 6: Execute SwapAndBridgeTokens
    const tx = await dustTokens.SwapAndBridgeTokens(
      swaps,
      universalApp.address,
      encodedParameters,
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

    // Step 8: Check the orignal sender has received the tokens back
    const signerBalance = await signer.getBalance();

    expect(signerBalance).to.be.greaterThan(signerStartBalance);
  });

  it("Should receive tokens and send native gas ", async function () {
    // Step 0: Output token
    const outputTokenContractAddress =
      "0x0000000000000000000000000000000000000000";

    // Step 5: Save the start balance of the receiver
    const receiverStartBalance = await receiver.getBalance();

    const tx = await dustTokens.ReceiveTokens(
      outputTokenContractAddress,
      receiver.address,
      {
        value: hre.ethers.utils.parseEther("1"),
      }
    );
    const receipt = await tx.wait();

    // Step 7: Check that the receipt includes the event SwappedAndDeposited
    const depositEvent = receipt.events?.find(
      (e) => e.event === "SwappedAndWithdrawn"
    );

    expect(tx).not.reverted;
    expect(depositEvent).exist;

    // Step 8: Check the receiver's balance for the output token
    const receiverBalance = await receiver.getBalance();

    expect(receiverBalance).to.be.greaterThan(receiverStartBalance);
  });

  it("Should receive tokens and send output token ", async function () {
    // Step 0: Output token
    const outputToken = LINK;

    // Step 5: Save the start balance of the receiver
    const receiverStartBalance = await outputToken.balanceOf(receiver.address);

    const tx = await dustTokens.ReceiveTokens(
      outputToken.address,
      receiver.address,
      {
        value: hre.ethers.utils.parseEther("1"),
      }
    );
    const receipt = await tx.wait();

    // Step 7: Check that the receipt includes the event SwappedAndDeposited
    const depositEvent = receipt.events?.find(
      (e) => e.event === "SwappedAndWithdrawn"
    );

    expect(tx).not.reverted;
    expect(depositEvent).exist;

    // Step 8: Check the receiver's balance for the output token
    const receiverBalance = await outputToken.balanceOf(receiver.address);

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

  it("Should deposit multiple tokens with Permit2 batch signature transfer", async function () {
    try {
      const tokens = [DAI, UNI];
      const swaps: TokenSwap[] = await getTokenSwaps([DAI, UNI], "100");

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
