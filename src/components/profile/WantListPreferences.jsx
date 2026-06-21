import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function WantListPreferences({
  preferences,
  onUpdate,
}) {
  const { t } = useTranslation();
  const handleToggle = (key) => {
    onUpdate({
      ...preferences,
      [key]: !preferences[key],
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("auto.components_profile_WantListPreferences.want_list_preferences_1kymwt")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 border rounded">
          <Label className="cursor-pointer flex-1">
            {t("auto.components_profile_WantListPreferences.prompt_after_logging_non_owned_items_1d3kb2")}
          </Label>
          <Switch
            checked={preferences?.prompt_after_nonowned_session ?? true}
            onCheckedChange={() =>
              handleToggle("prompt_after_nonowned_session")
            }
          />
        </div>

        <div className="flex items-center justify-between p-3 border rounded">
          <Label className="cursor-pointer flex-1">
            {t("auto.components_profile_WantListPreferences.prompt_when_inventory_is_low_wbdexh")}
          </Label>
          <Switch
            checked={preferences?.prompt_when_low_inventory ?? true}
            onCheckedChange={() => handleToggle("prompt_when_low_inventory")}
          />
        </div>
      </CardContent>
    </Card>
  );
}