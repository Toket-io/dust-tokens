interface ZetachainContracts {
  // EVM Side
  evm_uniswapRouterV3: `0x${string}`;
  evm_uniswapQuoterV3: `0x${string}`;
  evmDapp: `0x${string}`;

  // ZetaChain Side
  zeta_uniswapFactoryV2: `0x${string}`;
  zeta_universalDapp: `0x${string}`;

  // EVM ERC20s
  evm_weth: `0x${string}` | null;
}
const arbitrumForkedLocalnetConfig: ZetachainContracts = {
  // EVM Side
  evm_uniswapRouterV3: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  evm_uniswapQuoterV3: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
  evmDapp: "0xd6817E21c1770323F97BdC8981A67c1b9ad79eA9",

  // ZetaChain Side
  zeta_uniswapFactoryV2: "0xBA3c51FC0FF32e26Fe3a6bC5F001d933bDee9dD3",
  zeta_universalDapp: "0x2cE9eaaDa3eDe435E5c11b5645a849d82a6D7c80",

  // EVM ERC20s
  evm_weth: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
};

const activeConfig = arbitrumForkedLocalnetConfig;

export default activeConfig;
