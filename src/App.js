import React, { useState, useEffect } from 'react';
import './App.css';
import WalletConnection from './components/WalletConnection';
import MarketSelector from './components/MarketSelector';
import OrderBook from './components/OrderBook';
import TradeInterface from './components/TradeInterface';
import { ClobClient, OrderType } from '@polymarket/clob-client';
import { ethers } from 'ethers';

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [clobClient, setClobClient] = useState(null);
  const [clobClientReady, setClobClientReady] = useState(false);
  const [apiCredentials, setApiCredentials] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [orderBook, setOrderBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usdcAllowance, setUsdcAllowance] = useState(null);
  const [usdcBalance, setUsdcBalance] = useState(null);

  // Global error handler for WebSocket and other unhandled errors
  useEffect(() => {
    const handleError = (event) => {
      if (event.error && event.error.message && event.error.message.includes('WebSocket')) {
        console.warn('WebSocket error caught and handled:', event.error.message);
        // Don't show WebSocket errors to the user as they don't affect core functionality
        event.preventDefault();
      }
    };

    const handleUnhandledRejection = (event) => {
      if (event.reason && event.reason.message && event.reason.message.includes('WebSocket')) {
        console.warn('WebSocket promise rejection caught and handled:', event.reason.message);
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Initialize CLOB client when wallet is connected
  useEffect(() => {
    if (account && provider) {
      initializeClobClient();
    }
  }, [account, provider]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check USDC status when wallet connects
  useEffect(() => {
    if (account && provider) {
      checkUSDCStatus();
    }
  }, [account, provider]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check USDC balance and allowance
  const checkUSDCStatus = async () => {
    try {
      if (!provider || !account) return;

      const signer = provider.getSigner();
      
      // USDC contract address on Polygon
      const USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
      
      // Create USDC contract instance
      const usdcContract = new ethers.Contract(
        USDC_ADDRESS,
        [
          "function balanceOf(address account) view returns (uint256)",
          "function allowance(address owner, address spender) view returns (uint256)",
          "function decimals() view returns (uint8)"
        ],
        signer
      );

      // Get USDC balance
      const balance = await usdcContract.balanceOf(account);
      const decimals = await usdcContract.decimals();
      const formattedBalance = ethers.utils.formatUnits(balance, decimals);
      setUsdcBalance(formattedBalance);

      const spenderAddress = "0x2d6454a32A77B67Cb52B33f5a38112402c24F2b8";
      // Get current allowance
      const allowance = await usdcContract.allowance(account, spenderAddress);
      const formattedAllowance = ethers.utils.formatUnits(allowance, decimals);
      setUsdcAllowance(formattedAllowance);

      console.log('USDC Status:', {
        balance: formattedBalance,
        allowance: formattedAllowance,
        spenderAddress: spenderAddress
      });

      return {
        balance: formattedBalance,
        allowance: formattedAllowance,
        spenderAddress: spenderAddress,
        usdcContract: usdcContract
      };
    } catch (error) {
      console.error('Failed to check USDC status:', error);
      return null;
    }
  };

  // Approve USDC allowance
  const approveUSDC = async (amount = "1000") => {
    try {
      if (!provider || !account) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      const signer = provider.getSigner();
      
      // USDC contract address on Polygon
      const USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
      
      // Create USDC contract instance
      const usdcContract = new ethers.Contract(
        USDC_ADDRESS,
        [
          "function approve(address spender, uint256 amount) returns (bool)",
          "function decimals() view returns (uint8)"
        ],
        signer
      );

      const spenderAddress = "0x2d6454a32A77B67Cb52B33f5a38112402c24F2b8";

      const decimals = await usdcContract.decimals();
      const approvalAmount = ethers.utils.parseUnits(amount, decimals);

      console.log('Approving USDC allowance:', {
        spender: spenderAddress,
        amount: amount,
        amountWei: approvalAmount.toString()
      });

      // Approve USDC spending
      const tx = await usdcContract.approve(spenderAddress, approvalAmount);
      console.log('USDC approval transaction:', tx.hash);
      
      // Wait for transaction confirmation
      await tx.wait();
      console.log('USDC allowance approved successfully!');

      // Refresh USDC status
      await checkUSDCStatus();

      return tx;
    } catch (error) {
      console.error('USDC approval failed:', error);
      setError(`USDC approval failed: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const initializeClobClient = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Starting CLOB client initialization...');
      const host = 'https://clob.polymarket.com';
      const signer = provider.getSigner();
      
      // Create a temporary client to generate API credentials
      const tempClient = new ClobClient(host, 137, signer);
      
      console.log('Creating/deriving API key...');
      try {
        // Create API key with single attempt and longer timeout
        let credentials = null;
        
        console.log('Calling tempClient.createOrDeriveApiKey()...');
        console.log('⚠️  IMPORTANT: Please check MetaMask for a signing request and approve it!');
        
        const startTime = Date.now();
        
        // Use only the standard method with longer timeout
        const apiKeyPromise = tempClient.createOrDeriveApiKey();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API key creation timeout')), 60000) // Increased to 60 seconds
        );
        
        console.log('Waiting for API key creation...');
        credentials = await Promise.race([apiKeyPromise, timeoutPromise]);
        const endTime = Date.now();
        console.log(`API credentials created successfully in ${endTime - startTime}ms:`, credentials);
        setApiCredentials(credentials);
        
        // Now create the actual client with credentials
        console.log('Creating CLOB client with API credentials...');
        const client = new ClobClient(host, 137, signer, credentials, 2, "0x2d6454a32A77B67Cb52B33f5a38112402c24F2b8");
        
        // Handle potential WebSocket connection issues gracefully
        if (client && typeof client.subscribe === 'function') {
          try {
            // Try to set up WebSocket subscription with error handling
            console.log('Setting up WebSocket subscriptions...');
          } catch (wsError) {
            console.warn('WebSocket setup failed, but client will still work for REST API calls:', wsError);
          }
        }
        
        setClobClient(client);
        setClobClientReady(true);
        
        console.log('CLOB client initialized successfully with API credentials');
      } catch (apiKeyError) {
        console.error('API key creation failed:', apiKeyError);
        throw new Error(`Failed to create API credentials: ${apiKeyError.message}`);
      }
    } catch (err) {
      console.error('Failed to initialize CLOB client:', err);
      setError(`Failed to initialize trading client: ${err.message}`);
      setClobClientReady(false);
      setApiCredentials(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarkets = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use CRA proxy (setupProxy.js)
      const response = await fetch('/api/polymarket/markets?ascending=false&volume_num_min=1000&closed=false&limit=10');
      
      if (!response.ok) {
        throw new Error('Failed to fetch markets');
      }

      const marketsData = await response.json();
      const activeMarkets = [];

      for (const market of marketsData) {
        if (market.active && market.volume > 0) {
          // Get token IDs for this market
          const tokensResponse = await fetch(`/api/polymarket/markets/${market.id}`);
          if (tokensResponse.ok) {
            const marketData = await tokensResponse.json();
            let tokens = marketData.clobTokenIds || '';
            tokens = JSON.parse(tokens);
            
            if (tokens.length >= 2) {
              activeMarkets.push({
                id: market.id,
                question: market.question,
                yesTokenId: tokens[0],
                noTokenId: tokens[1],
                endDate: market.endDate,
                volume: market.volume,
                description: market.description || market.question,
                // Add market configuration for order placement
                orderPriceMinTickSize: market.orderPriceMinTickSize || 0.01,
                orderMinSize: market.orderMinSize || 5,
                negRisk: market.negRisk || false,
                acceptingOrders: market.acceptingOrders || true
              });
            }
          }
        }
      }

      setMarkets(activeMarkets);
      console.log('Fetched markets:', activeMarkets);
    } catch (err) {
      console.error('Failed to fetch markets:', err);
      setError('Failed to fetch markets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkMarketOrderBook = async (tokenId) => {
    try {
      console.log('Fetching order book for token:', tokenId);
      
      if (!clobClient || !clobClientReady) {
        console.warn('CLOB client not ready, using mock data for now');
        // Return mock order book data for testing
        return {
          bids: [
            { price: "0.00", size: "100" },
            { price: "0.00", size: "200" },
            { price: "0.00", size: "150" }
          ],
          asks: [
            { price: "0.00", size: "100" },
            { price: "0.00", size: "200" },
            { price: "0.00", size: "150" }
          ],
          min_order_size: "0"
        };
      }

      const orderBookData = await clobClient.getOrderBook(tokenId);
      console.log('Order book data received:', orderBookData);
      return orderBookData;
    } catch (err) {
      console.error('Failed to fetch order book:', err);
      console.log('Using mock data as fallback');
      // Return mock data as fallback
      return {
        bids: [
          { price: "0.00", size: "100" },
          { price: "0.00", size: "200" },
          { price: "0.00", size: "150" }
        ],
        asks: [
          { price: "0.00", size: "100" },
          { price: "0.00", size: "200" },
          { price: "0.00", size: "150" }
        ],
        min_order_size: "0"
      };
    }
  };

  const placeOrder = async (tokenId, price, size, side) => {
    try {
      if (!clobClient || !clobClientReady) {
        throw new Error('CLOB client not initialized or not ready');
      }

      if (!apiCredentials) {
        throw new Error('API credentials not available. Please reconnect your wallet.');
      }

      setLoading(true);
      setError(null);

      // Get the selected market to access its configuration
      if (!selectedMarket) {
        throw new Error('No market selected');
      }

      // Check USDC status before placing order
      console.log('Checking USDC status before placing order...');
      const usdcStatus = await checkUSDCStatus();
      
      if (!usdcStatus) {
        throw new Error('Failed to check USDC status');
      }

      // Calculate required USDC amount for the order
      const requiredUSDC = parseFloat(price) * parseFloat(size);
      const currentAllowance = parseFloat(usdcStatus.allowance);
      const currentBalance = parseFloat(usdcStatus.balance);

      console.log('USDC Check:', {
        requiredUSDC: requiredUSDC,
        currentBalance: currentBalance,
        currentAllowance: currentAllowance
      });

      // Check if user has enough USDC balance
      if (currentBalance < requiredUSDC) {
        throw new Error(`Insufficient USDC balance. Required: ${requiredUSDC.toFixed(2)} USDC, Available: ${currentBalance.toFixed(2)} USDC`);
      }

      // Check if allowance is sufficient
      if (currentAllowance < requiredUSDC) {
        console.log('Insufficient USDC allowance. Requesting approval...');
        
        // Calculate approval amount (approve 2x the required amount for safety)
        const approvalAmount = Math.max(requiredUSDC * 2, 100).toString();
        
        try {
          await approveUSDC(approvalAmount);
          console.log('USDC allowance approved. Proceeding with order...');
        } catch (approvalError) {
          throw new Error(`USDC approval failed: ${approvalError.message}`);
        }
      }

      const orderParams = {
        tokenID: tokenId,
        price: price,
        side: side,
        size: size,
      };

      // Use the market's actual tick size and configuration
      const orderConfig = {
        tickSize: selectedMarket.orderPriceMinTickSize?.toString() || "0.01",
        negRisk: selectedMarket.negRisk || false
      };

      console.log('Placing order with config:', orderConfig);
      console.log('Order params:', orderParams);

      const response = await clobClient.createAndPostOrder(
        orderParams,
        orderConfig,
        OrderType.GTC
      );

      console.log('Order placed successfully:', response);
      
      // Refresh USDC status after successful order
      await checkUSDCStatus();
      
      return response;
    } catch (err) {
      console.error('Failed to place order:', err);
      setError(`Failed to place order: ${err.message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 Polymarket Trading</h1>
        <p>Trade on prediction markets with ease</p>
      </header>

      <main className="App-main">
        {!account ? (
          <WalletConnection 
            onConnect={(acc, prov) => {
              console.log('Connected to account:', acc);
              setAccount(acc);
              setProvider(prov);
            }}
          />
        ) : (
          <div className="trading-interface">
            <div className="wallet-info">
              <p>Connected: {account}</p>
              <div className="status-indicators">
                <span className={`status ${clobClientReady ? 'ready' : 'loading'}`}>
                  CLOB Client: {clobClientReady ? '✅ Ready' : '⏳ Initializing...'}
                </span>
                {apiCredentials && (
                  <span className="status ready">
                    API Credentials: ✅ Ready
                  </span>
                )}
              </div>
              {usdcBalance !== null && (
                <div className="usdc-info">
                  <div className="usdc-balance">
                    <span>USDC Balance: {parseFloat(usdcBalance).toFixed(2)}</span>
                  </div>
                  {usdcAllowance !== null && (
                    <div className="usdc-allowance">
                      <span>USDC Allowance: {parseFloat(usdcAllowance).toFixed(2)}</span>
                      {parseFloat(usdcAllowance) < 100 && (
                        <button 
                          onClick={() => approveUSDC("1000")}
                          className="approve-btn"
                          disabled={loading}
                        >
                          {loading ? 'Approving...' : 'Approve USDC'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              <button 
                onClick={() => {
                  setAccount(null);
                  setProvider(null);
                  setClobClient(null);
                  setClobClientReady(false);
                  setApiCredentials(null);
                  setMarkets([]);
                  setSelectedMarket(null);
                  setOrderBook(null);
                  setUsdcBalance(null);
                  setUsdcAllowance(null);
                }}
                className="disconnect-btn"
              >
                Disconnect
              </button>
            </div>

            {error && (
              <div className="error-message">
                {error}
                <button onClick={() => setError(null)}>×</button>
              </div>
            )}

            {loading && (
              <div className="loading">
                <div className="spinner"></div>
                <p>Loading...</p>
                {loading && !clobClientReady && (
                  <div className="signing-notice">
                    <p>🔐 <strong>Please check MetaMask!</strong></p>
                    <p>You may need to approve a signing request to create API credentials.</p>
                    <p>This is required for trading functionality.</p>
                  </div>
                )}
              </div>
            )}

            <MarketSelector 
              markets={markets}
              selectedMarket={selectedMarket}
              onMarketSelect={setSelectedMarket}
              onFetchMarkets={fetchMarkets}
            />

            {selectedMarket && (
              <div className="market-details">
                <h3>{selectedMarket.question}</h3>
                <p>End Date: {new Date(selectedMarket.endDate).toLocaleDateString()}</p>
                <p>Volume: ${selectedMarket.volume.toLocaleString()}</p>
              </div>
            )}

            {selectedMarket && (
              <OrderBook 
                selectedMarket={selectedMarket}  // ← Pass the entire market object
                onOrderBookUpdate={setOrderBook}
                onCheckOrderBook={checkMarketOrderBook}
              />
            )}

            {selectedMarket && !clobClientReady && (
              <div className="waiting-message">
                <p>⚠️ CLOB client not ready - showing mock data</p>
                <p>Real-time data and trading will be available once client initializes with API credentials.</p>
                <div className="initialization-help">
                  <p><strong>To initialize the client:</strong></p>
                  <ol>
                    <li>Click "Initialize Client" below</li>
                    <li>Check MetaMask for a signing request</li>
                    <li>Approve the signing request</li>
                    <li>Wait for API credentials to be created</li>
                  </ol>
                </div>
                <button 
                  onClick={initializeClobClient}
                  className="retry-btn"
                  disabled={loading}
                >
                  {loading ? 'Initializing...' : 'Initialize Client'}
                </button>
              </div>
            )}

            {selectedMarket && clobClientReady && !apiCredentials && (
              <div className="waiting-message">
                <p>⚠️ API credentials not available</p>
                <p>Trading requires API credentials. Please reconnect your wallet.</p>
                <button 
                  onClick={initializeClobClient}
                  className="retry-btn"
                  disabled={loading}
                >
                  {loading ? 'Creating Credentials...' : 'Create API Credentials'}
                </button>
              </div>
            )}

            {selectedMarket && orderBook && clobClientReady && apiCredentials && (
              <TradeInterface 
                market={selectedMarket}
                orderBook={orderBook}
                onPlaceOrder={placeOrder}
                loading={loading}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
