import { useNavigate as useRouterNavigate } from "react-router-dom";
import { createPageUrl } from "./createPageUrl";

/**
 * Enhanced navigate that marks navigation as internal
 * This helps BackButton know we have history to go back to
 */
export function useNavigate() {
  const navigate = useRouterNavigate();

  return (to, options = {}) => {
    // Add fromInternal state to track internal navigation
    const enhancedOptions = {
      ...options,
      state: {
        ...(options.state || {}),
        fromInternal: true,
      },
    };

    // If 'to' is a page name without slashes, convert it
    const path = to.includes("/") ? to : createPageUrl(to);
    
    navigate(path, enhancedOptions);
  };
}