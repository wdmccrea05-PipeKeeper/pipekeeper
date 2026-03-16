import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";

export default function Home() {
  const navigate = useNavigate();

  // Redirect to CollectionHub on mount
  useEffect(() => {
    navigate(createPageUrl("CollectionHub"), { replace: true });
  }, [navigate]);

  return null;