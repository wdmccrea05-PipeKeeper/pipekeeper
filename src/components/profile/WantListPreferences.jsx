import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function WantListPreferences({
  preferences,
  onUpdate,
}) {
  const handleToggle = (key) => {
    onUpdate({
      ...preferences,
      [key]: !preferences[key],
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Want List Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 border rounded">
          <Label className="cursor-pointer flex-1">
            Prompt after logging non-owned items
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
            Prompt when inventory is low
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