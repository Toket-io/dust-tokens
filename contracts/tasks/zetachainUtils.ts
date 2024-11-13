import { ethers } from "ethers";
import fs from "fs";
import path from "path";

export type TokenSwap = {
  amount: ethers.BigNumber;
  minAmountOut: ethers.BigNumber;
  token: string;
};

type AddressData = {
  address: string;
  chain: string;
  type: string;
};
type LocalnetData = {
  addresses: AddressData[];
  pid: number;
};

const readLocalnetAddresses = (chain: string, type: string) => {
  const filePath = path.join(__dirname, "../localnet.json");

  let data: LocalnetData = { addresses: [], pid: 0 };

  // Read existing data if the file exists
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      data = JSON.parse(fileContent) as LocalnetData;
    } catch (error) {
      console.error("Error reading or parsing the JSON file:", error);
      throw new Error("Failed to read the deployment data.");
    }
  }

  if (!data.pid) {
    throw new Error("Localnet data not found");
  }

  const addressesData: LocalnetData = data;

  const addressData = addressesData.addresses.find(
    (address) => address.chain === chain && address.type === type
  );

  if (!addressData) {
    throw new Error(`Address not found for chain ${chain} and type ${type}`);
  }

  return addressData.address;
};

const writeAddressToFile = (chain: string, type: string, address: string) => {
  const filePath = path.join(__dirname, "../localnet.json");

  let data: LocalnetData = { addresses: [], pid: 0 };

  // Read existing data if the file exists
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      data = JSON.parse(fileContent) as LocalnetData;
    } catch (error) {
      console.error("Error reading or parsing the JSON file:", error);
      throw new Error("Failed to read the deployment data.");
    }
  }

  // Check if an entry with the same chain and type exists
  const existingEntryIndex = data.addresses.findIndex(
    (entry) => entry.chain === chain && entry.type === type
  );

  if (existingEntryIndex !== -1) {
    // Update the existing entry
    data.addresses[existingEntryIndex].address = address;
  } else {
    // Add a new entry
    const newEntry: AddressData = { address, chain, type };
    data.addresses.push(newEntry);
  }

  // Write the updated data back to the file
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to the JSON file:", error);
    throw new Error("Failed to write the deployment data.");
  }
};

export { readLocalnetAddresses, writeAddressToFile };
