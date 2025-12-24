import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, DollarSign, TrendingUp, AlertCircle, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

export default function ValueLookup({ pipe, onUpdateValue }) {
  const [loading, setLoading] = useState(false);
  const [valuation, setValuation] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const lookupValue = async () => {
    setLoading(true);
    try {
      const pipeDescription = `
        Pipe: ${pipe.name}
        Maker: ${pipe.maker || 'Unknown'}
        Country of Origin: ${pipe.country_of_origin || 'Unknown'}
        Shape: ${pipe.shape || 'Unknown'}
        Bowl Material: ${pipe.bowl_material || 'Unknown'}
        Stem Material: ${pipe.stem_material || 'Unknown'}
        Finish: ${pipe.finish || 'Unknown'}
        Year Made: ${pipe.year_made || 'Unknown'}
        Condition: ${pipe.condition || 'Unknown'}
        Stamping: ${pipe.stamping || 'Not specified'}
      `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert pipe appraiser with extensive knowledge of the estate pipe market. Research and estimate the current market value of this pipe based on recent sales data, collector interest, and market trends.

${pipeDescription}

Search for:
1. Recent eBay sold listings for similar pipes
2. Estate pipe dealer prices
3. Auction results for this maker/style
4. Collector forum discussions on value

Provide a detailed valuation in JSON format with:
- estimated_value_low: low end of value range in USD
- estimated_value_high: high end of value range in USD
- estimated_value_mid: most likely value in USD
- confidence: "high", "medium", or "low" based on data availability
- market_factors: array of factors affecting value (positive and negative)
- comparable_sales: brief description of similar pipes and their prices
- notes: any important considerations for this specific pipe
- value_trend: "rising", "stable", or "declining"`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            estimated_value_low: { type: "number" },
            estimated_value_high: { type: "number" },
            estimated_value_mid: { type: "number" },
            confidence: { type: "string" },
            market_factors: { type: "array", items: { type: "string" } },
            comparable_sales: { type: "string" },
            notes: { type: "string" },
            value_trend: { type: "string" }
          }
        }
      });

      setValuation(result);
    } catch (err) {
      console.error('Error looking up value:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyValue = () => {
    if (valuation?.estimated_value_mid) {
      onUpdateValue(Math.round(valuation.estimated_value_mid));
    }
  };

  const confidenceColors = {
    high: "bg-emerald-100 text-emerald-800 border-emerald-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-rose-100 text-rose-800 border-rose-200"
  };

  const trendIcons = {
    rising: <TrendingUp className="w-4 h-4 text-emerald-600" />,
    stable: <div className="w-4 h-4 border-t-2 border-stone-400" />,
    declining: <TrendingUp className="w-4 h-4 text-rose-600 rotate-180" />
  };

  return (
    <div className="space-y-6">
      {!valuation && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
            <DollarSign className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-2">Market Value Lookup</h3>
          <p className="text-stone-500 mb-6 max-w-md mx-auto">
            Search current market data to estimate this pipe's value
          </p>
          <Button
            onClick={lookupValue}
            disabled={loading}
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching Markets...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Lookup Current Value
              </>
            )}
          </Button>
        </div>
      )}

      <AnimatePresence>
        {valuation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-stone-800">Results</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed ? 'Show' : 'Hide'}
              </Button>
            </div>

            {!collapsed && (
              <div className="space-y-6">
            {/* Value Estimate */}
            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    Estimated Value
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={confidenceColors[valuation.confidence]}>
                      {valuation.confidence} confidence
                    </Badge>
                    {valuation.value_trend && (
                      <div className="flex items-center gap-1 text-sm text-stone-600">
                        {trendIcons[valuation.value_trend]}
                        <span className="capitalize">{valuation.value_trend}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-emerald-700 mb-2">
                    ${valuation.estimated_value_mid?.toLocaleString()}
                  </div>
                  <div className="text-sm text-stone-500">
                    Range: ${valuation.estimated_value_low?.toLocaleString()} - ${valuation.estimated_value_high?.toLocaleString()}
                  </div>
                </div>
                <Button 
                  onClick={handleApplyValue}
                  className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700"
                >
                  Apply This Value to Pipe
                </Button>
              </CardContent>
            </Card>

            {/* Market Factors */}
            <Card className="border-stone-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Market Factors</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {valuation.market_factors?.map((factor, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-stone-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Comparable Sales */}
            <Card className="border-stone-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Comparable Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-stone-600">{valuation.comparable_sales}</p>
              </CardContent>
            </Card>

            {/* Notes */}
            {valuation.notes && (
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    Important Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-stone-600">{valuation.notes}</p>
                </CardContent>
              </Card>
            )}

              <div className="text-center">
                <Button variant="outline" onClick={() => setValuation(null)}>
                  Search Again
                </Button>
              </div>
            </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}