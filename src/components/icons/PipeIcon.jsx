import React from "react";

export default function PipeIcon({
  className = "w-5 h-5",
  color = "#d4a574",
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
        d="M 1155 239 L 1160 253 L 1160 306 L 1143 333 L 1112 339 L 1085 319 L 1028 319 L 993 325 L 932 355 L 883 399 L 815 489 L 691 696 L 631 783 L 565 857 L 483 918 L 432 941 L 370 956 L 298 959 L 240 953 L 189 940 L 141 917 L 103 886 L 75 848 L 58 811 L 46 764 L 41 662 L 54 506 L 81 360 L 480 360 L 499 497 L 506 599 L 525 599 L 566 585 L 607 555 L 760 371 L 810 323 L 864 285 L 955 249 L 1006 241 L 1085 240 L 1112 220 L 1133 221 Z"
        fill="currentColor"
      />
    </svg>
  );
}