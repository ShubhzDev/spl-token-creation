export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: number;
}

export interface StakingState {
  stakedAmount: number;
  availableAmount: number;
  rewards: number;
  apy: number;
}