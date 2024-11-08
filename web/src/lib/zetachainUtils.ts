import { ethers } from "ethers";
import { SignatureTransfer, PERMIT2_ADDRESS } from "@uniswap/Permit2-sdk";

export type TokenSwap = {
  amount: ethers.BigNumber;
  token: string;
};

const encodeDestinationPayload = (
  recipient: string,
  outputToken: string
): string => {
  const destinationPayloadTypes = ["address", "address"];
  const destinationFunctionParams = ethers.utils.defaultAbiCoder.encode(
    destinationPayloadTypes,
    [outputToken, recipient]
  );

  const functionName = "ReceiveTokens(address,address)";
  const functionSignature = ethers.utils.id(functionName).slice(0, 10);
  const destinationPayload = ethers.utils.hexlify(
    ethers.utils.concat([functionSignature, destinationFunctionParams])
  );

  return destinationPayload;
};

const encodeZetachainPayload = (
  targetChainToken: string,
  targetChainCounterparty: string,
  recipient: string,
  outputToken: string,
  destinationPayload: string
) => {
  const args = {
    types: ["address", "bytes", "address", "address", "bytes"],
    values: [
      targetChainToken,
      targetChainCounterparty,
      recipient,
      outputToken,
      destinationPayload,
    ],
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
      return ethers.BigNumber.from(value);
    } else {
      return value;
    }
  });

  const encodedParameters = ethers.utils.defaultAbiCoder.encode(
    args.types,
    valuesArray
  );

  return encodedParameters;
};

const preparePermitData = async (
  provider: ethers.providers.BaseProvider,
  swaps: TokenSwap[],
  spender: string
) => {
  const nonce = Math.floor(Math.random() * 1e15); // 1 quadrillion potential nonces
  const deadline = calculateEndTime(30 * 60 * 1000); // 30 minute sig deadline

  // Create the permit object for batched transfers
  const permit = {
    deadline: deadline,
    nonce: nonce,
    permitted: swaps.map((s) => {
      return { amount: s.amount, token: s.token };
    }),
    spender: spender,
  };

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

  return { domain, types, values, deadline, nonce };
};

const calculateEndTime = (duration: number) => {
  return Math.floor((Date.now() + duration) / 1000);
};

export { encodeDestinationPayload, encodeZetachainPayload, preparePermitData };
