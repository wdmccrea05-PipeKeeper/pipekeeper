import React from "react";
import { PipeIcon as PipeKeeperPipeIcon } from "@/components/icons/PipeKeeperIcons";

/**
 * Backwards-compatible default export.
 * We keep this file because parts of the codebase import a default PipeIcon.
 */
export default function PipeIcon({ className = "w-5 h-5", strokeWidth = 2.2 }) {
  return <PipeKeeperPipeIcon className={className} strokeWidth={strokeWidth} />;
}