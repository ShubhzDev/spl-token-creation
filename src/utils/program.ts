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

export const findStakingPoolAddress = async (mint: PublicKey) => {
  const [poolAddress] = await PublicKey.findProgramAddress(
    [Buffer.from('staking_pool'), mint.toBuffer()],
    PROGRAM_ID
  );
  return poolAddress;
};

export const findUserStakeAddress = async (
  poolAddress: PublicKey,
  userAddress: PublicKey
) => {
  const [stakeAddress] = await PublicKey.findProgramAddress(
    [Buffer.from('user_stake'), poolAddress.toBuffer(), userAddress.toBuffer()],
    PROGRAM_ID
  );
  return stakeAddress;
};