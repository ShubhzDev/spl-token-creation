import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useEffect, useState } from 'react';
import { INTW_MINT } from '../config/solana';
import { getProgram, findStakingPoolAddress, findUserStakeAddress } from '../utils/program';
import { getTokenBalance } from '../utils/token';
import { StakingState } from '../types';
import { useToast } from './useToast';
import { BN } from '@coral-xyz/anchor';
import { SystemProgram, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';

export const useStaking = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stakingState, setStakingState] = useState<StakingState>({
    stakedAmount: 0,
    availableAmount: 0,
    rewards: 0,
    apy: 5,
  });

  const fetchStakingInfo = useCallback(async () => {
    if (!wallet.publicKey) return;

    try {
      setLoading(true);
      const program = getProgram(connection, wallet);
      const poolAddress = await findStakingPoolAddress(INTW_MINT);
      const userStakeAddress = await findUserStakeAddress(poolAddress, wallet.publicKey);

      const [poolAccount, userStakeAccount, availableAmount] = await Promise.all([
        program.account.stakingPool.fetch(poolAddress),
        program.account.userStake.fetch(userStakeAddress).catch(() => null),
        getTokenBalance(connection, wallet.publicKey, INTW_MINT),
      ]);

      setStakingState({
        stakedAmount: userStakeAccount ? Number(userStakeAccount.amount) / 1e9 : 0,
        availableAmount,
        rewards: userStakeAccount ? Number(userStakeAccount.rewards) / 1e9 : 0,
        apy: poolAccount.apy,
      });
    } catch (error) {
      console.error('Error fetching staking info:', error);
      showToast('Failed to fetch staking information', 'error');
    } finally {
      setLoading(false);
    }
  }, [wallet.publicKey, connection, showToast]);

  const stake = useCallback(async (amount: number) => {
    if (!wallet.publicKey || !wallet.signTransaction) return;

    try {
      setLoading(true);
      const program = getProgram(connection, wallet);
      const poolAddress = await findStakingPoolAddress(INTW_MINT);
      const userStakeAddress = await findUserStakeAddress(poolAddress, wallet.publicKey);

      await program.methods
        .stake(new BN(amount * 1e9))
        .accounts({
          user: wallet.publicKey,
          pool: poolAddress,
          userStake: userStakeAddress,
          tokenVault: (await program.account.stakingPool.fetch(poolAddress)).tokenVault,
          userTokenAccount: await getAssociatedTokenAddress(INTW_MINT, wallet.publicKey),
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      showToast(`Successfully staked ${amount} INTW`, 'success');
      await fetchStakingInfo();
    } catch (error) {
      console.error('Error staking:', error);
      showToast('Failed to stake tokens', 'error');
    } finally {
      setLoading(false);
    }
  }, [wallet, connection, fetchStakingInfo, showToast]);

  const unstake = useCallback(async (amount: number) => {
    if (!wallet.publicKey || !wallet.signTransaction) return;

    try {
      setLoading(true);
      const program = getProgram(connection, wallet);
      const poolAddress = await findStakingPoolAddress(INTW_MINT);
      const userStakeAddress = await findUserStakeAddress(poolAddress, wallet.publicKey);
      const poolAccount = await program.account.stakingPool.fetch(poolAddress);

      // Derive the pool authority PDA
      const [poolAuthorityPDA] = await PublicKey.findProgramAddress(
        [poolAddress.toBuffer()],
        program.programId
      );

      await program.methods
        .unstake(new BN(amount * 1e9))
        .accounts({
          user: wallet.publicKey,
          pool: poolAddress,
          pool_authority: poolAuthorityPDA,
          tokenVault: poolAccount.tokenVault,
          userTokenAccount: await getAssociatedTokenAddress(INTW_MINT, wallet.publicKey),
          userStake: userStakeAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      showToast(`Successfully unstaked ${amount} INTW`, 'success');
      await fetchStakingInfo();
    } catch (error) {
      console.error('Error unstaking:', error);
      showToast('Failed to unstake tokens', 'error');
    } finally {
      setLoading(false);
    }
  }, [wallet, connection, fetchStakingInfo, showToast]);

  useEffect(() => {
    fetchStakingInfo();
  }, [fetchStakingInfo]);

  return {
    stakingState,
    loading,
    stake,
    unstake,
  };
};