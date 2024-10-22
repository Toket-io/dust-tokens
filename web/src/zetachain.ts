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
  gateway: process.env.NEXT_PUBLIC_GATEWAY_ADDRESS! as `0x${string}`,
  tss: process.env.NEXT_PUBLIC_TSS_ADDRESS! as `0x${string}`,
  erc20custody: process.env
    .NEXT_PUBLIC_ERC_20_CUSTODY_ADDRESS! as `0x${string}`,
  usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS! as `0x${string}`,
  zeta: process.env.NEXT_PUBLIC_ZETA_ADDRESS! as `0x${string}`,
  dai: process.env.NEXT_PUBLIC_DAI_ADDRESS! as `0x${string}`,
  weth: process.env.NEXT_PUBLIC_WETH_ADDRESS! as `0x${string}`,
};

export const zetaAddresses: ChainAddresses = {
  gateway: process.env.NEXT_PUBLIC_ZETA_GATEWAY_ADDRESS! as `0x${string}`,
  fungibleModule: process.env
    .NEXT_PUBLIC_ZETA_FUNGIBLE_MODULE_ADDRESS! as `0x${string}`,
  systemContract: process.env
    .NEXT_PUBLIC_ZETA_SYSTEM_CONTRACT_ADDRESS! as `0x${string}`,
  usdc: process.env.NEXT_PUBLIC_ZETA_USDC_ETH! as `0x${string}`,
  zeta: process.env.NEXT_PUBLIC_ZETA_ZETA! as `0x${string}`,
  eth: process.env.NEXT_PUBLIC_ZETA_ETH! as `0x${string}`,
};
