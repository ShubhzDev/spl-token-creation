import { useEffect, useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { INTW_MINT, APY } from '../config/solana';
import { StakingState } from '../types';
import { getProgram, findStakingPoolAddress, findUserStakeAddress } from '../utils/program';
import { getTokenBalance } from '../utils/token';

const initialState: StakingState = {
  stakedAmount: 0,
  availableAmount: 0,
  rewards: 0,
  apy: APY,
};

export const useStaking = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [stakingState, setStakingState] = useState<StakingState>(initialState);
  const program = getProgram(connection, wallet);

  const fetchUserStake = async () => {
    if (!wallet.publicKey) return null;

    try {
      const poolAddress = await findStakingPoolAddress(INTW_MINT);
      const userStakeAddress = await findUserStakeAddress(poolAddress, wallet.publicKey);

      // Check if user stake account exists
      const accountInfo = await connection.getAccountInfo(userStakeAddress);
      
      // If account doesn't exist, initialize it
      if (!accountInfo) {
        await program.methods
          .stake(new BN(0))
          .accounts({
            user: wallet.publicKey,
            pool: poolAddress,
            tokenVault: (await program.account.stakingPool.fetch(poolAddress)).tokenVault,
            userTokenAccount: await getAssociatedTokenAddress(INTW_MINT, wallet.publicKey),
            userStake: userStakeAddress,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
      }

      const userStake = await program.account.userStake.fetch(userStakeAddress);
      return userStake;
    } catch (error) {
      console.error('Error fetching user stake:', error);
      return null;
    }
  };

  const updateStakingState = useCallback(async () => {
    if (!wallet.publicKey) {
      setStakingState(initialState);
      return;
    }

    try {
      const [userStake, availableAmount] = await Promise.all([
        fetchUserStake(),
        getTokenBalance(connection, wallet.publicKey, INTW_MINT),
      ]);

      setStakingState({
        stakedAmount: userStake ? userStake.amount.toNumber() / 1e9 : 0,
        availableAmount,
        rewards: userStake ? userStake.rewards.toNumber() / 1e9 : 0,
        apy: APY,
      });
    } catch (error) {
      console.error('Error updating staking state:', error);
    }
  }, [wallet.publicKey, connection]);

  const stake = async (amount: number) => {
    if (!wallet.publicKey) return;

    try {
      const poolAddress = await findStakingPoolAddress(INTW_MINT);
      const userStakeAddress = await findUserStakeAddress(poolAddress, wallet.publicKey);
      const poolAccount = await program.account.stakingPool.fetch(poolAddress);

      await program.methods
        .stake(new BN(amount * 1e9))
        .accounts({
          user: wallet.publicKey,
          pool: poolAddress,
          tokenVault: poolAccount.tokenVault,
          userTokenAccount: await getAssociatedTokenAddress(INTW_MINT, wallet.publicKey),
          userStake: userStakeAddress,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      await updateStakingState();
    } catch (error) {
      console.error('Error staking:', error);
      throw error;
    }
  };

  const unstake = async (amount: number) => {
    if (!wallet.publicKey) return;

    try {
      const poolAddress = await findStakingPoolAddress(INTW_MINT);
      const userStakeAddress = await findUserStakeAddress(poolAddress, wallet.publicKey);
      const poolAccount = await program.account.stakingPool.fetch(poolAddress);
      const [poolAuthorityPDA] = await PublicKey.findProgramAddress(
        [poolAddress.toBuffer()],
        program.programId
      );

      await program.methods
        .unstake(new BN(amount * 1e9))
        .accounts({
          user: wallet.publicKey,
          pool: poolAddress,
          poolAuthority: poolAuthorityPDA,
          token_vault: poolAccount.tokenVault,
          user_token_account: await getAssociatedTokenAddress(INTW_MINT, wallet.publicKey),
          user_stake: userStakeAddress,
          token_program: TOKEN_PROGRAM_ID,
        })
        .rpc();

      await updateStakingState();
    } catch (error) {
      console.error('Error unstaking:', error);
      throw error;
    }
  };

  useEffect(() => {
    updateStakingState();
  }, [updateStakingState]);

  return {
    stakingState,
    stake,
    unstake,
  };
};