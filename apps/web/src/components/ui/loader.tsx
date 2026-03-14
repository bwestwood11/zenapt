import React from "react";

export const Loader: React.FC = () => {
  return (
    <svg className="w-[3.25em] loader-container" viewBox="25 25 50 50">
      <defs>
        <linearGradient
          id="trailGradient"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="100"
          y2="0"
        >
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <circle className="loader-circle" cx="50" cy="50" r="20" />
    </svg>
  );
};
