import React from 'react';
import { TrendingUpIcon } from 'lucide-react';

interface StatsCardProps {
  stakedAmount: number;
  apy: number;
  dailyRewards: number;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  stakedAmount,
  apy,
  dailyRewards,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUpIcon className="w-6 h-6 text-green-600" />
        <h2 className="text-2xl font-bold">Staking Stats</h2>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Staked</span>
          <span className="font-semibold">{stakedAmount.toFixed(2)} INTW</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Current APY</span>
          <span className="font-semibold text-green-600">{apy}%</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Daily Rewards</span>
          <span className="font-semibold text-green-600">
            {dailyRewards.toFixed(4)} INTW
          </span>
        </div>
      </div>
    </div>
  );
};