import React from 'react';
import { Wallet } from 'lucide-react';

interface WalletButtonProps {
  connected: boolean;
  address: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const WalletButton: React.FC<WalletButtonProps> = ({
  connected,
  address,
  onConnect,
  onDisconnect,
}) => {
  return (
    <button
      onClick={connected ? onDisconnect : onConnect}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      <Wallet className="w-5 h-5" />
      {connected ? (
        <span>{`${address?.slice(0, 4)}...${address?.slice(-4)}`}</span>
      ) : (
        'Connect Wallet'
      )}
    </button>
  );
};