import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;
  const { tx, eventname } = args;

  try {
    // Get the transaction receipt
    const receipt = await hre.ethers.provider.getTransactionReceipt(tx);

    if (!receipt) {
      throw new Error(`Transaction ${tx} not found.`);
    }

    console.log(`Transaction ${tx} mined in block ${receipt.blockNumber}`);

    // Load the contract artifact and create an interface
    const contractArtifact = await hre.artifacts.readArtifact("Swap");
    const contractInterface = new hre.ethers.utils.Interface(
      contractArtifact.abi
    );

    const event = contractInterface.getEvent(eventname);
    const eventSignature = contractInterface.getEventTopic(event);

    // Filter logs for the given event
    const eventLogs = receipt.logs.filter(
      (log) => log.topics[0] === eventSignature
    );

    if (eventLogs.length === 0) {
      console.log(`No events named "${event}" found in transaction ${tx}.`);
      return;
    }

    // Decode and log the event details
    eventLogs.forEach((log, index) => {
      const decodedEvent = contractInterface.parseLog(log);
      console.log(`Event ${event} [${index}]:`, decodedEvent.args);

      const data = decodedEvent.args.payload;
      const destinationPayloadTypes = ["address", "address"];
      const decoded = hre.ethers.utils.defaultAbiCoder.decode(
        destinationPayloadTypes,
        data
      );
      console.log(`Decoded payload:`, decoded);
    });
  } catch (error) {
    console.error(`Error fetching event: ${error.message}`);
  }
};

const mainEvm = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;
  const { tx, eventname } = args;

  try {
    // Get the transaction receipt
    const receipt = await hre.ethers.provider.getTransactionReceipt(tx);

    if (!receipt) {
      throw new Error(`Transaction ${tx} not found.`);
    }

    console.log(
      `\n\n------ Transaction ${tx} mined in block ${receipt.blockNumber}`
    );

    // Get the transaction object
    const transaction = await hre.ethers.provider.getTransaction(tx);
    console.log(
      `VALUE: (msg.value): ${hre.ethers.utils.formatEther(
        transaction.value
      )} ETH`
    );

    // Load the contract artifact and create an interface
    const contractArtifact = await hre.artifacts.readArtifact("EvmDustTokens");
    const contractInterface = new hre.ethers.utils.Interface(
      contractArtifact.abi
    );

    // Get the event signature
    const event = contractInterface.getEvent(eventname);
    const eventSignature = contractInterface.getEventTopic(event);

    // Filter logs for the given event
    const eventLogs = receipt.logs.filter(
      (log) => log.topics[0] === eventSignature
    );

    if (eventLogs.length === 0) {
      console.log(
        `\nEVENT: No events named "${eventname}" found in transaction.\n------`
      );
      return;
    }

    // Decode and log the event details
    eventLogs.forEach((log, index) => {
      const decodedEvent = contractInterface.parseLog(log);
      console.log(`\nEVENT: ${event} [${index}]:`, decodedEvent.args);
      console.log("------");
    });
  } catch (error) {
    console.error(`Error fetching event: ${error.message}`);
  }
};

task("debug-event", "Fetches a specific event from a transaction", main)
  .addParam("eventname", "The event name to analyze")
  .addParam("tx", "The transaction ID to analyze");

task("debug-event-evm", "Fetches a specific event from a transaction", mainEvm)
  .addParam("eventname", "The event name to analyze")
  .addParam("tx", "The transaction ID to analyze");
