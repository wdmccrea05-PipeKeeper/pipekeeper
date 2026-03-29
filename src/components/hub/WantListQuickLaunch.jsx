import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

export default function WantListQuickLaunch() {
  return (
    <Link to="/WantList" className="block">
      <Button variant="outline" className="w-full h-12 text-base gap-2">
        <Heart className="w-5 h-5" />
        Want List
      </Button>
    </Link>
  );
}