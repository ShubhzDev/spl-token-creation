import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from './constants';
import StakingIDL from '../idl/staking.json';

export const getProgram = (connection: Connection, wallet: any) => {
  const provider = new AnchorProvider(
    connection,
    wallet,
    AnchorProvider.defaultOptions()
  );

  return new Program(
    StakingIDL as Idl,
    provider
  );
};

export const findStakingPoolAddress = async (mint: PublicKey) => {
  const [poolAddress, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('staking_pool'),
      mint.toBuffer()
    ],
    PROGRAM_ID
  );
  return { poolAddress, bump };
};

export const findUserStakeAddress = async (
  poolAddress: PublicKey,
  userAddress: PublicKey
) => {
  const [stakeAddress] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('user_stake'),
      poolAddress.toBuffer(),
      userAddress.toBuffer()
    ],
    PROGRAM_ID
  );
  return stakeAddress;
};

export const findTokenVault = async (mint: PublicKey) => {
  const [vaultAddress] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('token_vault'),
      mint.toBuffer()
    ],
    PROGRAM_ID
  );
  return vaultAddress;
};