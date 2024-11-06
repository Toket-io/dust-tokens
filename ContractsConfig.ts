interface ZetachainContracts {
  // EVM Side
  evm_gateway: `0x${string}`;
  evm_erc20custody: `0x${string}`;
  evm_tss: `0x${string}`;
  evm_zetaToken: `0x${string}`;
  evm_usdcToken: `0x${string}`;
  evm_uniswapRouterV3: `0x${string}`;
  evmDapp: `0x${string}`;

  // ZetaChain Side
  zeta_gateway: `0x${string}`;
  zeta_zetaToken: `0x${string}`;
  zeta_fungibleModule: `0x${string}`;
  zeta_systemContract: `0x${string}`;
  zeta_uniswapRouterV2: `0x${string}`;
  zeta_usdcEthToken: `0x${string}`;
  zeta_ethEthToken: `0x${string}`;
  zeta_universalDapp: `0x${string}`;

  // EVM ERC20s
  evm_weth: `0x${string}` | null;
}

const defaultLocalnetConfig: ZetachainContracts = {
  // EVM Side
  evm_gateway: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  evm_erc20custody: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  evm_tss: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  evm_zetaToken: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  evm_usdcToken: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",
  evm_uniswapRouterV3: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  evmDapp: "",

  // ZetaChain Side
  zeta_gateway: "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0",
  zeta_zetaToken: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  zeta_fungibleModule: "0x735b14BB79463307AAcBED86DAf3322B1e6226aB",
  zeta_systemContract: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
  zeta_usdcEthToken: "0x9fd96203f7b22bCF72d9DCb40ff98302376cE09c",
  zeta_ethEthToken: "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe",
  zeta_universalDapp: "",

  // EVM ERC20s
  evm_weth: null,
};

const arbitrumForkedLocalnetConfig: ZetachainContracts = {
  // EVM Side
  evm_gateway: "0x9Bda88dA960e08Cc166D3e824109b5af3E376278",
  evm_erc20custody: "0x62153519C210d21f1B67dE11Cf60d6F467190707",
  evm_tss: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  evm_zetaToken: "0x90Dd5250fD06b9E6E3d048cAF7f26Da609cb67cC",
  evm_usdcToken: "0xDeb76598eDce92ae77F2D4f88542ED2C91b8De82",
  evm_uniswapRouterV3: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  evmDapp: "0x27F9aFE3B3fCb63ae1A6c662331698F2183809bF",

  // ZetaChain Side
  zeta_gateway: "0x58F5a2711c7464B950361529ca81713B35D487b1",
  zeta_zetaToken: "0x03701C609EA55bfE68AD06fc36760Cb25317eDBa",
  zeta_fungibleModule: "0x735b14BB79463307AAcBED86DAf3322B1e6226aB",
  zeta_systemContract: "0x9674f70c5cEb61f990977D325AbF2C0201a4c520",
  zeta_uniswapRouterV2: "0x62153519C210d21f1B67dE11Cf60d6F467190707",
  zeta_usdcEthToken: "0x9fd96203f7b22bCF72d9DCb40ff98302376cE09c",
  zeta_ethEthToken: "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe",
  zeta_universalDapp: "0xD516492bb58F07bc91c972DCCB2DF654653d4D33",

  // EVM ERC20s
  evm_weth: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
};

const activeConfig = arbitrumForkedLocalnetConfig;

export default activeConfig;
