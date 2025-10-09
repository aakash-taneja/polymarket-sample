import React, { useState, useEffect } from 'react';
import { Side } from '@polymarket/clob-client';
import './TradeInterface.css';

const TradeInterface = ({ market, orderBook, onPlaceOrder, loading }) => {
  const [side, setSide] = useState(Side.BUY);
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('');
  const [suggestedPrice, setSuggestedPrice] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    calculateSuggestedPrice();
  }, [orderBook, side]); // eslint-disable-line react-hooks/exhaustive-deps

  const calculateSuggestedPrice = () => {
    if (!orderBook) return;

    const bids = orderBook.bids || [];
    const asks = orderBook.asks || [];
    const bestBid = bids[0]?.price;
    const bestAsk = asks[0]?.price;
    const tickSize = market.orderPriceMinTickSize || 0.01;

    let suggested;
    if (side === Side.BUY) {
      if (bestBid && bestAsk) {
        // Place order between bid and ask
        suggested = Math.min(parseFloat(bestBid) + tickSize, parseFloat(bestAsk) - tickSize);
      } else if (bestBid) {
        // Only bids available, place slightly above
        suggested = parseFloat(bestBid) + tickSize;
      } else {
        // No orders, use a conservative price
        suggested = 0.01;
      }
    } else {
      if (bestBid && bestAsk) {
        // Place order between bid and ask
        suggested = Math.max(parseFloat(bestAsk) - tickSize, parseFloat(bestBid) + tickSize);
      } else if (bestAsk) {
        // Only asks available, place slightly below
        suggested = parseFloat(bestAsk) - tickSize;
      } else {
        // No orders, use a conservative price
        suggested = 0.99;
      }
    }

    // Ensure minimum/maximum price bounds and round to tick size
    suggested = Math.max(0.01, Math.min(0.99, suggested));
    // Round to the nearest tick size
    const rounded = Math.round(suggested / tickSize) * tickSize;
    setSuggestedPrice(rounded.toFixed(tickSize >= 0.01 ? 2 : 3));
  };

  const handleSideChange = (newSide) => {
    setSide(newSide);
    setPrice('');
  };

  const useSuggestedPrice = () => {
    setPrice(suggestedPrice);
  };

  const handlePlaceOrder = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!price || !size) {
        throw new Error('Please enter both price and size');
      }

      const priceNum = parseFloat(price);
      const sizeNum = parseFloat(size);

      if (priceNum <= 0 || priceNum >= 1) {
        throw new Error('Price must be between 0.001 and 0.999');
      }

      if (sizeNum <= 0) {
        throw new Error('Size must be greater than 0');
      }

      if (sizeNum < (market.orderMinSize || 5)) {
        throw new Error(`Minimum order size is ${market.orderMinSize || 5}`);
      }

      const tokenId = side === Side.BUY ? market.yesTokenId : market.noTokenId;
      
      await onPlaceOrder(tokenId, priceNum, sizeNum, side);
      
      setSuccess('Order placed successfully!');
      setPrice('');
      setSize('');
    } catch (err) {
      setError(err.message);
    }
  };


  const getTokenLabel = () => {
    return side === Side.BUY ? 'YES' : 'NO';
  };

  return (
    <div className="trade-interface">
      <div className="trade-header">
        <h3>Place Trade</h3>
        <div className="token-info">
          Trading: <span className="token-label">{getTokenLabel()}</span>
        </div>
      </div>

      <div className="side-selector">
        <button 
          className={`side-btn ${side === Side.BUY ? 'active' : ''}`}
          onClick={() => handleSideChange(Side.BUY)}
        >
          Buy YES
        </button>
        <button 
          className={`side-btn ${side === Side.SELL ? 'active' : ''}`}
          onClick={() => handleSideChange(Side.SELL)}
        >
          Sell NO
        </button>
      </div>

      {suggestedPrice && (
        <div className="suggested-price">
          <span>Suggested Price: {suggestedPrice}</span>
          <button onClick={useSuggestedPrice} className="use-suggested-btn">
            Use Suggested
          </button>
        </div>
      )}

      <div className="trade-form">
        <div className="form-group">
          <label>Price (Step: {market.orderPriceMinTickSize || 0.01})</label>
          <input
            type="number"
            step={market.orderPriceMinTickSize || 0.01}
            min="0.01"
            max="0.99"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.50"
            className="price-input"
          />
        </div>

        <div className="form-group">
          <label>Size (Min: {market.orderMinSize})</label>
          <input
            type="number"
            step="1"
            min={market.orderMinSize}
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="5"
            className="size-input"
          />
        </div>

        <div className="order-summary">
          <div className="summary-row">
            <span>Total Cost:</span>
            <span>
              {price && size ? (parseFloat(price) * parseFloat(size)).toFixed(2) : '0.00'} USDC
            </span>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        <button 
          onClick={handlePlaceOrder}
          disabled={loading || !price || !size}
          className="place-order-btn"
        >
          {loading ? 'Placing Order...' : `Place ${getTokenLabel()} Order`}
        </button>
      </div>

      <div className="market-info">
        <h4>Market Information</h4>
        <div className="info-grid">
          <div className="info-item">
            <span>Question:</span>
            <span>{market.question}</span>
          </div>
          <div className="info-item">
            <span>End Date:</span>
            <span>{new Date(market.endDate).toLocaleDateString()}</span>
          </div>
          <div className="info-item">
            <span>Volume:</span>
            <span>${market.volume.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeInterface;
