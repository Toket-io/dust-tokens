interface ZetachainContracts {
  // EVM Side
  evm_uniswapRouterV3: `0x${string}`;
  evmDapp: `0x${string}`;

  // ZetaChain Side
  zeta_uniswapFactoryV2: `0x${string}`;
  zeta_universalDapp: `0x${string}`;

  // EVM ERC20s
  evm_weth: `0x${string}` | null;
}

const defaultLocalnetConfig: ZetachainContracts = {
  // EVM Side
  evm_uniswapRouterV3: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  evmDapp: "0x",

  // ZetaChain Side
  zeta_uniswapFactoryV2: "0x",
  zeta_universalDapp: "0x",

  // EVM ERC20s
  evm_weth: null,
};

const arbitrumForkedLocalnetConfig: ZetachainContracts = {
  // EVM Side
  evm_uniswapRouterV3: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  evmDapp: "0x536ADf9f074159B303001DF782ceeCF8e8f92dC5",

  // ZetaChain Side
  zeta_uniswapFactoryV2: "0xBA3c51FC0FF32e26Fe3a6bC5F001d933bDee9dD3",
  zeta_universalDapp: "0xB366d941E045F40c953C68b191E24E6acB54b33D",

  // EVM ERC20s
  evm_weth: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
};

const activeConfig = arbitrumForkedLocalnetConfig;

export default activeConfig;
