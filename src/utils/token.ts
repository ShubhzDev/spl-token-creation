import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';

export const getTokenBalance = async (
  connection: Connection,
  walletAddress: PublicKey,
  mintAddress: PublicKey
): Promise<number> => {
  try {
    const tokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      walletAddress,
      false,
      TOKEN_PROGRAM_ID
    );

    const balance = await connection.getTokenAccountBalance(tokenAccount);
    return balance.value.uiAmount || 0;
  } catch (error) {
    console.error('Error getting token balance:', error);
    return 0;
  }
};