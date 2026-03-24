import React from "react";

export default function PipeIcon({
  className = "w-5 h-5",
  color = "currentColor",
  title = "Pipe",
}) {
  return (
    <svg
      viewBox="0 0 1200 1200"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      style={{ display: "block", color }}
    >
      <path
        d="M 45 239 L 40 253 L 40 306 L 57 333 L 88 339 L 115 319 L 172 319 L 207 325 L 268 355 L 317 399 L 385 489 L 509 696 L 569 783 L 635 857 L 717 918 L 768 941 L 830 956 L 902 959 L 960 953 L 1011 940 L 1059 917 L 1097 886 L 1125 848 L 1142 811 L 1154 764 L 1159 662 L 1146 506 L 1119 360 L 720 360 L 701 497 L 694 599 L 675 599 L 634 585 L 593 555 L 440 371 L 390 323 L 336 285 L 245 249 L 194 241 L 115 240 L 88 220 L 67 221 Z"
        fill="currentColor"
      />
    </svg>
  );
}
