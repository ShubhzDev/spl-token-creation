import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from './constants';
import  Staking_IDL from '../idl/staking.json';
import type { StakingProgram } from '../idl/staking.ts';

export const getProgram = (connection: Connection, wallet: any) => {
  const provider = new AnchorProvider(
    connection,
    wallet,
    AnchorProvider.defaultOptions()
  );

  return new Program(
    Staking_IDL as Idl,
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