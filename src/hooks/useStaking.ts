import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { web3 } from '@coral-xyz/anchor';
import { INTW_MINT, APY } from '../config/solana';
import { StakingState } from '../types';
import { getProgram, findStakingPoolAddress, findUserStakeAddress, findTokenVault,findPoolAuthorityAddress } from '../utils/program';
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

  const initializePoolIfNeeded = async () => {
    try {
      const { poolAddress, bump } = await findStakingPoolAddress(INTW_MINT);
      const poolInfo = await connection.getAccountInfo(poolAddress);
      
      if (!poolInfo && wallet.publicKey) {
        const tokenVault = await findTokenVault(INTW_MINT);

        const tx = await program.methods
          .initializePool(bump)
          .accounts({
            authority: wallet.publicKey,
            tokenMint: INTW_MINT,
            pool: poolAddress,
            tokenVault: tokenVault,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: web3.SYSVAR_RENT_PUBKEY,
          })
          .rpc();

        await connection.confirmTransaction(tx, 'confirmed');
        return bump;
      }
      return bump;
    } catch (error) {
      console.error('Error initializing pool:', error);
      throw error;
    }
  };

  const stake = async (amount: number) => {
    if (!wallet.publicKey) return;

    try {
      const { poolAddress } = await findStakingPoolAddress(INTW_MINT);
      const userStakeAddress = await findUserStakeAddress(poolAddress, wallet.publicKey);
      const userTokenAccount = await getAssociatedTokenAddress(INTW_MINT, wallet.publicKey);
      const tokenVault = await findTokenVault(INTW_MINT);

      console.log("Staking Pool Address:", poolAddress.toBase58());
      console.log("User Stake Address:", userStakeAddress.toBase58());
      console.log("User Token Account:", userTokenAccount.toBase58());
      console.log("Token Vault Address:", tokenVault.toBase58());

      const bump = await initializePoolIfNeeded();

      const tx = await program.methods
        .stake(new BN(amount * 1e9))
        .accounts({
          user: wallet.publicKey,
          pool: poolAddress,
          tokenMint: INTW_MINT,
          tokenVault: tokenVault,
          userTokenAccount,
          userStake: userStakeAddress,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      await connection.confirmTransaction(tx, 'confirmed');
      await fetchUserStake();
    } catch (error) {
      console.error('Error staking:', error);
      throw error;
    }
  };

  const unstake = async (amount: number) => {
    if (!wallet.publicKey) return;

    try {
      const { poolAddress } = await findStakingPoolAddress(INTW_MINT);
      const pool = await program.account.stakingPool.fetch(poolAddress);
      const userStakeAddress = await findUserStakeAddress(poolAddress, wallet.publicKey);
      const userTokenAccount = await getAssociatedTokenAddress(INTW_MINT, wallet.publicKey);
      const tokenVault = await findTokenVault(INTW_MINT);

      const tx = await program.methods
        .unstake(new BN(amount * 1e9))
        .accounts({
          user: wallet.publicKey,
          pool: poolAddress,
          tokenVault: tokenVault,
          userTokenAccount,
          tokenMint: INTW_MINT,
          userStake: userStakeAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      await connection.confirmTransaction(tx, 'confirmed');
      await fetchUserStake();
    } catch (error) {
      console.error('Error unstaking:', error);
      throw error;
    }
  };

  const fetchUserStake = async () => {
    if (!wallet.publicKey) return;

    try {
      const { poolAddress } = await findStakingPoolAddress(INTW_MINT);
      const pool = await program.account.stakingPool.fetch(poolAddress);
      const userStakeAddress = await findUserStakeAddress(poolAddress, wallet.publicKey);
      const availableAmount = await getTokenBalance(connection, wallet.publicKey, INTW_MINT);

      try {
        const userStake = await program.account.userStake.fetch(userStakeAddress);
        setStakingState({
          stakedAmount: userStake.amount.toNumber() / 1e9,
          availableAmount,
          rewards: userStake.rewards.toNumber() / 1e9,
          apy: APY,
        });
      } catch (error) {
        setStakingState({
          ...initialState,
          availableAmount,
        });
      }
    } catch (error) {
      console.error('Error fetching user stake:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (wallet.publicKey) {
      fetchUserStake();
    } else {
      setStakingState(initialState);
    }
  }, [wallet.publicKey, connection]);

  return {
    stakingState,
    stake,
    unstake,
  };
};