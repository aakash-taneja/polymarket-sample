// Replace the entire OrderBook component with:
import React, { useState, useEffect } from 'react';
import './OrderBook.css';

const OrderBook = ({ selectedMarket, onOrderBookUpdate, onCheckOrderBook }) => {
  const [orderBook, setOrderBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedToken, setSelectedToken] = useState('YES'); // 'YES' or 'NO'

  // Get current token ID based on selected token type
  const getCurrentTokenId = () => {
    if (!selectedMarket) return null;
    return selectedToken === 'YES' ? selectedMarket.yesTokenId : selectedMarket.noTokenId;
  };

  useEffect(() => {
    const currentTokenId = getCurrentTokenId();
    if (currentTokenId) {
      fetchOrderBook();
    }
  }, [selectedMarket, selectedToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOrderBook = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentTokenId = getCurrentTokenId();
      if (!currentTokenId) {
        setError('No token selected');
        return;
      }
      
      const orderBookData = await onCheckOrderBook(currentTokenId);
      
      if (orderBookData) {
        setOrderBook(orderBookData);
        onOrderBookUpdate(orderBookData);
      } else {
        setError('Failed to fetch order book data');
      }
    } catch (err) {
      console.error('Error fetching order book:', err);
      setError('Failed to fetch order book');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return parseFloat(price).toFixed(3);
  };

  const formatSize = (size) => {
    return parseFloat(size).toFixed(2);
  };

  if (loading) {
    return (
      <div className="orderbook">
        <h3>Order Book</h3>
        <div className="loading">Loading order book...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orderbook">
        <h3>Order Book</h3>
        <div className="error">{error}</div>
        <button onClick={fetchOrderBook} className="retry-btn">Retry</button>
      </div>
    );
  }

  if (!orderBook) {
    return (
      <div className="orderbook">
        <h3>Order Book</h3>
        <div className="no-data">No order book data available</div>
      </div>
    );
  }

  const bids = orderBook.bids || [];
  const asks = orderBook.asks || [];
  const minOrderSize = orderBook.min_order_size || 1;

  return (
    <div className="orderbook">
      <div className="orderbook-header">
        <h3>Order Book - {selectedToken} Token</h3>
        <div className="header-controls">
          <div className="token-selector">
            <button 
              className={`token-btn ${selectedToken === 'YES' ? 'active' : ''}`}
              onClick={() => setSelectedToken('YES')}
            >
              YES
            </button>
            <button 
              className={`token-btn ${selectedToken === 'NO' ? 'active' : ''}`}
              onClick={() => setSelectedToken('NO')}
            >
              NO
            </button>
          </div>
          <button onClick={fetchOrderBook} className="refresh-btn">Refresh</button>
        </div>
      </div>

      <div className="orderbook-info">
        <div className="min-order-size">
          Min Order Size: {formatSize(minOrderSize)}
        </div>
      </div>

      <div className="orderbook-content">
        <div className="asks-section">
          <div className="section-header">
            <span>Asks (Sell Orders)</span>
          </div>
          <div className="orders-list">
            {asks.slice(0, 5).map((ask, index) => (
              <div key={index} className="order-row ask-row">
                <span className="price">{formatPrice(ask.price)}</span>
                <span className="size">{formatSize(ask.size)}</span>
              </div>
            ))}
            {asks.length === 0 && (
              <div className="no-orders">No ask orders</div>
            )}
          </div>
        </div>

        <div className="spread">
          {bids.length > 0 && asks.length > 0 && (
            <div className="spread-info">
              Spread: {formatPrice(parseFloat(asks[0].price) - parseFloat(bids[0].price))}
            </div>
          )}
        </div>

        <div className="bids-section">
          <div className="section-header">
            <span>Bids (Buy Orders)</span>
          </div>
          <div className="orders-list">
            {bids.slice(0, 5).map((bid, index) => (
              <div key={index} className="order-row bid-row">
                <span className="price">{formatPrice(bid.price)}</span>
                <span className="size">{formatSize(bid.size)}</span>
              </div>
            ))}
            {bids.length === 0 && (
              <div className="no-orders">No bid orders</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderBook;