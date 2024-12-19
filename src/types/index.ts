import { PublicKey } from '@solana/web3.js';

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

export interface StakingPool {
  authority: PublicKey;
  tokenMint: PublicKey;
  tokenVault: PublicKey;
  bump: number;
  totalStaked: number;
  apy: number;
}

export interface UserStake {
  user: PublicKey;
  pool: PublicKey;
  amount: number;
  lastUpdate: number;
  rewards: number;
}