export interface Token {
  name: string;
  symbol: string;
  decimals: number;
  balance: number;
  address: string;
}

export type SelectedToken = Token & {
  amount: string;
  isMax: boolean;
  hasPermit2Allowance: boolean;
};

export type Network = {
  id: number;
  value: string;
  label: string;
  enabled: boolean;
  rpc: string;
  contractAddress: string;
  zrc20Address: string;
  nativeToken: Token;
};

export type TransactionState =
  | "notStarted"
  | "sourcePending"
  | "zetaPending"
  | "destinationPending"
  | "completed";
