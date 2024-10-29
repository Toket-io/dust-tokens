import ContractsConfig from "../../ContractsConfig";

interface ChainAddresses {
  gateway: `0x${string}`;
  tss?: `0x${string}`;
  erc20custody?: `0x${string}`;
  fungibleModule?: `0x${string}`;
  systemContract?: `0x${string}`;
  usdc: `0x${string}`;
  zeta: `0x${string}`;
  eth?: `0x${string}`;
  dai?: `0x${string}`;
  weth?: `0x${string}`;
}

export const evmAddresses: ChainAddresses = {
  gateway: ContractsConfig.evm_gateway,
  tss: ContractsConfig.evm_tss,
  erc20custody: ContractsConfig.evm_erc20custody,
  usdc: ContractsConfig.evm_usdcToken,
  zeta: ContractsConfig.evm_zetaToken,
  dai: process.env.NEXT_PUBLIC_DAI_ADDRESS! as `0x${string}`,
  weth: process.env.NEXT_PUBLIC_WETH_ADDRESS! as `0x${string}`,
};

export const zetaAddresses: ChainAddresses = {
  gateway: ContractsConfig.zeta_gateway,
  fungibleModule: ContractsConfig.zeta_fungibleModule,
  systemContract: ContractsConfig.zeta_systemContract,
  usdc: ContractsConfig.zeta_usdcEthToken,
  zeta: ContractsConfig.zeta_zetaToken,
  eth: ContractsConfig.zeta_ethEthToken,
};
