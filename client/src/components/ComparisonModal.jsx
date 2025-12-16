import React from 'react';

const ComparisonModal = ({ properties, onClose, onClear, onRemove }) => {
  if (!properties || properties.length === 0) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Compare ({properties.length})</h2>
          <div className="modal-header-actions">
            <button className="clear-btn" onClick={onClear}>Clear All</button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="comparison-grid">
          {properties.map(p => (
            <div key={p.id} className="comparison-card">
              <button className="remove-card-btn" onClick={() => onRemove(p.id)}>×</button>
              <img src={p.image_url} alt={p.title} />
              <div className="info">
                <h4>{p.title}</h4>
                <div className="price">${p.price?.toLocaleString('en-US')}</div>
                <div className="row">
                  <span className="label">Location</span>
                  <span>{p.location}</span>
                </div>
                <div className="row">
                  <span className="label">Bedrooms</span>
                  <span>{p.bedrooms}</span>
                </div>
                <div className="row">
                  <span className="label">Bathrooms</span>
                  <span>{p.bathrooms}</span>
                </div>
                <div className="row">
                  <span className="label">Size</span>
                  <span>{p.size_sqft} sqft</span>
                </div>
                <div className="row">
                  <span className="label">Amenities</span>
                  <span>{p.amenities?.slice(0, 2).join(', ')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;
