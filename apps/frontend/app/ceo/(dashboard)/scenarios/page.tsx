"use client";

import { useState } from "react";
import { Play, RotateCcw, Save, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

// Scenario parameters
interface ScenarioParam {
  id: string;
  label: string;
  cluster: string;
  type: "revenue" | "cost" | "fx" | "budget";
  currentValue: number;
  adjustedValue: number;
  unit: "%" | "LKR" | "rate";
}

const defaultParams: ScenarioParam[] = [
  { id: "1", label: "Manufacturing Revenue", cluster: "Manufacturing", type: "revenue", currentValue: 0, adjustedValue: 0, unit: "%" },
  { id: "2", label: "Bunkering Recovery", cluster: "Bunkering", type: "revenue", currentValue: 0, adjustedValue: 0, unit: "%" },
  { id: "3", label: "Lube 02 Cost Reduction", cluster: "Lube 02", type: "cost", currentValue: 0, adjustedValue: 0, unit: "%" },
  { id: "4", label: "FX Rate Impact (USD/LKR)", cluster: "Group", type: "fx", currentValue: 325, adjustedValue: 325, unit: "rate" },
  { id: "5", label: "GAC Group Budget Reallocation", cluster: "GAC Group", type: "budget", currentValue: 0, adjustedValue: 0, unit: "LKR" },
];

// Base scenario results
const baseResults = {
  groupPBT: 5050000,
  variance: -150000,
  achievement: 97.1,
  riskExposure: 720000,
};

const formatNumber = (num: number) => num.toLocaleString();
const formatCurrency = (num: number) => `LKR ${(num / 1000000).toFixed(2)}B`;

export default function ScenariosPage() {
  const [params, setParams] = useState<ScenarioParam[]>(defaultParams);
  const [isSimulating, setIsSimulating] = useState(false);
  const [results, setResults] = useState(baseResults);
  const [hasChanges, setHasChanges] = useState(false);

  const updateParam = (id: string, value: number) => {
    setParams(prev => prev.map(p => p.id === id ? { ...p, adjustedValue: value } : p));
    setHasChanges(true);
  };

  const runSimulation = () => {
    setIsSimulating(true);
    
    // Simulate calculation (in real app, this would call GraphQL)
    setTimeout(() => {
      let adjustedPBT = baseResults.groupPBT;
      
      params.forEach(param => {
        if (param.type === "revenue" && param.adjustedValue !== 0) {
          // Revenue impact: 1% change = ~50K PBT impact
          adjustedPBT += param.adjustedValue * 50000;
        }
        if (param.type === "cost" && param.adjustedValue !== 0) {
          // Cost reduction: 1% = ~30K PBT improvement
          adjustedPBT += param.adjustedValue * 30000;
        }
        if (param.type === "fx" && param.adjustedValue !== param.currentValue) {
          // FX impact: 1 LKR change = ~10K PBT impact
          adjustedPBT += (param.adjustedValue - param.currentValue) * 10000;
        }
        if (param.type === "budget" && param.adjustedValue !== 0) {
          adjustedPBT += param.adjustedValue;
        }
      });

      setResults({
        groupPBT: adjustedPBT,
        variance: adjustedPBT - 5200000,
        achievement: (adjustedPBT / 5200000) * 100,
        riskExposure: Math.max(0, 720000 - (adjustedPBT - baseResults.groupPBT) * 0.5),
      });
      
      setIsSimulating(false);
    }, 1000);
  };

  const resetScenario = () => {
    setParams(defaultParams);
    setResults(baseResults);
    setHasChanges(false);
  };

  const pbtChange = results.groupPBT - baseResults.groupPBT;
  const pbtChangePercent = ((pbtChange / baseResults.groupPBT) * 100).toFixed(1);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-[1400px] mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Scenario Modeling</h1>
            <p className="text-sm text-slate-500 mt-1">What-if analysis and impact simulation</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetScenario}
              className="flex items-center gap-2 h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
            <button
              onClick={runSimulation}
              disabled={!hasChanges || isSimulating}
              className="flex items-center gap-2 h-10 px-5 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90 disabled:opacity-50"
            >
              <Play className="h-4 w-4" /> {isSimulating ? "Simulating..." : "Run Simulation"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scenario Parameters */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Scenario Parameters</h3>
              <p className="text-sm text-slate-500 mb-5">Adjust parameters to simulate impact on Group PBT</p>
              
              <div className="space-y-5">
                {params.map((param) => (
                  <div key={param.id} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{param.label}</p>
                        <p className="text-xs text-slate-500">{param.cluster}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        param.type === "revenue" ? "bg-emerald-100 text-emerald-700" :
                        param.type === "cost" ? "bg-blue-100 text-blue-700" :
                        param.type === "fx" ? "bg-purple-100 text-purple-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {param.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={param.type === "fx" ? 300 : param.type === "budget" ? -500000 : -20}
                        max={param.type === "fx" ? 350 : param.type === "budget" ? 500000 : 20}
                        step={param.type === "fx" ? 1 : param.type === "budget" ? 50000 : 1}
                        value={param.adjustedValue}
                        onChange={(e) => updateParam(param.id, parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="w-24 text-right">
                        <span className={`text-lg font-bold ${
                          param.adjustedValue > param.currentValue ? "text-emerald-600" :
                          param.adjustedValue < param.currentValue ? "text-red-600" :
                          "text-slate-700"
                        }`}>
                          {param.type === "budget" ? `${(param.adjustedValue / 1000).toFixed(0)}K` :
                           param.type === "fx" ? param.adjustedValue :
                           `${param.adjustedValue > 0 ? "+" : ""}${param.adjustedValue}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scenario Description */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Simulation Mode</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Changes are for analysis only. No data will be modified unless explicitly approved and saved.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="space-y-5">
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Simulation Results</h3>
              
              <div className="space-y-4">
                {/* Group PBT */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase mb-1">Projected Group PBT</p>
                  <p className="text-2xl font-bold text-[#0b1f3a]">{formatCurrency(results.groupPBT)}</p>
                  {pbtChange !== 0 && (
                    <p className={`text-sm font-medium mt-1 flex items-center gap-1 ${pbtChange >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {pbtChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {pbtChange >= 0 ? "+" : ""}{formatNumber(pbtChange)} ({pbtChangePercent}%)
                    </p>
                  )}
                </div>

                {/* Variance */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase mb-1">Variance to Budget</p>
                  <p className={`text-xl font-bold ${results.variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {results.variance >= 0 ? "+" : ""}{formatNumber(results.variance)}
                  </p>
                </div>

                {/* Achievement */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase mb-1">Achievement %</p>
                  <p className={`text-xl font-bold ${results.achievement >= 100 ? "text-emerald-600" : results.achievement >= 95 ? "text-amber-600" : "text-red-600"}`}>
                    {results.achievement.toFixed(1)}%
                  </p>
                  <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${results.achievement >= 100 ? "bg-emerald-500" : results.achievement >= 95 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${Math.min(results.achievement, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Risk Exposure */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase mb-1">Risk Exposure</p>
                  <p className={`text-xl font-bold ${results.riskExposure < 500000 ? "text-emerald-600" : results.riskExposure < 700000 ? "text-amber-600" : "text-red-600"}`}>
                    {formatNumber(results.riskExposure)}
                  </p>
                </div>
              </div>
            </div>

            {/* Save Scenario */}
            {hasChanges && (
              <button className="w-full flex items-center justify-center gap-2 h-11 text-sm font-medium text-[#0b1f3a] bg-white border border-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/5">
                <Save className="h-4 w-4" /> Save Scenario for Review
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
