import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { STAKING_PROGRAM_ID } from '../config/solana';
import stakingIdl from '../idl/staking.json';

export const getProgram = (connection: Connection, wallet: any) => {
  const provider = new AnchorProvider(
    connection,
    wallet,
    AnchorProvider.defaultOptions()
  );
  return new Program(stakingIdl as Idl, STAKING_PROGRAM_ID, provider);
};

export const findStakingPoolAddress = async (mint: PublicKey) => {
  const [poolAddress] = await PublicKey.findProgramAddress(
    [Buffer.from('staking_pool'), mint.toBuffer()],
    STAKING_PROGRAM_ID
  );
  return poolAddress;
};

export const findUserStakeAddress = async (
  poolAddress: PublicKey,
  userAddress: PublicKey
) => {
  const [stakeAddress] = await PublicKey.findProgramAddress(
    [Buffer.from('user_stake'), poolAddress.toBuffer(), userAddress.toBuffer()],
    STAKING_PROGRAM_ID
  );
  return stakeAddress;
};