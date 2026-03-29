import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

export default function WantListQuickLaunch() {
  return (
    <Link to="/WantList" className="block">
      <Button variant="outline" className="w-full justify-start">
        <Heart className="w-4 h-4 mr-2 text-red-500" />
        Want List
      </Button>
    </Link>
  );
}