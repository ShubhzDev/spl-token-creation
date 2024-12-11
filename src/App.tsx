import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { StakingCard } from './components/StakingCard';
import { StatsCard } from './components/StatsCard';
import { useStaking } from './hooks/useStaking';

function App() {
  const { connected } = useWallet();
  const { stakingState, stake, unstake } = useStaking();
  const dailyRewards = (stakingState.stakedAmount * stakingState.apy) / 365 / 100;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">INTW Staking</h1>
            <WalletMultiButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {connected ? (
          <div className="grid gap-6 md:grid-cols-2">
            <StakingCard
              availableAmount={stakingState.availableAmount}
              stakedAmount={stakingState.stakedAmount}
              onStake={stake}
              onUnstake={unstake}
            />
            <StatsCard
              stakedAmount={stakingState.stakedAmount}
              apy={stakingState.apy}
              dailyRewards={dailyRewards}
            />
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-700">
              Please connect your wallet to start staking
            </h2>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;