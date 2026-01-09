import * as React from "react";

interface ElephantIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export const ElephantIcon: React.FC<ElephantIconProps> = ({ 
  size = 24, 
  className,
  ...props 
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Body */}
    <ellipse cx="14" cy="14" rx="7" ry="5" />
    {/* Head */}
    <circle cx="6" cy="10" r="4" />
    {/* Trunk */}
    <path d="M2 10c0 2 0 4 1 6" />
    {/* Ear */}
    <path d="M4 7c-1-1-2-1-2 0" />
    {/* Eye */}
    <circle cx="5" cy="9" r="0.5" fill="currentColor" />
    {/* Legs */}
    <path d="M10 19v2" />
    <path d="M14 19v2" />
    <path d="M18 19v2" />
    {/* Tail */}
    <path d="M21 14c1 0 1 1 0 2" />
  </svg>
);
