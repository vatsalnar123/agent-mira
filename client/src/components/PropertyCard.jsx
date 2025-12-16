import React, { useState } from 'react';

const PropertyCard = ({ property, onSave, onCompare, isSelected }) => {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(property.id);
    setSaving(false);
  };

  return (
    <div className={`property-card ${isSelected ? 'selected' : ''}`}>
      <div className="property-image">
        <img src={property.image_url} alt={property.title} />
        <div className="property-price">${property.price.toLocaleString('en-US')}</div>
      </div>
      <div className="property-content">
        <h4>{property.title}</h4>
        <div className="property-location">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          {property.location}
        </div>
        <div className="property-specs">
          <span className="spec">🛏️ {property.bedrooms} Beds</span>
          <span className="spec">🚿 {property.bathrooms} Baths</span>
          <span className="spec">📐 {property.size_sqft} sqft</span>
        </div>
        <div className="property-amenities">
          {property.amenities.slice(0, 3).map((a, i) => (
            <span key={i} className="amenity">{a}</span>
          ))}
        </div>
        <div className="property-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '...' : '💾 Save'}
          </button>
          <button 
            className={`btn btn-secondary ${isSelected ? 'active' : ''}`}
            onClick={() => onCompare(property)}
          >
            {isSelected ? '✓ Selected' : '⚖️ Compare'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
