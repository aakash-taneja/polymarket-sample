# Polymarket Trading Frontend

A modern React frontend application for placing trades on Polymarket prediction markets using MetaMask wallet integration.

## Features

- 🔗 **MetaMask Integration**: Connect your MetaMask wallet seamlessly
- 📊 **Market Discovery**: Browse active markets with volume and end dates
- 📈 **Real-time Order Book**: View current bids and asks for selected markets
- 💰 **Smart Trading**: Automatic price suggestions based on order book data
- 🎯 **Minimum Order Placement**: Automatically calculates minimum viable orders
- 🎨 **Modern UI**: Beautiful, responsive design with glassmorphism effects

## Prerequisites

- Node.js (v14 or higher)
- MetaMask browser extension
- USDC balance on Polygon network
- Basic understanding of prediction markets

## Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## Technical Notes

This project uses CRACO (Create React App Configuration Override) to configure webpack polyfills for Node.js modules required by the Polymarket CLOB client. The following polyfills are included:

- `buffer` - For Buffer operations
- `crypto-browserify` - For cryptographic functions
- `stream-http` & `https-browserify` - For HTTP requests
- `browserify-zlib` - For compression
- `util`, `url`, `stream-browserify` - For utility functions
- `assert`, `os-browserify`, `path-browserify` - For additional Node.js modules

## Setup Instructions

### 1. MetaMask Configuration

1. Install MetaMask browser extension
2. Add Polygon network to MetaMask:
   - Network Name: Polygon Mainnet
   - RPC URL: https://polygon-rpc.com
   - Chain ID: 137
   - Currency Symbol: MATIC
   - Block Explorer: https://polygonscan.com

### 2. Fund Your Wallet

1. **Get USDC on Polygon:**
   - Bridge USDC from Ethereum to Polygon using [Polygon Bridge](https://wallet.polygon.technology/polygon/bridge)
   - Or buy USDC directly on Polygon using a DEX like QuickSwap

2. **Minimum Balance:**
   - Ensure you have at least $10-20 USDC for trading
   - Keep some MATIC for transaction fees

### 3. Using the Application

1. **Connect Wallet:**
   - Click "Connect MetaMask" button
   - Approve the connection in MetaMask
   - Ensure you're on Polygon network

2. **Browse Markets:**
   - Click "Refresh Markets" to load active markets
   - Select a market from the list
   - View market details and order book

3. **Place a Trade:**
   - Choose Buy YES or Sell NO
   - Use suggested price or enter custom price
   - Enter order size (minimum shown)
   - Click "Place Order" and confirm in MetaMask

## Trading Strategy

The app automatically suggests optimal prices by:
- Analyzing current order book
- Placing orders between best bid and ask
- Ensuring minimum order size requirements
- Using conservative pricing for safety

## Technical Details

### Dependencies
- `@polymarket/clob-client`: Polymarket trading client
- `ethers`: Ethereum interaction library
- `react`: Frontend framework

### API Endpoints
- Polymarket Gamma API: Market data and token information
- Polymarket CLOB: Order placement and order book data

### Network
- Polygon Mainnet (Chain ID: 137)
- USDC token for trading

## Troubleshooting

### Common Issues

1. **"MetaMask not installed"**
   - Install MetaMask browser extension
   - Refresh the page

2. **"Wrong network"**
   - Switch to Polygon Mainnet in MetaMask
   - Add Polygon network if not available

3. **"Insufficient balance"**
   - Ensure you have USDC on Polygon
   - Keep some MATIC for gas fees

4. **"Order failed"**
   - Check if market is still active
   - Verify minimum order size
   - Ensure sufficient USDC balance

### Error Messages

- **"Failed to initialize trading client"**: Try reconnecting wallet
- **"Failed to fetch markets"**: Check internet connection
- **"Failed to place order"**: Verify market is active and you have sufficient funds

## Security Notes

- Never share your private keys
- Always verify transactions in MetaMask
- Start with small amounts to test
- Be aware of market risks and volatility

## Support

For issues with:
- **Polymarket API**: Check [Polymarket Docs](https://docs.polymarket.com)
- **MetaMask**: Visit [MetaMask Support](https://support.metamask.io)
- **Polygon Network**: Check [Polygon Docs](https://docs.polygon.technology)

## License

This project is for educational purposes. Use at your own risk.
