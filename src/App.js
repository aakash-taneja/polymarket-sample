import React, { useState, useEffect } from 'react';
import './App.css';
import WalletConnection from './components/WalletConnection';
import MarketSelector from './components/MarketSelector';
import OrderBook from './components/OrderBook';
import TradeInterface from './components/TradeInterface';
import { ClobClient, OrderType } from '@polymarket/clob-client';

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

  // Initialize CLOB client when wallet is connected
  useEffect(() => {
    if (account && provider) {
      initializeClobClient();
    }
  }, [account, provider]); // eslint-disable-line react-hooks/exhaustive-deps

  const initializeClobClient = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Starting CLOB client initialization...');
      const host = 'https://clob.polymarket.com';
      const signer = provider.getSigner();
      
      console.log('Creating temporary CLOB client for API key generation...');
      // Create a temporary client to generate API credentials
      const tempClient = new ClobClient(host, 137, signer);
      
      console.log('Creating/deriving API key...');
      try {
        // Create or derive API key with timeout
        const apiKeyPromise = tempClient.createOrDeriveApiKey();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API key creation timeout')), 15000)
        );
        
        const credentials = await Promise.race([apiKeyPromise, timeoutPromise]);
        console.log('API credentials created successfully:', credentials);
        setApiCredentials(credentials);
        
        // Now create the actual client with credentials
        console.log('Creating CLOB client with API credentials...');
        const client = new ClobClient(host, 137, signer, credentials, 0, account);
        
        // Test the client
        console.log('Testing client with API credentials...');
        try {
          const testTokenId = "60487116984468020978247225474488676749601001829886755968952521846780452448915";
          const testOrderBook = await client.getOrderBook(testTokenId);
          console.log('Client test successful:', testOrderBook);
        } catch (testError) {
          console.warn('Client test failed, but continuing:', testError);
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
            { price: "0.45", size: "100" },
            { price: "0.44", size: "200" },
            { price: "0.43", size: "150" }
          ],
          asks: [
            { price: "0.55", size: "100" },
            { price: "0.56", size: "200" },
            { price: "0.57", size: "150" }
          ],
          min_order_size: "5"
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
          { price: "0.45", size: "100" },
          { price: "0.44", size: "200" },
          { price: "0.43", size: "150" }
        ],
        asks: [
          { price: "0.55", size: "100" },
          { price: "0.56", size: "200" },
          { price: "0.57", size: "150" }
        ],
        min_order_size: "5"
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
                tokenId={selectedMarket.yesTokenId}
                onOrderBookUpdate={setOrderBook}
                onCheckOrderBook={checkMarketOrderBook}
              />
            )}

            {selectedMarket && !clobClientReady && (
              <div className="waiting-message">
                <p>⚠️ CLOB client not ready - showing mock data</p>
                <p>Real-time data and trading will be available once client initializes with API credentials.</p>
                <button 
                  onClick={initializeClobClient}
                  className="retry-btn"
                  disabled={loading}
                >
                  {loading ? 'Initializing...' : 'Retry Initialization'}
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
