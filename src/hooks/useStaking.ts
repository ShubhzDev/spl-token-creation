import { useEffect, useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { web3 } from '@coral-xyz/anchor';
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
    if (!wallet.publicKey) return;

    try {
      const poolAddress = await findStakingPoolAddress(INTW_MINT);
      await initializePoolIfNeeded(poolAddress);

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
        // If user stake doesn't exist yet, set initial state with available amount
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

  const initializePoolIfNeeded = async (poolAddress: PublicKey) => {
    try {
      const poolInfo = await connection.getAccountInfo(poolAddress);
      if (!poolInfo) {
        const tokenVault = Keypair.generate();
        const [, bump] = await PublicKey.findProgramAddress(
          [Buffer.from('staking_pool'), INTW_MINT.toBuffer()],
          program.programId
        );

        await program.methods
          .initializePool(bump)
          .accounts({
            authority: wallet.publicKey,
            tokenMint: INTW_MINT,
            pool: poolAddress,
            tokenVault: tokenVault.publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([tokenVault])
          .rpc();
      }
    } catch (error) {
      console.error('Error initializing pool:', error);
      throw error;
    }
  };

  const stake = async (amount: number) => {
    if (!wallet.publicKey) return;

    try {
      const poolAddress = await findStakingPoolAddress(INTW_MINT);
      const userStakeAddress = await findUserStakeAddress(poolAddress, wallet.publicKey);
      const userTokenAccount = await getAssociatedTokenAddress(INTW_MINT, wallet.publicKey);

      await program.methods
        .stake(new BN(amount * 1e9))
        .accounts({
          user: wallet.publicKey,
          pool: poolAddress,
          tokenVault: (await program.account.stakingPool.fetch(poolAddress)).tokenVault,
          userTokenAccount,
          userStake: userStakeAddress,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      await fetchUserStake();
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
      const userTokenAccount = await getAssociatedTokenAddress(INTW_MINT, wallet.publicKey);
      const poolAuthorityPDA = PublicKey.findProgramAddressSync(
        [poolAddress.toBuffer()],
        program.programId
      )[0];

      await program.methods
        .unstake(new BN(amount * 1e9))
        .accounts({
          user: wallet.publicKey,
          pool: poolAddress,
          poolAuthority: poolAuthorityPDA,
          tokenVault: (await program.account.stakingPool.fetch(poolAddress)).tokenVault,
          userTokenAccount,
          userStake: userStakeAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      await fetchUserStake();
    } catch (error) {
      console.error('Error unstaking:', error);
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