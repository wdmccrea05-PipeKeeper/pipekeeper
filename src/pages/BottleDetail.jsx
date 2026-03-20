import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  DollarSign,
  Star,
  Sparkles,
  GlassWater,
  CalendarDays,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import LogTastingModal from '@/components/whiskey/LogTastingModal';
import InlinePhotoEditor from '@/components/shared/InlinePhotoEditor';
import {
  formatCurrency,
  resolveBottleTotalValue,
  resolveBottleUnitValue,
  resolveBottleValueSource,
} from '@/components/whiskey/utils/bottleValue';

function getBottlePhoto(bottle) {
  return (
    bottle?.photo ||
    bottle?.image ||
    bottle?.image_url ||
    (Array.isArray(bottle?.photos) ? bottle.photos[0] : null) ||
    null
  );
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US');
}

function DetailStat({ label, value, icon: Icon }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(180,140,75,0.16)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[rgba(180,140,75,0.12)] border border-[rgba(180,140,75,0.2)]">
          <Icon className="w-4 h-4 text-[#B48C4B]" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">{label}</p>
          <p className="text-lg font-semibold text-[#F5F1E7] mt-1 break-words">{value}</p>
        </div>
      </div>
    </div>
  );
}

function TastingRow({ tasting, onEdit }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(180,140,75,0.14)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#F5F1E7]">
            {tasting.rating ? `⭐ ${tasting.rating}` : 'Unrated tasting'}
          </p>
          <p className="text-xs text-[#D8C7A6]/70 mt-1">
            {formatDate(tasting.tasting_date)} • {tasting.serving_method || 'Neat'}
          </p>
          <p className="text-sm text-[#E0D8C8]/84 mt-3 break-words whitespace-pre-wrap">
            {tasting.notes || 'No notes'}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => onEdit(tasting)}>
          Edit
        </Button>
      </div>
    </div>
  );
}

