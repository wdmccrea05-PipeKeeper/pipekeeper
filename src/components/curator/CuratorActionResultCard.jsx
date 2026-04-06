import React from "react";
import {
  RECOMMENDATION_CLASS,
  getRecommendationClassLabel,
  getRecommendationClassColor,
  getRecommendationClassBg,
} from "./recommendationActionTypes";

const PAIRING_MODE_LABELS = {
  direct_pairing: 'Direct Pairing',
  collection_mix_match: 'Mix-and-Match Suggestion',
};

const PAIRING_MODE_STYLES = {
  direct_pairing: {
    background: 'rgba(46,125,92,0.15)',
    color: 'rgba(80,180,130,1)',
    border: '1px solid rgba(46,125,92,0.3)',
  },
  collection_mix_match: {
    background: 'rgba(180,140,75,0.15)',
    color: 'rgba(212,165,116,1)',
    border: '1px solid rgba(180,140,75,0.3)',
  },
};

function humanizeKey(key) {
  return String(key || "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\bmm\b/gi, "mm")
    .replace(/\bg\b/gi, "g")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function humanizeValue(value) {
  if (value === null || value === undefined || value === "") return "None";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.join(", ");
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function humanizeRecordType(recordType) {
  switch (recordType) {
    case "pipe":
      return "Pipe";
    case "blend":
    case "tobacco":
      return "Blend";
    case "bottle":
      return "Bottle";
    default:
      return humanizeValue(recordType);
  }
}

function SessionLine({ label, value }) {
  if (!value) return null;
  return (
    <div className="text-xs uppercase tracking-wide text-amber-400/80">
      {label}: {value}
    </div>
  );
}

function buildSessionItemLines(item) {
  const recordNameAsPipe =
    item.recordType === "pipe" ? item.recordName : null;
  const recordNameAsBlend =
    item.recordType === "blend" || item.recordType === "tobacco"
      ? item.recordName
      : null;
  const recordNameAsBottle =
    item.recordType === "bottle" ? item.recordName : null;

  const pipeName =
    item.pipeName ||
    item.pipe?.name ||
    item.session?.pipeName ||
    recordNameAsPipe ||
    null;

  const blendName =
    item.blendName ||
    item.blend?.name ||
    item.session?.blendName ||
    recordNameAsBlend ||
    null;

  const bottleName =
    item.bottleName ||
    item.pourName ||
    item.whiskeyName ||
    item.bottle?.name ||
    item.session?.bottleName ||
    recordNameAsBottle ||
    null;

  return { pipeName, blendName, bottleName };
}

/**
 * Resolve the recommendation class for an item.
 *
 * @param {object} item - Curator recommendation item
 * @param {boolean} hasProposedEntries - true when item.proposedChanges has at least one field
 * @param {boolean} isNonMutating - true for pairing/session/similar items that never mutate data
 * @returns {string|null} One of RECOMMENDATION_CLASS values, or null for non-mutating items
 *
 * Priority:
 * 1. item.recommendationClass (explicit, set by LLM or Optimize panel)
 * 2. item.actionType (legacy field name for the same concept)
 * 3. Behaviour-based inference:
 *    - non-mutating → null (handled by isNonMutating branch in ActionButtons)
 *    - has proposed entries → AUTO_FIX (safe to apply)
 *    - no proposed entries → ADVISORY (informational only)
 */
function resolveRecommendationClass(item, hasProposedEntries, isNonMutating) {
  // Explicit field always wins
  const explicit = item.recommendationClass || item.actionType;
  if (explicit) {
    const normalized = String(explicit).toLowerCase();
    if (normalized === RECOMMENDATION_CLASS.ADVISORY) return RECOMMENDATION_CLASS.ADVISORY;
    if (normalized === RECOMMENDATION_CLASS.REVIEW_REQUIRED) return RECOMMENDATION_CLASS.REVIEW_REQUIRED;
    if (normalized === RECOMMENDATION_CLASS.MULTI_PATH) return RECOMMENDATION_CLASS.MULTI_PATH;
    if (normalized === RECOMMENDATION_CLASS.AUTO_FIX) return RECOMMENDATION_CLASS.AUTO_FIX;
  }

  // Behaviour-based inference for untyped items
  if (isNonMutating) return null; // handled separately by isNonMutating branch
  if (hasProposedEntries) return RECOMMENDATION_CLASS.AUTO_FIX;
  return RECOMMENDATION_CLASS.ADVISORY; // no proposed changes → advisory by default
}

/**
 * Primary action button styles — call-to-action, high prominence.
 */
function PrimaryBtn({ onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="whitespace-nowrap rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-50 transition-opacity hover:opacity-90"
    >
      {children}
    </button>
  );
}

/**
 * Secondary action button styles — lower prominence outline variant.
 */
function SecondaryBtn({ onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="whitespace-nowrap rounded-lg border border-amber-500/30 px-3 py-1.5 text-sm text-amber-100 disabled:opacity-50 transition-opacity hover:opacity-80"
    >
      {children}
    </button>
  );
}

/**
 * Ghost / tertiary button — minimum chrome.
 */
function GhostBtn({ onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="whitespace-nowrap rounded-lg border border-amber-500/20 px-3 py-1.5 text-sm text-amber-100/70 disabled:opacity-50 transition-opacity hover:opacity-80"
    >
      {children}
    </button>
  );
}

/**
 * Render the correct set of action buttons based on recommendation class.
 *
 * AUTO_FIX      → Apply Fix · Review Details · Ask Curator
 * ADVISORY      → Acknowledge · View Items · Ask Curator          (NO Apply Fix)
 * REVIEW_REQUIRED → Review Details · Approve Changes · Ask Curator
 * MULTI_PATH    → Acknowledge · Ask for More Info · Treat Individually
 * non-mutating  → Try This · Skip · Ask Curator
 * untyped       → fallback to legacy hasProposedEntries logic
 */
function ActionButtons({
  recClass,
  isNonMutating,
  isApplying,
  hasProposedEntries,
  onAccept,
  onReject,
  onAskCurator,
}) {
  if (isNonMutating) {
    return (
      <div className="mt-4 flex flex-wrap gap-2">
        <PrimaryBtn onClick={onAccept} disabled={isApplying}>
          Try This
        </PrimaryBtn>
        <SecondaryBtn onClick={onReject} disabled={isApplying}>
          Skip
        </SecondaryBtn>
        <GhostBtn onClick={onAskCurator} disabled={isApplying}>
          Ask Curator
        </GhostBtn>
      </div>
    );
  }

  switch (recClass) {
    case RECOMMENDATION_CLASS.AUTO_FIX:
      return (
        <div className="mt-4 flex flex-wrap gap-2">
          <PrimaryBtn onClick={onAccept} disabled={isApplying}>
            {isApplying ? "Applying…" : "Apply Fix"}
          </PrimaryBtn>
          <SecondaryBtn onClick={onReject} disabled={isApplying}>
            Review Details
          </SecondaryBtn>
          <GhostBtn onClick={onAskCurator} disabled={isApplying}>
            Ask Curator
          </GhostBtn>
        </div>
      );

    case RECOMMENDATION_CLASS.ADVISORY:
      // CRITICAL: Apply Fix must NEVER appear here
      return (
        <div className="mt-4 flex flex-wrap gap-2">
          <PrimaryBtn onClick={onAccept} disabled={isApplying}>
            Acknowledge
          </PrimaryBtn>
          <SecondaryBtn onClick={onReject} disabled={isApplying}>
            View Items
          </SecondaryBtn>
          <GhostBtn onClick={onAskCurator} disabled={isApplying}>
            Ask Curator
          </GhostBtn>
        </div>
      );

    case RECOMMENDATION_CLASS.REVIEW_REQUIRED:
      return (
        <div className="mt-4 flex flex-wrap gap-2">
          <SecondaryBtn onClick={onReject} disabled={isApplying}>
            Review Details
          </SecondaryBtn>
          <PrimaryBtn onClick={onAccept} disabled={isApplying}>
            {isApplying ? "Approving…" : "Approve Changes"}
          </PrimaryBtn>
          <GhostBtn onClick={onAskCurator} disabled={isApplying}>
            Ask Curator
          </GhostBtn>
        </div>
      );

    case RECOMMENDATION_CLASS.MULTI_PATH:
      return (
        <div className="mt-4 flex flex-wrap gap-2">
          <PrimaryBtn onClick={onAccept} disabled={isApplying}>
            Acknowledge
          </PrimaryBtn>
          <SecondaryBtn onClick={onReject} disabled={isApplying}>
            Ask for More Info
          </SecondaryBtn>
          <GhostBtn onClick={onAskCurator} disabled={isApplying}>
            Ask Curator
          </GhostBtn>
        </div>
      );

    default:
      // Legacy fallback: behaviour-based buttons
      return (
        <div className="mt-4 flex flex-wrap gap-2">
          <PrimaryBtn onClick={onAccept} disabled={isApplying}>
            {isApplying ? "Applying…" : hasProposedEntries ? "Apply Changes" : "Acknowledge"}
          </PrimaryBtn>
          <SecondaryBtn onClick={onReject} disabled={isApplying}>
            Dismiss
          </SecondaryBtn>
          <GhostBtn onClick={onAskCurator} disabled={isApplying}>
            Ask Curator
          </GhostBtn>
        </div>
      );
  }
}

/**
 * Contextual explainer shown under the action buttons.
 * Tells the user exactly what each primary action will do — no guessing allowed.
 */
function ActionExplainer({ recClass, isNonMutating, hasProposedEntries }) {
  if (isNonMutating) {
    return (
      <p className="mt-2 text-xs" style={{ color: 'rgba(224,216,200,0.45)' }}>
        <span className="font-semibold" style={{ color: 'rgba(212,165,116,0.7)' }}>Try This</span>{" "}
        is for exploration only — no data in your collection will be changed or saved.
      </p>
    );
  }

  switch (recClass) {
    case RECOMMENDATION_CLASS.AUTO_FIX:
      return (
        <p className="mt-2 text-xs" style={{ color: 'rgba(224,216,200,0.45)' }}>
          <span className="font-semibold" style={{ color: 'rgba(74,200,130,0.7)' }}>Apply Fix</span>{" "}
          will immediately save the field changes listed above.{" "}
          <span className="font-semibold" style={{ color: 'rgba(100,160,200,0.7)' }}>Review Details</span>{" "}
          dismisses and asks the Curator to explain before you commit.
        </p>
      );
    case RECOMMENDATION_CLASS.ADVISORY:
      return (
        <p className="mt-2 text-xs" style={{ color: 'rgba(224,216,200,0.45)' }}>
          <span className="font-semibold" style={{ color: 'rgba(212,165,116,0.7)' }}>Acknowledge</span>{" "}
          marks this insight as reviewed — no data in your collection will change.{" "}
          <span className="font-semibold" style={{ color: 'rgba(100,160,200,0.7)' }}>View Items</span>{" "}
          opens the relevant module so you can act on your own terms.
        </p>
      );
    case RECOMMENDATION_CLASS.REVIEW_REQUIRED:
      return (
        <p className="mt-2 text-xs" style={{ color: 'rgba(224,216,200,0.45)' }}>
          <span className="font-semibold" style={{ color: 'rgba(100,160,200,0.7)' }}>Review Details</span>{" "}
          explains what will change before you commit.{" "}
          <span className="font-semibold" style={{ color: 'rgba(212,165,116,0.7)' }}>Approve Changes</span>{" "}
          will apply the listed changes to your collection.
        </p>
      );
    case RECOMMENDATION_CLASS.MULTI_PATH:
      return (
        <p className="mt-2 text-xs" style={{ color: 'rgba(224,216,200,0.45)' }}>
          <span className="font-semibold" style={{ color: 'rgba(212,165,116,0.7)' }}>Acknowledge</span>{" "}
          defers without action.{" "}
          <span className="font-semibold" style={{ color: 'rgba(100,160,200,0.7)' }}>Ask for More Info</span>{" "}
          explains the reasoning behind this suggestion.
        </p>
      );
    default:
      if (hasProposedEntries) {
        return (
          <p className="mt-2 text-xs" style={{ color: 'rgba(224,216,200,0.45)' }}>
            <span className="font-semibold" style={{ color: 'rgba(74,200,130,0.7)' }}>Apply Changes</span>{" "}
            will immediately save the field changes listed above to this record.
          </p>
        );
      }
      return (
        <p className="mt-2 text-xs" style={{ color: 'rgba(224,216,200,0.45)' }}>
          <span className="font-semibold" style={{ color: 'rgba(212,165,116,0.7)' }}>Acknowledge</span>{" "}
          marks this recommendation as reviewed — no data will change automatically.
        </p>
      );
  }
}

/**
 * Whether to show the "Fields That Will Change" section for this item.
 * Only shown for AUTO_FIX and REVIEW_REQUIRED classes — advisory and
 * multi-path cards should never display proposed field mutations.
 *
 * @param {boolean} hasProposedEntries
 * @param {boolean} isNonMutating
 * @param {string|null} recClass
 * @returns {boolean}
 */
function shouldShowProposedChanges(hasProposedEntries, isNonMutating, recClass) {
  if (!hasProposedEntries || isNonMutating) return false;
  if (recClass === RECOMMENDATION_CLASS.ADVISORY) return false;
  if (recClass === RECOMMENDATION_CLASS.MULTI_PATH) return false;
  return true;
}

export default function CuratorActionResultCard({
  item,
  state,
  onAccept,
  onReject,
  onAskCurator,
}) {
  const isApplying = state?.status === "applying";
  const isAccepted = state?.status === "accepted";
  const isRejected = state?.status === "rejected";

  const isPairing = item.type === "pairing_recommendation";
  const isSession = item.type === "session_builder";
  const isSimilar = item.type === "similar_item";
  const isNonMutating = isPairing || isSession || isSimilar;

  const displayTitle =
    item.title ||
    item.itemName ||
    item.recordName ||
    item.anchorName ||
    "Recommendation";

  const displayExplanation =
    item.explanation ||
    item.recommendation ||
    item.issue ||
    item.whyFitsYou ||
    "Review this item.";

  const displayRationale =
    item.rationale ||
    item.whyFitsYou ||
    "";

  const proposedChangePayload =
    item.proposedChanges ||
    item.proposedChange?.payload ||
    {};

  const proposedEntries = Object.entries(proposedChangePayload || {});
  const hasProposedEntries = proposedEntries.length > 0;
  const characteristics = Array.isArray(item.characteristics)
    ? item.characteristics.filter(Boolean)
    : [];

  const { pipeName, blendName, bottleName } = buildSessionItemLines(item);

  // Pairing mode badge
  const pairingMode = item.pairingMode || item.pairing_mode || null;
  const pairingModeLabel = pairingMode ? PAIRING_MODE_LABELS[pairingMode] : null;
  const pairingModeStyle = pairingMode ? PAIRING_MODE_STYLES[pairingMode] : null;

  // Resolve recommendation class — drives button rendering
  const recClass = resolveRecommendationClass(item, hasProposedEntries, isNonMutating);

  // Recommendation class badge (only when an explicit class is set on the item)
  const explicitClass = item.recommendationClass || item.actionType || null;
  const classLabel = explicitClass ? getRecommendationClassLabel(recClass) : null;
  const classColor = explicitClass ? getRecommendationClassColor(recClass) : null;
  const classBg   = explicitClass ? getRecommendationClassBg(recClass) : null;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-black/20 p-4">
      <div className="min-w-0">
        {/* Pairing mode badge */}
        {pairingModeLabel && (
          <div className="mb-2">
            <span
              className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
              style={pairingModeStyle}
            >
              {pairingModeLabel}
            </span>
          </div>
        )}

        {/* Recommendation class badge */}
        {classLabel && (
          <div className="mb-2">
            <span
              className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: classBg, color: classColor, border: `1px solid ${classColor}40` }}
            >
              {classLabel}
            </span>
          </div>
        )}

        {/* Ownership status badge */}
        {item.ownershipStatus === "owned" && (
          <div className="mb-2">
            <span
              className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(74,124,92,0.15)",
                color: "rgba(80,180,130,1)",
                border: "1px solid rgba(74,124,92,0.3)",
              }}
            >
              In Your Collection
            </span>
          </div>
        )}
        {item.ownershipStatus === "not_owned" && (
          <div className="mb-2">
            <span
              className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(74,124,156,0.15)",
                color: "rgba(130,180,210,1)",
                border: "1px solid rgba(74,124,156,0.3)",
              }}
            >
              External Suggestion
            </span>
          </div>
        )}

        <div className="text-base font-semibold text-amber-100">
          {displayTitle}
        </div>

        {isSession || isPairing ? (
          <div className="mt-2 space-y-1">
            <SessionLine label="Pipe" value={pipeName} />
            <SessionLine label="Blend" value={blendName} />
            <SessionLine label="Pour" value={bottleName} />
          </div>
        ) : (
          (item.recordName || item.recordType || item.category || item.anchorName) && (
            <div className="mt-1 text-xs uppercase tracking-wide text-amber-500/70">
              {item.recordName
                ? `${humanizeRecordType(item.recordType)}: ${item.recordName}`
                : item.category
                ? item.category
                : item.anchorName
                ? `Based on: ${item.anchorName}`
                : humanizeRecordType(item.recordType)}
            </div>
          )
        )}

        {/* What was found / explanation */}
        <div className="mt-3 text-sm leading-relaxed text-amber-50/85">
          {displayExplanation}
        </div>

        {/* Why it matters / rationale */}
        {displayRationale && displayRationale !== displayExplanation && (
          <div className="mt-2 text-xs leading-relaxed text-amber-50/65 whitespace-pre-line">
            {displayRationale}
          </div>
        )}

        {/* Characteristic tags */}
        {characteristics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {characteristics.map((trait, idx) => (
              <span
                key={`${trait}-${idx}`}
                className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-xs text-amber-100/80"
              >
                {trait}
              </span>
            ))}
          </div>
        )}

        {/* Confidence indicator */}
        {typeof item.confidence === "number" && (
          <div className="mt-2 text-xs text-amber-50/60">
            Confidence: {Math.round(item.confidence * 100)}%
          </div>
        )}
        {typeof item.confidence === "string" && item.confidence.trim() !== "" && (
          <div className="mt-2 text-xs text-amber-50/60">
            Confidence: {humanizeValue(item.confidence)}
          </div>
        )}
      </div>

      {/* Proposed changes — only shown when the class supports it and item is not non-mutating */}
      {shouldShowProposedChanges(hasProposedEntries, isNonMutating, recClass) && (
        <div className="mt-3 rounded-lg bg-amber-500/5 p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-amber-500/70">
            Fields That Will Change
          </div>
          <div className="space-y-2">
            {proposedEntries.map(([key, value]) => (
              <div
                key={key}
                className="flex flex-col gap-1 border-b border-amber-500/10 pb-2 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="text-xs text-amber-50/60">{humanizeKey(key)}</div>
                <div className="text-sm text-amber-100 sm:text-right">{humanizeValue(value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {state?.error && (
        <div className="mt-3 text-sm text-red-400">{state.error}</div>
      )}

      {/* Resolved state */}
      {(isAccepted || isRejected) && (
        <div className="mt-3 text-sm text-amber-200/80">
          {isAccepted ? "Applied." : "Dismissed."}
        </div>
      )}

      {/* Action buttons + explainer */}
      {!isAccepted && !isRejected && (
        <>
          <ActionButtons
            recClass={recClass}
            isNonMutating={isNonMutating}
            isApplying={isApplying}
            hasProposedEntries={hasProposedEntries}
            onAccept={onAccept}
            onReject={onReject}
            onAskCurator={onAskCurator}
          />
          <ActionExplainer
            recClass={recClass}
            isNonMutating={isNonMutating}
            hasProposedEntries={hasProposedEntries}
          />
        </>
      )}
    </div>
  );
}
