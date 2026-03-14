import React from "react";

const ClockLoader = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="clock-loader"
      width="60"
      height="60"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <line
        className="hour-hand"
        x1="12"
        y1="12"
        x2="12"
        y2="8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        className="minute-hand"
        x1="12"
        y1="12"
        x2="12"
        y2="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default ClockLoader;
