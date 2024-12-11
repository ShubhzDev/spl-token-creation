import { Buffer } from 'buffer';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SolanaWalletProvider } from './contexts/SolanaWalletProvider';
import './index.css';

// Polyfill Buffer for Solana web3.js
window.Buffer = Buffer;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SolanaWalletProvider>
      <App />
    </SolanaWalletProvider>
  </StrictMode>
);