import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, List, Plus, Filter, Search as SearchIcon, Loader2, ChevronRight, PenLine } from "lucide-react";
import WantListCard from "@/components/wantlist/WantListCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { rankSearchResults } from "@/utils/search/SmartSearchEngine";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useAccessSummary } from "@/components/hooks/useAccessSummary";
import { useTranslation } from "@/components/i18n/safeTranslation";

// ─── AI Search config (mirrored from AddFlowQuickSearch) ───────────────────
const SEARCH_PROMPTS = {
  blend: (q) => `Find exact tobacco blend matches for "${q}". Return up to 8 results as JSON with "items" array. Each item: name, manufacturer, blend_type, strength, cut, description, flavor_notes.`,
  pipe: (q) => `Find exact tobacco pipe matches for "${q}". Return up to 8 results as JSON with "items" array. Each item: name, maker, model, shape, bowl_material, description.`,
  bottle: (q) => `Find exact whiskey bottle matches for "${q}". Return up to 8 results as JSON with "items" array. Each item: name, distillery, expression, whiskey_type, type, age, abv, description.`,
  cigar: (q) => `Find exact cigar matches for "${q}". Return up to 8 results as JSON with "items" array. Each item: name, brand, vitola, wrapper, strength, country_of_origin, description.`,
};

const SEARCH_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          manufacturer: { type: "string" },
          maker: { type: "string" },
          model: { type: "string" },
          distillery: { type: "string" },
          expression: { type: "string" },
          blend_type: { type: "string" },
          whiskey_type: { type: "string" },
          type: { type: "string" },
          shape: { type: "string" },
          description: { type: "string" },
        },
      },
    },
  },
};

function subtitleFor(itemType, item) {
  if (itemType === "blend") return item.manufacturer;
  if (itemType === "pipe") return item.maker || item.model;
  if (itemType === "bottle") return item.distillery;
  if (itemType === "cigar") return item.brand || item.vitola;
  return "";
}

const BASE_ITEM_TYPES = [
  { value: "blend", itemType: "blend", moduleKey: "pipekeeper" },
  { value: "pipe", itemType: "pipe", moduleKey: "pipekeeper" },
  { value: "bottle", itemType: "bottle", moduleKey: "whiskeykeeper" },
  { value: "cigar", itemType: "cigar", moduleKey: "cigarkeeper" },
  { value: "wine", itemType: "wine", moduleKey: "winekeeper" },
];

