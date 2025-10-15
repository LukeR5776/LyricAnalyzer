import React, { useState } from 'react';
import './RatingStars.css';

const RatingStars = ({ rating, onRate, readonly = false, size = 'medium' }) => {
  const [hoverRating, setHoverRating] = useState(null);

  const stars = 5;
  const maxRating = 10.0;

  const getDisplayRating = () => {
    if (hoverRating !== null && !readonly) return hoverRating;
    return rating || 0;
  };

  const handleStarClick = (starIndex, half) => {
    if (readonly || !onRate) return;

    const newRating = half ? starIndex - 0.5 : starIndex;
    onRate(newRating * 2); // Convert 5-star to 10-point scale
  };

  const handleStarHover = (starIndex, half) => {
    if (readonly) return;
    const newRating = half ? starIndex - 0.5 : starIndex;
    setHoverRating(newRating * 2);
  };

  const handleMouseLeave = () => {
    setHoverRating(null);
  };

  const renderStar = (index) => {
    const displayRating = getDisplayRating();
    const starValue = index * 2; // Convert to 10-point scale

    let fillPercentage = 0;
    if (displayRating >= starValue) {
      fillPercentage = 100;
    } else if (displayRating > starValue - 2) {
      fillPercentage = ((displayRating - (starValue - 2)) / 2) * 100;
    }

    return (
      <div
        key={index}
        className={`star-container ${size} ${readonly ? 'readonly' : 'interactive'}`}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="star-half star-left"
          onClick={() => handleStarClick(index, true)}
          onMouseEnter={() => handleStarHover(index, true)}
        >
          <svg
            viewBox="0 0 24 24"
            className="star-svg"
          >
            <defs>
              <linearGradient id={`star-gradient-${index}`}>
                <stop offset={`${Math.min(fillPercentage * 2, 100)}%`} stopColor="#ffc107" />
                <stop offset={`${Math.min(fillPercentage * 2, 100)}%`} stopColor="#e0e0e0" />
              </linearGradient>
            </defs>
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={`url(#star-gradient-${index})`}
              stroke="#ffc107"
              strokeWidth="1"
            />
          </svg>
        </div>
        <div
          className="star-half star-right"
          onClick={() => handleStarClick(index, false)}
          onMouseEnter={() => handleStarHover(index, false)}
        >
          <svg
            viewBox="0 0 24 24"
            className="star-svg"
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill="transparent"
              stroke="none"
            />
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className={`rating-stars ${readonly ? 'readonly' : ''}`}>
      <div className="stars-container">
        {Array.from({ length: stars }, (_, i) => renderStar(i + 1))}
      </div>
      <div className="rating-value">
        {getDisplayRating().toFixed(1)}/10.0
      </div>
    </div>
  );
};

export default RatingStars;
