import React from "react";
import CuratorActionResultCard from "./CuratorActionResultCard";
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function CuratorActionPanel({
  actionRun,
  itemStates,
  onRetry,
  onAccept,
  onReject,
  onAskCurator,
  onDismiss,
}) {
  const { t } = useTranslation();
  if (!actionRun) return null;

  if (actionRun.status === "running") {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-black/20 p-4 mb-4">
        <div className="text-sm text-amber-50/80">
          {t("auto.components_curator_CuratorActionPanel.curator_is_reviewing_your_collection_qszauu")}
        </div>
      </div>
    );
  }

  if (actionRun.status === "timeout" || actionRun.status === "error") {
    return (
      <div className="rounded-xl border border-red-500/20 bg-black/20 p-4 mb-4">
        <div className="font-medium text-red-300">
          {t("auto.components_curator_CuratorActionPanel.curator_could_not_complete_this_action_ptwlvg")}
        </div>
        <div className="mt-1 text-sm text-amber-50/70">
          {actionRun.error || "Please try again."}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-black"
          >
            {t("auto.components_curator_CuratorActionPanel.try_again_4ztias")}
          </button>
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg border border-amber-500/30 px-3 py-2 text-sm text-amber-100"
            >
              {t("auto.components_curator_CuratorActionPanel.dismiss_w1upy9")}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (actionRun.status === "empty") {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-black/20 p-4 mb-4">
        <div className="font-medium text-amber-100">
          {t("auto.components_curator_CuratorActionPanel.no_actionable_recommendations_right_now_jigyxa")}
        </div>
        <div className="mt-1 text-sm text-amber-50/70">
          {actionRun.summary}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="mt-3 rounded-lg border border-amber-500/30 px-3 py-2 text-sm text-amber-100"
          >
            {t("auto.components_curator_CuratorActionPanel.dismiss_w1upy9")}
          </button>
        ) : null}
      </div>
    );
  }

  // Prefer grouped rendering; fall back to flat items for backward compatibility
  const groups = Array.isArray(actionRun.groups) && actionRun.groups.length > 0 ? actionRun.groups : null;
  const flatItems = Array.isArray(actionRun.items) ? actionRun.items : [];

  return (
    <div className="space-y-3 mb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-amber-50/75">{actionRun.summary}</div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs text-amber-100"
          >
            {t("auto.components_curator_CuratorActionPanel.close_3lk8qj")}
          </button>
        ) : null}
      </div>

      {groups ? (
        groups.map((group) => (
          <div key={group.groupKey || group.groupTitle} className="space-y-2">
            {group.groupTitle && (
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-500/70 px-1">
                {group.groupTitle}
              </div>
            )}
            {group.description && (
              <div className="text-xs text-amber-50/55 px-1 -mt-1 mb-1">{group.description}</div>
            )}
            {(group.items || []).map((item) => (
              <CuratorActionResultCard
                key={item.id}
                item={item}
                state={itemStates[item.id] || { status: "idle", error: null }}
                onAccept={() => onAccept(item)}
                onReject={() => onReject(item)}
                onAskCurator={() => onAskCurator(item)}
              />
            ))}
          </div>
        ))
      ) : (
        flatItems.map((item) => (
          <CuratorActionResultCard
            key={item.id}
            item={item}
            state={itemStates[item.id] || { status: "idle", error: null }}
            onAccept={() => onAccept(item)}
            onReject={() => onReject(item)}
            onAskCurator={() => onAskCurator(item)}
          />
        ))
      )}
    </div>
  );
}