// ─── Manual add forms ───────────────────────────────────────────────────────
function ManualForm({ itemType, onSubmit, onBack }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({});
  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const fields =
    itemType === "pipe"
      ? [
          { key: "maker", label: t("wantList.manualForm.fields.maker"), required: true },
          { key: "name", label: t("wantList.manualForm.fields.modelName"), required: true },
          { key: "shape", label: t("wantList.manualForm.fields.shapeOptional") },
          { key: "notes", label: t("wantList.manualForm.fields.notesOptional"), multiline: true },
        ]
      : itemType === "blend"
      ? [
          { key: "name", label: t("wantList.manualForm.fields.blendName"), required: true },
          { key: "manufacturer", label: t("wantList.manualForm.fields.manufacturer"), required: true },
          { key: "blend_type", label: t("wantList.manualForm.fields.blendTypeOptional") },
          { key: "notes", label: t("wantList.manualForm.fields.notesOptional"), multiline: true },
        ]
      : itemType === "cigar"
      ? [
          { key: "name", label: t("wantList.manualForm.fields.cigarName"), required: true },
          { key: "brand", label: t("wantList.manualForm.fields.brand"), required: true },
          { key: "vitola", label: t("wantList.manualForm.fields.vitolaSizeOptional") },
          { key: "wrapper", label: t("wantList.manualForm.fields.wrapperOptional") },
          { key: "notes", label: t("wantList.manualForm.fields.notesOptional"), multiline: true },
        ]
      : itemType === "wine"
      ? [
          { key: "name", label: t("wantList.manualForm.fields.wineName"), required: true },
          { key: "producer", label: t("wantList.manualForm.fields.producerWinery"), required: true },
          { key: "vintage", label: t("wantList.manualForm.fields.vintageOptional") },
          { key: "varietal", label: t("wantList.manualForm.fields.varietalStyleOptional") },
          { key: "notes", label: t("wantList.manualForm.fields.notesOptional"), multiline: true },
        ]
      : [
          { key: "name", label: t("wantList.manualForm.fields.bottleNameExpression"), required: true },
          { key: "distillery", label: t("wantList.manualForm.fields.distilleryBrand"), required: true },
          { key: "whiskey_type", label: t("wantList.manualForm.fields.typeCategoryOptional") },
          { key: "notes", label: t("wantList.manualForm.fields.notesOptional"), multiline: true },
        ];

  const handleSubmit = () => {
    if (!form.name?.trim()) {
      toast.error(t("wantList.toasts.nameRequired"));
      return;
    }
    onSubmit(form);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-[#E0D8C8]/60">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="font-semibold text-[#F5F1E7]">{t("wantList.manualForm.addManually")}</h3>
      </div>
      {fields.map((f) =>
        f.multiline ? (
          <div key={f.key}>
            <label className="text-xs text-[#E0D8C8]/60 mb-1 block">{f.label}</label>
            <textarea
              className="w-full bg-[rgba(20,13,8,0.7)] border border-[rgba(180,140,75,0.3)] text-[#F5F1E7] rounded-xl px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-[#A35C5C]"
              value={form[f.key] || ""}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder={f.label}
            />
          </div>
        ) : (
          <div key={f.key}>
            <label className="text-xs text-[#E0D8C8]/60 mb-1 block">{f.label}</label>
            <Input
              value={form[f.key] || ""}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder={f.label}
            />
          </div>
        )
      )}
      <Button className="w-full mt-2" onClick={handleSubmit}>
        {t("wantList.manualForm.continue")}
      </Button>
    </div>
  );
}

// ─── Add Item Multi-Step Flow ────────────────────────────────────────────────
function AddItemFlow({ onDone, onBack }) {
  const { user } = useCurrentUser();
  const userEmail = user?.email || null;
  const access = useAccessSummary();
  const { t } = useTranslation();
  const activeModules = access?.activeModules || [];

  const ITEM_TYPES = useMemo(() => {
    return BASE_ITEM_TYPES
      .filter((item) => activeModules.includes(item.moduleKey))
      .map((item) => ({
        ...item,
        label: t(`wantList.itemTypes.${item.value}`),
      }));
  }, [activeModules, t]);

  const placeholders = {
    blend: t("wantList.search.placeholders.blend"),
    pipe: t("wantList.search.placeholders.pipe"),
    bottle: t("wantList.search.placeholders.bottle"),
    cigar: t("wantList.search.placeholders.cigar"),
  };

  const listDestinations = [
    { value: "wishlist", label: t("wantList.categories.wishList") },
    { value: "shopping_list", label: t("wantList.categories.shopping") },
    { value: "tried_not_owned", label: t("wantList.categories.tried") },
    { value: "do_not_buy_again", label: t("wantList.categories.notForMe") },
  ];

  const [step, setStep] = useState("type"); // type | search | manual | destination
  const [itemType, setItemType] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState([]);
  const [saving, setSaving] = useState(false);

  const typeLabel = ITEM_TYPES.find((t) => t.value === itemType)?.label || "";

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(false);
    try {
      const llmResult = await base44.integrations.Core.InvokeLLM({
        prompt: SEARCH_PROMPTS[itemType](query.trim()),
        response_json_schema: SEARCH_SCHEMA,
        add_context_from_internet: true,
      });
      const rawItems = Array.isArray(llmResult?.items) ? llmResult.items.filter((i) => i?.name) : [];
      const ranked = rankSearchResults(query.trim(), rawItems, itemType);
      setResults(ranked.slice(0, 10));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const handleSelectResult = (item) => {
    setSelectedItem({ ...item, _source: "search" });
    setStep("destination");
  };

  const handleManualSubmit = (form) => {
    setSelectedItem({ ...form, _source: "manual" });
    setStep("destination");
  };

  const handleSaveToList = async (category) => {
    if (!userEmail) {
      toast.error(t("wantList.toasts.unableToIdentifyUser"));
      return;
    }

    setSaving(true);
    try {
      const item = selectedItem;
      const brand =
        item.manufacturer || item.maker || item.distillery || item.brand || "";

      const payload = {
        name: item.name,
        item_type: itemType,
        brand,
        blend_name: itemType === "blend" ? item.name : undefined,
        pipe_model: itemType === "pipe" ? item.model : undefined,
        category,
        status: "active",
        is_manual: item._source === "manual",
        notes: item.notes || "",
        created_by: userEmail,
      };

      await base44.entities.AcquisitionItem.create(payload);
      toast.success(t("wantList.toasts.addedToWantList"));
      onDone();
    } catch {
      toast.error(t("wantList.toasts.failedToSaveItem"));
    } finally {
      setSaving(false);
    }
  };

  if (step === "type") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-[#E0D8C8]/60">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="font-semibold text-[#F5F1E7]">{t("wantList.addFlow.whatTypeOfItem")}</h3>
            <p className="text-xs text-[#E0D8C8]/50">{t("wantList.addFlow.chooseToBeginSearching")}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {ITEM_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                setItemType(t.value);
                setStep("search");
              }}
              className="py-6 rounded-xl border border-[rgba(180,140,75,0.25)] text-[#E0D8C8]/80 hover:bg-white/5 hover:border-[#D4A574]/40 transition-all font-medium text-sm"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "search") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => {
              setStep("type");
              setResults([]);
              setSearched(false);
              setQuery("");
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-[#E0D8C8]/60"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="font-semibold text-[#F5F1E7]">{t("wantList.search.searchForType", { type: typeLabel })}</h3>
            <p className="text-xs text-[#E0D8C8]/50">{placeholders[itemType]}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={placeholders[itemType]}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon className="w-4 h-4" />}
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8 gap-2 text-[#E0D8C8]/40">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">{t("wantList.search.searching")}</span>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {results.map((item, i) => (
              <button
                key={`${item.name}-${i}`}
                onClick={() => handleSelectResult(item)}
                className="w-full text-left flex items-start justify-between gap-3 px-4 py-3 rounded-xl hover:bg-white/[0.05] transition-colors"
                style={{
                  border:
                    item._isExact && i === 0
                      ? "1px solid rgba(180,140,75,0.35)"
                      : "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-[#F5F1E7]">{item.name}</p>
                    {item._isExact && i === 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-[rgba(180,140,75,0.18)] text-[#D4A574] border border-[rgba(180,140,75,0.3)]">
                        {t("wantList.search.exactMatch")}
                      </span>
                    )}
                  </div>
                  {subtitleFor(itemType, item) && (
                    <p className="text-xs mt-0.5 text-[#D4A574]/75">{subtitleFor(itemType, item)}</p>
                  )}
                  {item.description && (
                    <p className="text-xs mt-1 text-[#E0D8C8]/45 line-clamp-2">{item.description}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0 text-[rgba(180,140,75,0.5)]" />
              </button>
            ))}
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <p className="text-sm text-center py-4 text-[#E0D8C8]/50">{t("wantList.search.noResultsFor", { query })}</p>
        )}

        {!loading && !searched && (
          <div className="text-center py-6 text-[#E0D8C8]/30">
            <SearchIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{t("wantList.search.enterNameToSearch")}</p>
          </div>
        )}

        <button
          onClick={() => setStep("manual")}
          className="flex items-center gap-2 justify-center w-full py-3 rounded-xl hover:bg-white/5 transition-colors mt-1 text-[rgba(180,140,75,0.7)]"
          style={{ border: "1px dashed rgba(180,140,75,0.25)" }}
        >
          <PenLine className="w-3.5 h-3.5" />
          <span className="text-sm">{t("wantList.search.addManuallyInstead")}</span>
        </button>
      </div>
    );
  }

  if (step === "manual") {
    return (
      <ManualForm
        itemType={itemType}
        onBack={() => setStep("search")}
        onSubmit={handleManualSubmit}
      />
    );
  }

  if (step === "destination") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => setStep(selectedItem?._source === "manual" ? "manual" : "search")}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-[#E0D8C8]/60"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="font-semibold text-[#F5F1E7]">{t("wantList.addFlow.addToWhichList")}</h3>
            <p className="text-xs text-[#E0D8C8]/50 truncate">{selectedItem?.name}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {listDestinations.map((dest) => (
            <button
              key={dest.value}
              onClick={() => handleSaveToList(dest.value)}
              disabled={saving}
              className="py-5 rounded-xl border border-[rgba(180,140,75,0.25)] text-[#E0D8C8]/80 hover:bg-white/5 hover:border-[#D4A574]/40 transition-all font-medium text-sm disabled:opacity-50"
            >
              {dest.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

// Maps item_type → moduleKey
const ITEM_TYPE_MODULE = {
  blend: "pipekeeper",
  pipe: "pipekeeper",
  bottle: "whiskeykeeper",
  cigar: "cigarkeeper",
};

// ─── View Current List ───────────────────────────────────────────────────────
function ViewList({ onBack }) {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const userEmail = user?.email || null;
  const access = useAccessSummary();
  const { t } = useTranslation();
  const activeModules = useMemo(() => access?.activeModules || [], [access]);

  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [searchText, setSearchText] = useState("");
  const [selectedItems, setSelectedItems] = useState(new Set());

  const sortOptions = {
    recent: t("wantList.sort.recent"),
    priority: t("wantList.sort.priority"),
    name: t("wantList.sort.name"),
    type: t("wantList.sort.type"),
  };

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["acquisitionItems", userEmail],
    enabled: !!userEmail,
    queryFn: async () => {
      const rows = await base44.entities.AcquisitionItem
        .filter({ created_by: userEmail }, "-created_date", 500)
        .catch(() => []);
      return (rows || []).filter((i) => i.status !== "archived" && i.status !== "removed");
    },
  });

  const filteredItems = useMemo(() => {
    let result = items.filter((i) => {
      const mod = ITEM_TYPE_MODULE[i.item_type];
      return !mod || activeModules.includes(mod);
    });

    if (activeTab === "wishlist") result = result.filter((i) => i.category === "wishlist");
    else if (activeTab === "shopping") result = result.filter((i) => i.category === "shopping_list" || i.category === "restock");
    else if (activeTab === "tried") result = result.filter((i) => i.category === "tried_not_owned");
    else if (activeTab === "notforme") result = result.filter((i) => i.category === "do_not_buy_again");

    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (i) =>
          (i.name || "").toLowerCase().includes(q) ||
          (i.brand || "").toLowerCase().includes(q) ||
          (i.blend_name || "").toLowerCase().includes(q) ||
          (i.notes || "").toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortBy === "priority") {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.priority || "medium"] ?? 1) - (order[b.priority || "medium"] ?? 1);
      }
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "type") return (a.item_type || "").localeCompare(b.item_type || "");
      return new Date(b.created_date) - new Date(a.created_date);
    });

    return result;
  }, [items, activeTab, searchText, sortBy, activeModules]);

  const handleStatusChange = () =>
    queryClient.invalidateQueries({ queryKey: ["acquisitionItems", userEmail] });

  const handleArchive = (itemId) => {
    queryClient.setQueryData(["acquisitionItems", userEmail], items.filter((i) => i.id !== itemId));
    setSelectedItems((prev) => {
      const s = new Set(prev);
      s.delete(itemId);
      return s;
    });
  };

  const handleMultiShare = () => {
    if (!selectedItems.size) return;
    const text = items
      .filter((i) => selectedItems.has(i.id))
      .map((i) => `${i.name}${i.brand ? ` by ${i.brand}` : ""}`)
      .join("\n");

    if (navigator.share) navigator.share({ title: t("wantList.page.title"), text });
    else {
      navigator.clipboard.writeText(text);
      toast.success(t("wantList.toasts.copiedToClipboard"));
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-[#E0D8C8]/60">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-xl font-bold text-[#F5F1E7]">{t("wantList.viewList.yourWantList")}</h2>
      </div>

      <div className="flex gap-3 mb-4 flex-col sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-[#D4A574]/50" />
          <Input
            placeholder={t("wantList.viewList.searchPlaceholder")}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                {sortOptions[sortBy]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(sortOptions).map(([k, v]) => (
                <DropdownMenuItem
                  key={k}
                  onClick={() => setSortBy(k)}
                  className={sortBy === k ? "bg-[#b48c4b]/20" : ""}
                >
                  {v}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {selectedItems.size > 0 && (
            <Button variant="outline" size="sm" onClick={handleMultiShare}>
              {t("wantList.viewList.shareCount", { count: selectedItems.size })}
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="all" className="text-xs">{t("wantList.tabs.all")}</TabsTrigger>
          <TabsTrigger value="wishlist" className="text-xs">{t("wantList.tabs.wish")}</TabsTrigger>
          <TabsTrigger value="shopping" className="text-xs">{t("wantList.tabs.shopping")}</TabsTrigger>
          <TabsTrigger value="tried" className="text-xs">{t("wantList.tabs.tried")}</TabsTrigger>
          <TabsTrigger value="notforme" className="text-xs">{t("wantList.tabs.notForMe")}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {!userEmail ? (
            <div className="flex items-center justify-center py-12 text-[#E0D8C8]/50">{t("wantList.page.loading")}</div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12 text-[#E0D8C8]/50">{t("wantList.page.loading")}</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-[#E0D8C8]/50">{t("wantList.viewList.emptyList")}</div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`relative ${selectedItems.has(item.id) ? "ring-2 ring-[#D4A574] rounded-lg" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => {
                      const s = new Set(selectedItems);
                      s.has(item.id) ? s.delete(item.id) : s.add(item.id);
                      setSelectedItems(s);
                    }}
                    className="absolute top-5 left-5 w-4 h-4 cursor-pointer z-10 accent-[#D4A574]"
                  />
                  <div className="pl-10">
                    <WantListCard item={item} onStatusChange={handleStatusChange} onArchive={handleArchive} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Entry Screen ────────────────────────────────────────────────────────────
export default function WantList() {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const { t } = useTranslation();
  const userEmail = user?.email || null;
  const [view, setView] = useState("entry"); // entry | list | add

  const handleAddDone = () => {
    queryClient.invalidateQueries({ queryKey: ["acquisitionItems", userEmail] });
    setView("entry");
  };

  return (
    <div className="min-h-screen pb-10">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {view === "entry" && (
          <div>
            <div className="mb-10">
              <h1 className="text-3xl font-bold text-[#F5F1E7]">{t("wantList.page.title")}</h1>
              <p className="text-[#E0D8C8]/60 mt-1">{t("wantList.page.subtitle")}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setView("list")}
                className="flex flex-col items-start gap-3 p-6 rounded-2xl border border-[rgba(180,140,75,0.25)] bg-[rgba(255,255,255,0.03)] hover:bg-white/5 hover:border-[#D4A574]/40 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[rgba(180,140,75,0.15)] flex items-center justify-center">
                  <List className="w-5 h-5 text-[#D4A574]" />
                </div>
                <div>
                  <div className="font-semibold text-[#F5F1E7]">{t("wantList.page.viewCurrentWantList")}</div>
                  <div className="text-xs text-[#E0D8C8]/50 mt-1">{t("wantList.page.browseSearchManage")}</div>
                </div>
              </button>

              <button
                onClick={() => setView("add")}
                className="flex flex-col items-start gap-3 p-6 rounded-2xl border border-[rgba(180,140,75,0.25)] bg-[rgba(255,255,255,0.03)] hover:bg-white/5 hover:border-[#D4A574]/40 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[rgba(163,92,92,0.18)] flex items-center justify-center">
                  <Plus className="w-5 h-5 text-[#A35C5C]" />
                </div>
                <div>
                  <div className="font-semibold text-[#F5F1E7]">{t("wantList.page.addItemToWantList")}</div>
                  <div className="text-xs text-[#E0D8C8]/50 mt-1">{t("wantList.page.searchOrManuallyAdd")}</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {view === "list" && <ViewList onBack={() => setView("entry")} />}

        {view === "add" && (
          <div>
            <AddItemFlow onDone={handleAddDone} onBack={() => setView("entry")} />
          </div>
        )}
      </div>
    </div>
  );
}