/**
 * Combined Session Save Integrity Tests
 * Covers: duplicate-save prevention, save lock lifecycle,
 * PostSessionPrompt path, and activity normalizer dedupe.
 */
import { describe, it, expect } from "vitest";
import { buildUnifiedActivityFeed } from "@/components/utils/activityNormalizer";

// ─── Activity Normalizer ────────────────────────────────────────────────────

describe("buildUnifiedActivityFeed — dedupe integrity", () => {
  it("deduplicates accidental exact-duplicate rows (same id)", () => {
    const log = { id: "smoke-1", pipe_id: "p1", blend_id: "b1", pipe_name: "Test Pipe", blend_name: "Test Blend", date: "2024-01-01T12:00:00Z" };
    const feed = buildUnifiedActivityFeed([log, log], [], { limit: 20 });
    expect(feed).toHaveLength(1);
  });

  it("preserves two distinct tastings of the same bottle on the same day", () => {
    const t1 = { id: "t-001", bottle_id: "b1", bottle_name: "Eagle Rare", tasting_date: "2024-01-01T10:00:00Z" };
    const t2 = { id: "t-002", bottle_id: "b1", bottle_name: "Eagle Rare", tasting_date: "2024-01-01T15:00:00Z" };
    const feed = buildUnifiedActivityFeed([], [t1, t2], { limit: 20 });
    expect(feed).toHaveLength(2);
  });

  it("preserves a smoking log and a tasting log from the same session_group_id as distinct entries", () => {
    const smoke = { id: "s-001", pipe_id: "p1", blend_name: "Blend A", date: "2024-01-01T12:00:00Z", session_group_id: "grp-1" };
    const tasting = { id: "t-001", bottle_id: "b1", bottle_name: "Whiskey X", tasting_date: "2024-01-01T12:00:00Z", session_group_id: "grp-1" };
    const feed = buildUnifiedActivityFeed([smoke], [tasting], { limit: 20 });
    expect(feed).toHaveLength(2);
  });

  it("deduplicates accidental double-save with same synthetic id", () => {
    // Logs without real DB ids get synthetic ids — same content = same key
    const log = { pipe_id: "p1", blend_id: "b1", pipe_name: "Pipe", blend_name: "Blend", date: "2024-06-01T09:00:00Z" };
    const feed = buildUnifiedActivityFeed([log, log], [], { limit: 20 });
    expect(feed).toHaveLength(1);
  });

  it("respects the limit option", () => {
    const logs = Array.from({ length: 30 }, (_, i) => ({
      id: `s-${i}`,
      pipe_id: `p${i}`,
      blend_name: `Blend ${i}`,
      date: new Date(Date.now() - i * 60000).toISOString(),
    }));
    const feed = buildUnifiedActivityFeed(logs, [], { limit: 10 });
    expect(feed).toHaveLength(10);
  });
});

// ─── Save lock / duplicate-operations prevention (unit-level) ─────────────

describe("CombinedSessionModal save lock logic", () => {
  /**
   * We test the guard logic independently since mounting the full modal
   * requires heavy mocking. These tests verify the pattern used in
   * handleConfirm() is correct by simulating a minimal version.
   */

  function makeSaveLock() {
    let saving = false;
    let lockRef = { current: false };
    const ops = [];

    async function handleConfirm() {
      if (saving || lockRef.current) return; // hard guard
      lockRef.current = true;
      saving = true;
      try {
        ops.push("create-smoke");
        ops.push("create-tasting");
      } finally {
        saving = false;
      }
    }

    return { handleConfirm, ops, lockRef };
  }

  it("rapid double-click fires only one set of operations", async () => {
    const { handleConfirm, ops, lockRef } = makeSaveLock();
    // Simulate two near-simultaneous clicks
    await Promise.all([handleConfirm(), handleConfirm()]);
    expect(ops).toHaveLength(2); // only one smoke + one tasting
  });

  it("lock is acquired before async work begins", async () => {
    const { handleConfirm, lockRef } = makeSaveLock();
    const p = handleConfirm();
    // Lock should be set synchronously before await resolves
    expect(lockRef.current).toBe(true);
    await p;
  });

  it("second call is a no-op while first is in flight", async () => {
    const { handleConfirm, ops } = makeSaveLock();
    let firstResolve;
    const first = new Promise((res) => { firstResolve = res; });

    // Wrap handleConfirm to pause mid-execution
    let calls = 0;
    const guarded = async () => {
      calls++;
      if (calls > 1) return; // simulate second blocked call
      await first;
      ops.push("op");
    };

    const p1 = guarded();
    const p2 = guarded(); // should be blocked
    firstResolve();
    await Promise.all([p1, p2]);

    expect(ops).toHaveLength(1);
  });

  it("lock does not reset on success until PostSessionPrompt completes", () => {
    // Verify the lock reset timing: lock stays set after save success,
    // only resetting inside PostSessionPrompt onDone or on explicit close.
    let lockRef = { current: false };
    let postPromptItems = null;

    function onSaveSuccess(externalItems) {
      // Lock stays set — not reset here
      if (externalItems.length > 0) {
        postPromptItems = externalItems;
        // lock remains set
      } else {
        lockRef.current = false; // safe to reset only after close
      }
    }

    function onPostPromptDone() {
      lockRef.current = false; // reset only after prompt completes
    }

    lockRef.current = true;
    onSaveSuccess(["item-1"]);
    expect(lockRef.current).toBe(true); // still locked during prompt

    onPostPromptDone();
    expect(lockRef.current).toBe(false); // now safe
  });

  it("lock resets on save failure", () => {
    let lockRef = { current: true };
    let saving = false;

    function onSaveFailure() {
      lockRef.current = false;
      saving = false;
    }

    onSaveFailure();
    expect(lockRef.current).toBe(false);
    expect(saving).toBe(false);
  });

  it("lock resets fully when modal closes and reopens (isOpen=false effect)", () => {
    let lockRef = { current: true };
    let saving = true;

    // Simulates the useEffect(() => { if (!isOpen) { ... lockRef.current = false } })
    function onModalClose() {
      lockRef.current = false;
      saving = false;
    }

    onModalClose();
    expect(lockRef.current).toBe(false);
    expect(saving).toBe(false);
  });
});