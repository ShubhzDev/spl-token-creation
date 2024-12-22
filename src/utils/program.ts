import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from './constants';
import StakingIDL from '../idl/staking.json';

// Import the IDL type
import { StakingProgram } from '../idl/types';

export const getProgram = (connection: Connection, wallet: any) => {
  const provider = new AnchorProvider(
    connection,
    wallet,
    AnchorProvider.defaultOptions()
  );

  // Create program with proper typing
  return new Program<StakingProgram>(
    StakingIDL as StakingProgram,
    provider
  );
};

// export const findStakingPoolAddress = async (mint: PublicKey): Promise<PublicKey> => {
//   const [poolAddress] = await PublicKey.findProgramAddress(
//     [
//       Buffer.from('staking_pool'),
//       mint.toBuffer()
//     ],
//     PROGRAM_ID
//   );
//   return poolAddress;
// };

// export const findUserStakeAddress = async (
//   poolAddress: PublicKey,
//   userAddress: PublicKey
// ): Promise<PublicKey> => {
//   const [stakeAddress] = await PublicKey.findProgramAddress(
//     [
//       Buffer.from('user_stake'),
//       poolAddress.toBuffer(),
//       userAddress.toBuffer()
//     ],
//     PROGRAM_ID
//   );
//   return stakeAddress;
// };

export const findTokenMintAddress = async (authority: PublicKey): Promise<PublicKey> => {
  const [mintAddress] = await PublicKey.findProgramAddress(
    [
      Buffer.from('token_mint'),
      authority.toBuffer()
    ],
    PROGRAM_ID
  );
  return mintAddress;
};

export const findStakingPoolAddress = async (tokenMint: PublicKey): Promise<PublicKey> => {
  const [poolAddress] = await PublicKey.findProgramAddress(
    [
      Buffer.from('staking_pool'),
      tokenMint.toBuffer()
    ],
    PROGRAM_ID
  );
  return poolAddress;
};

export const findTokenVaultAddress = async (tokenMint: PublicKey): Promise<PublicKey> => {
  const [vaultAddress] = await PublicKey.findProgramAddress(
    [
      Buffer.from('token_vault'),
      tokenMint.toBuffer()
    ],
    PROGRAM_ID
  );
  return vaultAddress;
};

export const findUserStakeAddress = async (
  poolAddress: PublicKey,
  userAddress: PublicKey
): Promise<PublicKey> => {
  const [stakeAddress] = await PublicKey.findProgramAddress(
    [
      Buffer.from('user_stake'),
      poolAddress.toBuffer(),
      userAddress.toBuffer()
    ],
    PROGRAM_ID
  );
  return stakeAddress;
};