export default function BottleDetail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const bottleId = params.get('id') || params.get('bottleId');

  const [bottle, setBottle] = useState(null);
  const [tastings, setTastings] = useState([]);
  const [allBottles, setAllBottles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTasting, setEditingTasting] = useState(null);
  const [showTastingModal, setShowTastingModal] = useState(false);

  async function loadBottle() {
    if (!bottleId) {
      setLoading(false);
      return;
    }

    try {
      const record = await base44.entities.Bottle.get(bottleId);
      setBottle(record);
    } catch (e) {
      console.error('[BottleDetail] failed to load bottle', e);
      setBottle(null);
    }
  }

  async function loadTastings() {
    if (!bottleId) return;
    try {
      const rows = await base44.entities.TastingLog.filter({ bottle_id: bottleId });
      const sorted = [...(rows || [])].sort(
        (a, b) => new Date(b.tasting_date || b.created_at) - new Date(a.tasting_date || a.created_at)
      );
      setTastings(sorted);
    } catch (e) {
      console.error('[BottleDetail] failed to load tastings', e);
      setTastings([]);
    }
  }

  async function loadAllBottles() {
    try {
      const rows = await base44.entities.Bottle.list?.('-created_date') || [];
      setAllBottles(rows);
    } catch (e) {
      console.error('[BottleDetail] failed to load bottles', e);
      setAllBottles([]);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await Promise.all([loadBottle(), loadTastings(), loadAllBottles()]);
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [bottleId]);

  const photo = useMemo(() => getBottlePhoto(bottle), [bottle]);

  const avgRating = useMemo(() => {
    const rated = tastings.filter((t) => t.rating !== null && t.rating !== undefined && t.rating !== '');
    if (!rated.length) return null;
    const avg = rated.reduce((sum, t) => sum + Number(t.rating || 0), 0) / rated.length;
    return avg.toFixed(1);
  }, [tastings]);

  const valueSource = useMemo(() => resolveBottleValueSource(bottle), [bottle]);
  const unitValue = useMemo(() => resolveBottleUnitValue(bottle), [bottle]);
  const totalValue = useMemo(() => resolveBottleTotalValue(bottle), [bottle]);

  if (loading) {
    return (
      <div className="p-6 text-[#F5F1E7]">
        <p>Loading bottle…</p>
      </div>
    );
  }

  if (!bottle) {
    return (
      <div className="p-6 text-[#F5F1E7]">
        <p>Unable to load record.</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 text-[#F5F1E7]">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Button
            onClick={() => navigate(`/BottleForm?id=${encodeURIComponent(bottle.id)}`)}
            style={{
              background: 'linear-gradient(135deg, rgba(201,110,110,1), rgba(168,84,84,1))',
              color: '#fff',
            }}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>

        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(38,26,18,0.98), rgba(25,17,12,1))',
            border: '1px solid rgba(180,140,75,0.18)',
            boxShadow: '0 14px 40px rgba(0,0,0,0.4)',
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr]">
            <div className="p-6 flex items-center justify-center border-r border-[rgba(180,140,75,0.12)]">
              {photo ? (
                <img
                  src={photo}
                  alt={bottle.name}
                  className="max-h-[520px] w-full object-contain"
                  style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.45))' }}
                />
              ) : (
                <div className="w-full h-[360px] rounded-2xl flex items-center justify-center bg-[rgba(255,255,255,0.03)] text-[#D8C7A6]/55 border border-[rgba(180,140,75,0.14)]">
                  No photo
                </div>
              )}
            </div>

            <div className="p-6 md:p-8 space-y-6">
              <div>
                <h1
                  className="text-3xl md:text-5xl font-bold leading-tight break-words"
                  style={{ fontFamily: "'Georgia', serif" }}
                >
                  {bottle.name}
                </h1>
                <p className="text-base md:text-lg text-[#D8C7A6]/84 mt-3 break-words">
                  {[bottle.distillery, bottle.region, bottle.country].filter(Boolean).join(' • ')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailStat label="Type" value={bottle.type || '—'} icon={Star} />
                <DetailStat label="Bottle Type" value={bottle.bottle_type || '—'} icon={Star} />
                <DetailStat label="Amount Paid" value={formatCurrency(bottle.purchase_price)} icon={DollarSign} />
                <DetailStat label="Collector Value" value={formatCurrency(bottle.collector_value)} icon={DollarSign} />
              </div>

              <div
                className="rounded-2xl p-5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(180,140,75,0.14)',
                }}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Age (Years)</p>
                    <p className="text-2xl font-semibold mt-2">{bottle.age || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">ABV (%)</p>
                    <p className="text-2xl font-semibold mt-2">{bottle.abv || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Bottle Size</p>
                    <p className="text-2xl font-semibold mt-2">{bottle.bottle_size || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[#D8C7A6]/68">Avg Rating</p>
                    <p className="text-2xl font-semibold mt-2">{avgRating ? `⭐ ${avgRating}` : '—'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div
                  className="rounded-2xl p-5"
                  style={{
                    background: 'linear-gradient(145deg, rgba(50,35,22,0.7), rgba(28,18,12,0.92))',
                    border: '1px solid rgba(180,140,75,0.18)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <DollarSign className="w-5 h-5 text-[#B48C4B]" />
                    <div>
                      <p className="text-lg font-semibold">Valuation</p>
                      <p className="text-sm text-[#D8C7A6]/74">{valueSource.label} • {valueSource.confidence} confidence</p>
                    </div>
                  </div>
                  <p className="text-3xl font-bold">{formatCurrency(unitValue)}</p>
                  <p className="text-sm text-[#D8C7A6]/78 mt-2">
                    Total estimated value: {formatCurrency(totalValue)}
                  </p>
                </div>

                <div
                  className="rounded-2xl p-5"
                  style={{
                    background: 'linear-gradient(145deg, rgba(50,35,22,0.7), rgba(28,18,12,0.92))',
                    border: '1px solid rgba(180,140,75,0.18)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="w-5 h-5 text-[#B48C4B]" />
                    <div>
                      <p className="text-lg font-semibold">Pairing & Tasting Intelligence</p>
                      <p className="text-sm text-[#D8C7A6]/74">Flavor context and serving suggestions</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {bottle.type ? (
                      <span className="px-3 py-1 rounded-full text-sm bg-[rgba(180,140,75,0.14)] border border-[rgba(180,140,75,0.2)]">
                        {bottle.type}
                      </span>
                    ) : null}
                    {bottle.region ? (
                      <span className="px-3 py-1 rounded-full text-sm bg-[rgba(180,140,75,0.14)] border border-[rgba(180,140,75,0.2)]">
                        {bottle.region}
                      </span>
                    ) : null}
                    {bottle.country ? (
                      <span className="px-3 py-1 rounded-full text-sm bg-[rgba(180,140,75,0.14)] border border-[rgba(180,140,75,0.2)]">
                        {bottle.country}
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div className="rounded-xl p-3 bg-white/5 border border-[rgba(180,140,75,0.14)]">
                      <p className="text-sm font-semibold text-[#E0D8C8]">Neat</p>
                      <p className="text-sm text-[#D8C7A6]/76 mt-1">Full flavor expression at room temperature</p>
                    </div>
                    <div className="rounded-xl p-3 bg-white/5 border border-[rgba(180,140,75,0.14)]">
                      <p className="text-sm font-semibold text-[#E0D8C8]">With Ice</p>
                      <p className="text-sm text-[#D8C7A6]/76 mt-1">Opens lighter notes as it dilutes</p>
                    </div>
                    <div className="rounded-xl p-3 bg-white/5 border border-[rgba(180,140,75,0.14)]">
                      <p className="text-sm font-semibold text-[#E0D8C8]">With Water</p>
                      <p className="text-sm text-[#D8C7A6]/76 mt-1">A few drops can unlock hidden complexity</p>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    style={{
                      background: 'linear-gradient(135deg, rgba(180,77,77,1), rgba(148,62,62,1))',
                      color: '#fff',
                    }}
                    onClick={() =>
                      navigate('/Curator', {
                        state: {
                          seedPrompt: `Help me understand this bottle and how to enjoy it: ${bottle.name}${bottle.distillery ? ` by ${bottle.distillery}` : ''}. Include tasting guidance, serving suggestions, and what pairs well with it in my collection.`,
                          scope: 'whiskeykeeper',
                          selectedModules: ['whiskeykeeper'],
                          sourceRecord: {
                            id: bottle.id,
                            type: 'bottle',
                            name: bottle.name,
                          },
                        },
                      })
                    }
                  >
                    <GlassWater className="w-4 h-4 mr-2" />
                    Ask Curator about this bottle
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setEditingTasting(null);
                    setShowTastingModal(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(196,122,58,1), rgba(160,95,40,1))',
                    color: '#1A120D',
                  }}
                >
                  Record Tasting
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div
          className="rounded-3xl p-6"
          style={{
            background: 'linear-gradient(145deg, rgba(38,26,18,0.95), rgba(25,17,12,0.98))',
            border: '1px solid rgba(180,140,75,0.18)',
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <CalendarDays className="w-5 h-5 text-[#B48C4B]" />
            <div>
              <h2 className="text-xl font-bold">Tasting History</h2>
              <p className="text-sm text-[#D8C7A6]/74">
                {tastings.length} {tastings.length === 1 ? 'entry' : 'entries'}
              </p>
            </div>
          </div>

          {tastings.length === 0 ? (
            <div className="rounded-2xl p-6 text-[#D8C7A6]/70 bg-white/3 border border-[rgba(180,140,75,0.14)]">
              No tasting history yet.
            </div>
          ) : (
            <div className="space-y-3">
              {tastings.map((tasting) => (
                <TastingRow
                  key={tasting.id}
                  tasting={tasting}
                  onEdit={(t) => {
                    setEditingTasting(t);
                    setShowTastingModal(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showTastingModal ? (
        <LogTastingModal
          bottle={bottle}
          bottles={allBottles}
          editLog={editingTasting}
          onClose={() => {
            setEditingTasting(null);
            setShowTastingModal(false);
          }}
          onSaved={async () => {
            await loadTastings();
            setEditingTasting(null);
            setShowTastingModal(false);
          }}
        />
      ) : null}
    </>
  );
}