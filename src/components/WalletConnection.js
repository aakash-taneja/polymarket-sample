import React, { useState } from 'react';
import './WalletConnection.css';

const WalletConnection = ({ onConnect }) => {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const connectWallet = async () => {
    try {
      setConnecting(true);
      setError(null);

      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please make sure MetaMask is unlocked.');
      }

      // Create provider using ethers
      const { ethers } = await import('ethers');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Get the signer
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      console.log('Connected to MetaMask:', address);
      onConnect(address, provider);
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="wallet-connection">
      <div className="connection-card">
        <div className="metamask-icon">
          🦊
        </div>
        <h2>Connect Your Wallet</h2>
        <p>Connect your MetaMask wallet to start trading on Polymarket</p>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <button 
          onClick={connectWallet}
          disabled={connecting}
          className="connect-btn"
        >
          {connecting ? (
            <>
              <div className="spinner-small"></div>
              Connecting...
            </>
          ) : (
            'Connect MetaMask'
          )}
        </button>

        <div className="requirements">
          <h4>Requirements:</h4>
          <ul>
            <li>MetaMask extension installed</li>
            <li>Polygon network configured</li>
            <li>USDC balance for trading</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WalletConnection;
