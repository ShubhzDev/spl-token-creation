import { clusterApiUrl, PublicKey } from '@solana/web3.js';

export const SOLANA_NETWORK = 'devnet';
export const SOLANA_RPC_ENDPOINT = clusterApiUrl(SOLANA_NETWORK);

// Replace with your deployed program ID
export const STAKING_PROGRAM_ID = new PublicKey('HD2Ya6ng1icMrKyxdB74xC5fbud2zYyFwieQcbtGQS3k');
export const INTW_MINT = new PublicKey('38yL1udWqBvxw7PkLSbHCGj59dyiUeiqiCK6jf25nc5m');

export const APY = 5; // 5% APY