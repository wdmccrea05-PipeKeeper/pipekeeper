import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Archive, Loader2, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import AttachmentManager from '@/components/collection/AttachmentManager';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import {
  PACKAGING_CONDITION_LABELS,
  PACKAGING_LABELS,
  buildRecipeActivity,
  cellaringMonths,
  formatCellaringDuration,
  packagingSummary,
  recipeSummary,
  reconcileBlendQuantities,
} from '@/lib/collection/cellar';

const FIELD_STYLE = {
  background: 'linear-gradient(135deg, rgba(60,45,30,0.6), rgba(50,35,25,0.8))',
  border: '1px solid rgba(140,105,65,0.4)',
  color: '#E0D8C8',
};

const label = { color: 'rgba(224,216,200,0.72)', fontSize: '12px', fontWeight: 600 };

/**
 * Cellar documentation for one blend: where it is stored, how it is packaged,
 * when it was produced and cellared, the recipe behind a custom mixture and the
 * labels or photographs that support the record.
 */
export default function TobaccoCellarDocumentation({ blend, onUpdate }) {
  const { user } = useCurrentUser();
  const [locations, setLocations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [recipe, setRecipe] = useState(() => recipeSummary(blend?.blend_recipe).rows);
  const [draft, setDraft] = useState({
    storage_location_id: blend?.storage_location_id || '',
    storage_note: blend?.storage_note || '',
    packaging_type: blend?.packaging_type || '',
    packaging_condition: blend?.packaging_condition || '',
    cellar_start_date: blend?.cellar_start_date || '',
    production_date: blend?.production_date || '',
    batch_number: blend?.batch_number || '',
    is_custom_blend: Boolean(blend?.is_custom_blend),
  });

  useEffect(() => {
    let cancelled = false;
    if (!user?.email) return undefined;
    base44.entities.StorageLocation
      .filter({ created_by: user.email }, { sort: 'name', limit: 100 })
      .then((page) => { if (!cancelled) setLocations(page?.items || []); })
      .catch(() => { if (!cancelled) setLocations([]); });
    return () => { cancelled = true; };
  }, [user?.email]);

  useEffect(() => {
    setRecipe(recipeSummary(blend?.blend_recipe).rows);
    setDraft({
      storage_location_id: blend?.storage_location_id || '',
      storage_note: blend?.storage_note || '',
      packaging_type: blend?.packaging_type || '',
      packaging_condition: blend?.packaging_condition || '',
      cellar_start_date: blend?.cellar_start_date || '',
      production_date: blend?.production_date || '',
      batch_number: blend?.batch_number || '',
      is_custom_blend: Boolean(blend?.is_custom_blend),
    });
  }, [blend?.id, blend?.updated_date]);

  const months = cellaringMonths(blend);
  const packaging = packagingSummary(blend);
  const reconciliation = useMemo(() => reconcileBlendQuantities(blend), [blend]);
  const recipeState = recipeSummary(recipe);

  const save = async () => {
    setSaving(true);
    try {
      const patch = { ...draft, storage_location_id: draft.storage_location_id || null };
      await base44.entities.TobaccoBlend.update(blend.id, patch);
      if ((blend.storage_location_id || '') !== (patch.storage_location_id || '')) {
        await base44.entities.CollectionActivity.create({
          record_entity: 'TobaccoBlend',
          record_id: blend.id,
          record_name: blend.name || 'Blend',
          module_key: 'pipekeeper',
          event_type: 'storage_change',
          summary: 'Storage location changed',
          detail: `Now stored in ${locations.find((l) => l.id === patch.storage_location_id)?.name || 'no named location'}`,
          changed_fields: ['storage_location_id'],
          actor_email: user?.email || blend.created_by || '',
          occurred_at: new Date().toISOString(),
        });
      }
      if (onUpdate) onUpdate(patch);
      toast.success('Cellar details saved');
    } catch (error) {
      toast.error(error?.message || 'Could not save cellar details.');
    } finally {
      setSaving(false);
    }
  };

  const saveRecipe = async () => {
    setSaving(true);
    try {
      const previous = recipeSummary(blend.blend_recipe).rows;
      const next = recipeState.rows;
      const history = Array.isArray(blend.recipe_history) ? blend.recipe_history : [];
      await base44.entities.TobaccoBlend.update(blend.id, {
        blend_recipe: next,
        recipe_history: [...history, { recorded_at: new Date().toISOString(), note: '', recipe: next }],
      });
      const activity = buildRecipeActivity({
        blend,
        previousRecipe: previous,
        nextRecipe: next,
        actorEmail: user?.email,
      });
      if (activity) await base44.entities.CollectionActivity.create(activity);
      if (onUpdate) onUpdate({ blend_recipe: next });
      toast.success('Recipe saved');
    } catch (error) {
      toast.error(error?.message || 'Could not save the recipe.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.18)' }}>
      <div className="flex items-center gap-2">
        <Archive className="w-4 h-4" style={{ color: 'rgba(180,140,75,0.9)' }} />
        <span className="text-sm font-semibold" style={{ color: '#E0D8C8' }}>Cellar documentation</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span style={label}>Storage location</span>
          <select
            value={draft.storage_location_id}
            onChange={(e) => setDraft((d) => ({ ...d, storage_location_id: e.target.value }))}
            className="w-full mt-1 rounded-lg px-3 py-2 text-sm"
            style={FIELD_STYLE}
          >
            <option value="">Not assigned</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </div>
        <div>
          <span style={label}>Position inside the location</span>
          <Input
            value={draft.storage_note}
            onChange={(e) => setDraft((d) => ({ ...d, storage_note: e.target.value }))}
            placeholder="Shelf, bin or jar label"
            className="mt-1"
            style={FIELD_STYLE}
          />
        </div>
        <div>
          <span style={label}>Packaging</span>
          <select
            value={draft.packaging_type}
            onChange={(e) => setDraft((d) => ({ ...d, packaging_type: e.target.value }))}
            className="w-full mt-1 rounded-lg px-3 py-2 text-sm"
            style={FIELD_STYLE}
          >
            <option value="">Not recorded</option>
            {Object.entries(PACKAGING_LABELS).map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </select>
        </div>
        <div>
          <span style={label}>Packaging condition</span>
          <select
            value={draft.packaging_condition}
            onChange={(e) => setDraft((d) => ({ ...d, packaging_condition: e.target.value }))}
            className="w-full mt-1 rounded-lg px-3 py-2 text-sm"
            style={FIELD_STYLE}
          >
            <option value="">Not recorded</option>
            {Object.entries(PACKAGING_CONDITION_LABELS).map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </select>
        </div>
        <div>
          <span style={label}>Cellaring start</span>
          <Input
            type="date"
            value={draft.cellar_start_date}
            onChange={(e) => setDraft((d) => ({ ...d, cellar_start_date: e.target.value }))}
            className="mt-1"
            style={FIELD_STYLE}
          />
        </div>
        <div>
          <span style={label}>Production date</span>
          <Input
            type="date"
            value={draft.production_date}
            onChange={(e) => setDraft((d) => ({ ...d, production_date: e.target.value }))}
            className="mt-1"
            style={FIELD_STYLE}
          />
        </div>
        <div>
          <span style={label}>Batch or lot</span>
          <Input
            value={draft.batch_number}
            onChange={(e) => setDraft((d) => ({ ...d, batch_number: e.target.value }))}
            className="mt-1"
            style={FIELD_STYLE}
          />
        </div>
        <div>
          <span style={label}>Cellaring duration</span>
          <p className="text-sm mt-2" style={{ color: '#E0D8C8' }}>
            {months === null ? 'No cellaring date recorded' : formatCellaringDuration(months)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
          Save cellar details
        </Button>
        {packaging.label && <span className="text-xs" style={{ color: 'rgba(224,216,200,0.55)' }}>Currently {packaging.label.toLowerCase()}</span>}
      </div>

      {!reconciliation.ok && (
        <div className="rounded-lg p-3" style={{ background: 'rgba(179,95,95,0.12)', border: '1px solid rgba(179,95,95,0.35)' }}>
          <p className="flex items-center gap-2 text-xs font-semibold" style={{ color: '#E8B4B4' }}>
            <AlertTriangle className="w-3.5 h-3.5" /> Quantity discrepancy
          </p>
          {reconciliation.discrepancies.map((row) => (
            <p key={row.field} className="text-xs mt-1 break-words" style={{ color: 'rgba(232,180,180,0.85)' }}>{row.message}</p>
          ))}
        </div>
      )}

      <div className="pt-2 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold" style={{ color: '#E0D8C8' }}>Blend recipe</span>
          <label className="flex items-center gap-2 text-xs" style={{ color: 'rgba(224,216,200,0.7)' }}>
            <input
              type="checkbox"
              checked={draft.is_custom_blend}
              onChange={(e) => setDraft((d) => ({ ...d, is_custom_blend: e.target.checked }))}
            />
            Custom or shop-blended mixture
          </label>
        </div>
        <p className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>
          Record the components and their proportions. Revisions are kept in the recipe history.
        </p>

        {recipe.map((row, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={row.component}
              placeholder="Component"
              onChange={(e) => setRecipe((rows) => rows.map((r, i) => (i === index ? { ...r, component: e.target.value } : r)))}
              style={FIELD_STYLE}
            />
            <Input
              type="number"
              value={Number.isFinite(row.proportion) ? row.proportion : ''}
              placeholder="%"
              className="w-20"
              onChange={(e) => setRecipe((rows) => rows.map((r, i) => (i === index ? { ...r, proportion: Number(e.target.value) } : r)))}
              style={FIELD_STYLE}
            />
            <Button size="icon" variant="ghost" onClick={() => setRecipe((rows) => rows.filter((_, i) => i !== index))}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setRecipe((rows) => [...rows, { component: '', proportion: 0, note: '' }])}>
            <Plus className="w-4 h-4 mr-1" /> Add component
          </Button>
          <Button size="sm" onClick={saveRecipe} disabled={saving || recipeState.rows.length === 0}>
            Save recipe
          </Button>
          {recipeState.rows.length > 0 && !recipeState.isComplete && (
            <span className="text-xs" style={{ color: '#E4C88A' }}>
              Proportions total {recipeState.sum}% ({recipeState.gap > 0 ? `${recipeState.gap}% unassigned` : `${Math.abs(recipeState.gap)}% over`})
            </span>
          )}
        </div>
      </div>

      <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-sm font-semibold mb-2" style={{ color: '#E0D8C8' }}>Labels and supporting documents</p>
        <AttachmentManager entityName="TobaccoBlend" record={blend} />
      </div>
    </div>
  );
}