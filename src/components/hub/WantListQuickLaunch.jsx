import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function WantListQuickLaunch() {
  const { t } = useTranslation();
  return (
    <Link to="/WantList" className="block">
      <Button variant="outline" className="w-full justify-start">
        <Heart className="w-4 h-4 mr-2 text-red-500" />
        {t("auto.components_hub_WantListQuickLaunch.want_list_dubw8r")}
      </Button>
    </Link>
  );
}