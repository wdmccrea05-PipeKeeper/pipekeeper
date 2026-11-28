import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SHARE_MODULES,
  SHARE_KINDS,
  generateShareToken,
  expiryDateFromDays,
  fetchShareCatalog,
  loadModuleRecords,
} from "@/lib/share/shareClient";

export default function ShareBuilder({ initialModule = "pipe", initialKind = "record", onCreated }) {
  const [moduleKey, setModuleKey] = useState(initialModule);
  const [kind, setKind] = useState(initialKind);
  const [records, setRecords] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [catalog, setCatalog] = useState(null);
  const [visibleFields, setVisibleFields] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiryDays, setExpiryDays] = useState("30");
  const [options, setOptions] = useState({ photos: true, notes: false, rating: false, value: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const moduleMeta = SHARE_MODULES.find((m) => m.key === moduleKey) || SHARE_MODULES[0];
  const catalogFields = useMemo(() => {
    const entry = catalog?.modules?.find((m) => m.key === moduleKey);
    return entry?.fields || [];
  }, [catalog, moduleKey]);

  useEffect(() => {
    fetchShareCatalog().then(setCatalog).catch(() => setCatalog(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadModuleRecords(moduleMeta.entity)
      .then((rows) => { if (!cancelled) setRecords(rows); })
      .catch(() => { if (!cancelled) setRecords([]); });
    setSelectedIds([]);
    return () => { cancelled = true; };
  }, [moduleMeta.entity]);

  const toggleField = (key) => {
    setVisibleFields((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    );
  };

  const toggleRecord = (id) => {
    setSelectedIds((current) => {
      if (kind === "record") return [id];
      return current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    });
  };

  const handleCreate = async () => {
    setError("");
    if (selectedIds.length === 0) {
      setError("Choose at least one item to share.");
      return;
    }
    if (kind !== "record" && selectedIds.length > 200) {
      setError("A share can hold up to 200 items.");
      return;
    }
    setSaving(true);
    try {
      const share = await base44.entities.SharedRecord.create({
        module_type: moduleKey,
        share_kind: kind,
        record_id: kind === "record" ? selectedIds[0] : "",
        record_ids: kind === "record" ? [] : selectedIds,
        owner_email: (await base44.auth.me())?.email || "",
        share_token: generateShareToken(),
        title: title.trim(),
        description: description.trim(),
        visible_fields: visibleFields,
        include_photos: options.photos,
        include_notes: options.notes,
        include_rating: options.rating,
        include_value: options.value,
        include_inventory: false,
        is_active: true,
        view_count: 0,
        expires_at: expiryDateFromDays(expiryDays),
      });
      setSelectedIds([]);
      setTitle("");
      setDescription("");
      onCreated?.(share);
    } catch (e) {
      setError(e?.message || "The share could not be created.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 rounded-2xl p-4" style={{ background: "rgba(42,31,24,0.85)", border: "1px solid rgba(180,140,75,0.25)" }}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="ck-field-label">Collection</Label>
          <Select value={moduleKey} onValueChange={setModuleKey}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SHARE_MODULES.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="ck-field-label">What to share</Label>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SHARE_KINDS.map((k) => <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="ck-field-label">Link expires</Label>
          <Select value={expiryDays} onValueChange={setExpiryDays}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">In 7 days</SelectItem>
              <SelectItem value="30">In 30 days</SelectItem>
              <SelectItem value="90">In 90 days</SelectItem>
              <SelectItem value="365">In a year</SelectItem>
              <SelectItem value={null}>Never</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="ck-field-label">
          Items {kind !== "record" && `(${selectedIds.length} selected)`}
        </Label>
        <div className="max-h-56 overflow-y-auto rounded-lg divide-y" style={{ border: "1px solid rgba(180,140,75,0.2)" }}>
          {records.length === 0 && (
            <p className="p-3 text-sm" style={{ color: "rgba(224,216,200,0.6)" }}>
              No records in this collection yet.
            </p>
          )}
          {records.map((record) => (
            <label key={record.id} className="flex items-center gap-3 p-2.5 cursor-pointer text-sm" style={{ color: "#F5F1E7" }}>
              <Checkbox
                checked={selectedIds.includes(record.id)}
                onCheckedChange={() => toggleRecord(record.id)}
              />
              <span className="min-w-0 break-words">{record.name || "Untitled"}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="ck-field-label">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Estate pipes, 2024" />
        </div>
        <div>
          <Label className="ck-field-label">Introduction (optional)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A small rotation of English blends" />
        </div>
      </div>

      {catalogFields.length > 0 && (
        <div>
          <Label className="ck-field-label">Fields the recipient can see</Label>
          <p className="text-[11px] mb-2" style={{ color: "rgba(224,216,200,0.55)" }}>
            Costs, provenance, private notes and documents are never shared, whichever fields you pick.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {catalogFields.map((field) => (
              <label key={field.key} className="flex items-center gap-2 text-xs" style={{ color: "rgba(224,216,200,0.85)" }}>
                <Checkbox
                  checked={visibleFields.includes(field.key)}
                  onCheckedChange={() => toggleField(field.key)}
                />
                <span className="break-words">{field.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          ["photos", "Photographs"],
          ["notes", "My notes"],
          ["rating", "My rating"],
          ["value", "My value estimate"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-xs" style={{ color: "rgba(224,216,200,0.85)" }}>
            <Checkbox
              checked={options[key]}
              onCheckedChange={(checked) => setOptions((current) => ({ ...current, [key]: checked === true }))}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      {error && <p className="text-sm" style={{ color: "#E08A8A" }}>{error}</p>}

      <Button onClick={handleCreate} disabled={saving}>
        {saving ? "Creating…" : "Create share link"}
      </Button>
    </div>
  );
}