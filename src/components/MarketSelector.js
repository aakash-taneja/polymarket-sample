import React, { useState } from 'react';
import './MarketSelector.css';

const MarketSelector = ({ markets, selectedMarket, onMarketSelect, onFetchMarkets }) => {
  const [loading, setLoading] = useState(false);

  const handleFetchMarkets = async () => {
    setLoading(true);
    await onFetchMarkets();
    setLoading(false);
  };

  return (
    <div className="market-selector">
      <div className="selector-header">
        <h3>Select Market</h3>
        <button 
          onClick={handleFetchMarkets}
          disabled={loading}
          className="fetch-btn"
        >
          {loading ? 'Loading...' : 'Refresh Markets'}
        </button>
      </div>

      {markets.length === 0 ? (
        <div className="no-markets">
          <p>No markets loaded. Click "Refresh Markets" to fetch active markets.</p>
        </div>
      ) : (
        <div className="markets-list">
          {markets.map((market) => (
            <div 
              key={market.id}
              className={`market-item ${selectedMarket?.id === market.id ? 'selected' : ''}`}
              onClick={() => onMarketSelect(market)}
            >
              <div className="market-question">
                {market.question}
              </div>
              <div className="market-details">
                <span className="volume">${market.volume.toLocaleString()}</span>
                <span className="end-date">
                  Ends: {new Date(market.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketSelector;
