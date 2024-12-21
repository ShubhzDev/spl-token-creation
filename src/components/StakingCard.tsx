import React, { useState } from 'react';
import { CoinsIcon } from 'lucide-react';

interface StakingCardProps {
  availableAmount: number;
  stakedAmount: number;
  onStake: (amount: number) => void;
  onUnstake: (amount: number) => void;
}

export const StakingCard: React.FC<StakingCardProps> = ({
  availableAmount,
  stakedAmount,
  onStake,
  onUnstake,
}) => {
  const [amount, setAmount] = useState('');

  const handleStake = () => {
    const value = parseFloat(amount);
    // if (!isNaN(value) && value > 0 && value <= availableAmount) {
      onStake(value);
      setAmount('');
    // }
  };

  const handleUnstake = () => {
    const value = parseFloat(amount);
    if (!isNaN(value) && value > 0 && value <= stakedAmount) {
      onUnstake(value);
      setAmount('');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
      <div className="flex items-center gap-2 mb-6">
        <CoinsIcon className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold">Stake INTW</h2>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span>Available: {availableAmount.toFixed(2)} INTW</span>
          <span>Staked: {stakedAmount.toFixed(2)} INTW</span>
        </div>

        <div className="space-y-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleStake}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Stake
            </button>
            <button
              onClick={handleUnstake}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Unstake
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};