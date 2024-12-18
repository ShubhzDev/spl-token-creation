import { clusterApiUrl, PublicKey } from '@solana/web3.js';

export const SOLANA_NETWORK = 'devnet';
export const SOLANA_RPC_ENDPOINT = clusterApiUrl(SOLANA_NETWORK);

// Replace with your deployed program ID
export const STAKING_PROGRAM_ID = new PublicKey('HD2Ya6ng1icMrKyxdB74xC5fbud2zYyFwieQcbtGQS3k');
export const INTW_MINT = new PublicKey('AxUiAtzQMvWP2zCXVyd7YGTRnjE4KitQy6PXu33YrMcx');

export const APY = 5; // 5% APY