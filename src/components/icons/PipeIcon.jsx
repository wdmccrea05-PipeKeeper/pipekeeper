/**
 * Canonical Pipe Icon — exports the standard tobacco pipe icon used throughout the app.
 * This is the improved, visually recognizable pipe icon from PipeKeeperIcons.
 * 
 * Usage: import PipeIcon from '@/components/icons/PipeIcon'
 *        <PipeIcon className="w-5 h-5" />
 */

function Svg({ children, className = "", viewBox = "0 0 24 24" }) {
  return (
    <svg
      viewBox={viewBox}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

export default function PipeIcon({ className = "h-5 w-5", strokeWidth = 2 }) {
  return (
    <Svg className={className}>
      <path
        d="M5.5 13.7c0-1.9 1.5-3.4 3.4-3.4h1.9c1.9 0 3.4 1.5 3.4 3.4v1.1c0 1.9-1.5 3.4-3.4 3.4H8.9c-1.9 0-3.4-1.5-3.4-3.4v-1.1Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M14.2 13.2h2.8c1.4 0 2.5 1.1 2.5 2.5v.4c0 1-.8 1.8-1.8 1.8h-3.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.2 13.2c.2-2.1 1.8-3.6 4.1-3.6h.6"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}