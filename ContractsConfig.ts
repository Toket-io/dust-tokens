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
}

const defaultLocalnetConfig: ZetachainContracts = {
  // EVM Side
  evm_gateway: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  evm_erc20custody: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  evm_tss: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  evm_zetaToken: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  evm_usdcToken: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",
  // ZetaChain Side
  zeta_gateway: "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0",
  zeta_zetaToken: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  zeta_fungibleModule: "0x735b14BB79463307AAcBED86DAf3322B1e6226aB",
  zeta_systemContract: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
  zeta_usdcEthToken: "0x9fd96203f7b22bCF72d9DCb40ff98302376cE09c",
  zeta_ethEthToken: "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe",
};

const arbitrumForkedLocalnetConfig: ZetachainContracts = {
  // EVM Side
  evm_gateway: "0xc0692A034E71d0FAb0795d53e171a101f857Dd76",
  evm_erc20custody: "0x0127Bf9EA71b69dBa5246dEcc4523E8b46dB1604",
  evm_tss: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  evm_zetaToken: "0x748fA28c53a9307BF13ab41164723C133D59fa67",
  evm_usdcToken: "0xCc9f3144F1E57D4E3be528442452912ffcaa7b3c",
  evm_uniswapRouterV3: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  // ZetaChain Side
  zeta_gateway: "0x03701C609EA55bfE68AD06fc36760Cb25317eDBa",
  zeta_zetaToken: "0x9Bda88dA960e08Cc166D3e824109b5af3E376278",
  zeta_fungibleModule: "0x735b14BB79463307AAcBED86DAf3322B1e6226aB",
  zeta_systemContract: "0x93d027eCAbF0b383F61cFad54D7D8FcAE7972d33",
  zeta_uniswapRouterV2: "0x62153519C210d21f1B67dE11Cf60d6F467190707",
  zeta_usdcEthToken: "0x9fd96203f7b22bCF72d9DCb40ff98302376cE09c",
  zeta_ethEthToken: "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe",
};

const activeConfig = defaultLocalnetConfig;

export default activeConfig;
