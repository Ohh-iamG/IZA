import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ShieldCheck, 
  Cpu, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  RefreshCw, 
  Zap, 
  TrendingUp, 
  Key, 
  Terminal, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Layers,
  Sparkles,
  Lock
} from 'lucide-react';
import { apiFetch } from '../lib/api';

interface AgentStats {
  agent_id: string;
  request_count: number;
  input_units: number;
  output_units: number;
  provider_cost: number;
  customer_charge: number;
  gross_contribution: number;
  avg_latency_ms: number;
}

interface RecentEvent {
  request_id: string;
  user_id: string;
  agent_id: string;
  key_id: string;
  provider: string;
  service: string;
  endpoint: string;
  action: string;
  status: 'success' | 'error' | 'blocked';
  status_code: number;
  latency_ms: number;
  input_units: number;
  output_units: number;
  provider_cost: number;
  customer_charge: number;
  created_at: string;
}

interface DashboardData {
  overview: {
    requestsToday: number;
    activeUsersToday: number;
    activeAgentsToday: number;
    providerCostToday: number;
    customerChargeToday: number;
    grossContributionToday: number;
    blockedToday: number;
    totalRequests: number;
    totalInputUnits: number;
    totalOutputUnits: number;
    totalProviderCost: number;
    totalCustomerCharge: number;
    grossContribution: number;
    totalSuccess: number;
    totalError: number;
    totalBlocked: number;
    avgLatencyMs: number;
  };
  agents: AgentStats[];
  recentEvents: RecentEvent[];
  safeKeyId: string;
}

interface RateLimitTier {
  tier: string;
  name: string;
  requests_per_day: number;
  requests_per_month: number;
  cost_per_thousand_tokens: number;
}

export function ApiAgentsDashboard({ onClose }: { onClose?: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [tiers, setTiers] = useState<RateLimitTier[]>([]);
  const [activeTier, setActiveTier] = useState<string>('personal');
  const [loading, setLoading] = useState(true);
  const [testAgent, setTestAgent] = useState<'iza_master' | 'iza_doctor' | 'iza_bio' | 'iza_ceo' | 'iza_research'>('iza_master');
  const [testPrompt, setTestPrompt] = useState('Brief operational status inquiry');
  const [testExecuting, setTestExecuting] = useState(false);
  const [testNotice, setTestNotice] = useState<string | null>(null);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const [dashRes, tiersRes] = await Promise.all([
        apiFetch('/api/usage/dashboard').then((r) => r.json()),
        apiFetch('/api/usage/tiers').then((r) => r.json()).catch(() => []),
      ]);
      setData(dashRes);
      if (Array.isArray(tiersRes)) {
        setTiers(tiersRes);
      }
    } catch (err: any) {
      console.error('Failed to load usage dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleExecuteTest = async () => {
    if (testExecuting) return;
    setTestExecuting(true);
    setTestNotice(null);
    try {
      const res = await apiFetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testPrompt,
          agentId: testAgent,
        }),
      });
      const result = await res.json();
      if (res.status === 429) {
        setTestNotice(`Rate limit blocked: ${result.error}`);
      } else {
        setTestNotice(`Recorded event [${result.requestId || 'success'}] for agent: ${result.agentId || testAgent}`);
      }
      loadMetrics();
    } catch (err: any) {
      setTestNotice(`Execution fault: ${err.message}`);
    } finally {
      setTestExecuting(false);
    }
  };

  const handleTierChange = async (newTier: string) => {
    try {
      await apiFetch('/api/usage/tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: newTier }),
      });
      setActiveTier(newTier);
      loadMetrics();
    } catch (err) {
      console.warn('Failed to update tier:', err);
    }
  };

  const overview = data?.overview;
  const agents = data?.agents || [];
  const events = data?.recentEvents || [];

  return (
    <div className="bg-[#0B1517] text-[#E2E8F0] min-h-screen font-mono p-4 sm:p-6 flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1A2E33] gap-4">
        <div className="flex items-center gap-3">
          <img 
            src="/assets/aistudio/iza_brand_mark.png" 
            alt="IZA" 
            className="h-7 w-auto object-contain select-none mr-1" 
          />
          <div className="border-l border-[#1A2E33] pl-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-light text-white tracking-wide">IZA CONTROL &bull; API &amp; AGENTS</h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#71F5DB]/15 text-[#71F5DB] border border-[#71F5DB]/30">
                REQ-API-001 &bull; Active
              </span>
            </div>
            <p className="text-xs text-[#7A9299] mt-0.5">
              Strict USAGE vs. CONTENT isolation &bull; Real-time agent costing &bull; Credential-safe telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#13282D] border border-[#1A2E33] text-xs text-[#94A3B8]">
            <Key className="w-3.5 h-3.5 text-[#71F5DB]" />
            <span>Key ID:</span>
            <span className="text-white font-mono font-medium">{data?.safeKeyId || 'iza_key_masked'}</span>
            <Lock className="w-3 h-3 text-[#71F5DB]/70 ml-1" title="Zero Secret Leaks" />
          </div>

          <button
            onClick={loadMetrics}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#13282D] hover:bg-[#1A333A] border border-[#1A2E33] text-xs text-white transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#71F5DB]' : ''}`} />
            <span>Sync</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-[#1A2E33] hover:bg-[#223B42] text-xs text-white transition cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Top Telemetry KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Requests Today */}
        <div className="p-4 rounded-2xl bg-[#0F2024] border border-[#1A2E33] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#7A9299]">
            <span>Requests Today</span>
            <Clock className="w-3.5 h-3.5 text-[#71F5DB]" />
          </div>
          <div className="mt-2 text-2xl font-light text-white">
            {overview?.requestsToday ?? 0}
          </div>
          <span className="text-[10px] text-[#7A9299] mt-1">
            Total All-Time: {overview?.totalRequests ?? 0}
          </span>
        </div>

        {/* Active Users */}
        <div className="p-4 rounded-2xl bg-[#0F2024] border border-[#1A2E33] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#7A9299]">
            <span>Active Users</span>
            <Users className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-light text-white">
            {overview?.activeUsersToday ?? 0}
          </div>
          <span className="text-[10px] text-[#7A9299] mt-1">
            Single-tenant Sovereign
          </span>
        </div>

        {/* Active Agents */}
        <div className="p-4 rounded-2xl bg-[#0F2024] border border-[#1A2E33] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#7A9299]">
            <span>Active Agents</span>
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-light text-white">
            {overview?.activeAgentsToday ?? (agents.length || 1)}
          </div>
          <span className="text-[10px] text-emerald-400 mt-1">
            {agents.length} Agent Profiles
          </span>
        </div>

        {/* Total Tokens (In / Out) */}
        <div className="p-4 rounded-2xl bg-[#0F2024] border border-[#1A2E33] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#7A9299]">
            <span>Tokens / Units</span>
            <Layers className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-light text-white">
            {(((overview?.totalInputUnits || 0) + (overview?.totalOutputUnits || 0)) / 1000).toFixed(1)}k
          </div>
          <span className="text-[10px] text-[#7A9299] mt-1">
            In: {(overview?.totalInputUnits || 0).toLocaleString()} &bull; Out: {(overview?.totalOutputUnits || 0).toLocaleString()}
          </span>
        </div>

        {/* Provider Cost */}
        <div className="p-4 rounded-2xl bg-[#0F2024] border border-[#1A2E33] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#7A9299]">
            <span>Provider Cost</span>
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-light text-white">
            ${(overview?.totalProviderCost ?? 0).toFixed(4)}
          </div>
          <span className="text-[10px] text-[#7A9299] mt-1">
            Today: ${(overview?.providerCostToday ?? 0).toFixed(4)}
          </span>
        </div>

        {/* Gross Contribution */}
        <div className="p-4 rounded-2xl bg-[#0F2024] border border-[#1A2E33] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#7A9299]">
            <span>Gross Margin</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#71F5DB]" />
          </div>
          <div className="mt-2 text-2xl font-light text-[#71F5DB]">
            +${(overview?.grossContribution ?? 0).toFixed(4)}
          </div>
          <span className="text-[10px] text-[#7A9299] mt-1">
            Rev ${(overview?.totalCustomerCharge ?? 0).toFixed(4)} - Cost
          </span>
        </div>
      </div>

      {/* Middle Row: Agent Breakdown & Live Test Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Cost & Usage Table (Which agent costs the most?) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0F2024] border border-[#1A2E33] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#71F5DB]" />
                <span>Agent-by-Agent Cost &amp; Utilization</span>
              </h3>
              <p className="text-[11px] text-[#7A9299] mt-0.5">
                Answer: &ldquo;Which IZA agent is costing the most?&rdquo; without inspecting conversation content.
              </p>
            </div>
            <span className="text-[10px] text-[#71F5DB] font-mono">
              Avg Latency: {overview?.avgLatencyMs ?? 0}ms
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1A2E33] text-[#7A9299]">
                  <th className="pb-2 font-normal">Agent Identity</th>
                  <th className="pb-2 font-normal text-right">Calls</th>
                  <th className="pb-2 font-normal text-right">Input Units</th>
                  <th className="pb-2 font-normal text-right">Output Units</th>
                  <th className="pb-2 font-normal text-right">Provider Cost</th>
                  <th className="pb-2 font-normal text-right">Customer Charge</th>
                  <th className="pb-2 font-normal text-right">Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#16292E]">
                {agents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-[#7A9299]">
                      No agent calls recorded yet. Execute a test call below.
                    </td>
                  </tr>
                ) : (
                  agents.map((ag) => (
                    <tr key={ag.agent_id} className="hover:bg-[#13282D]/50 transition-colors">
                      <td className="py-2.5 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          ag.agent_id === 'iza_master' ? 'bg-[#71F5DB]' :
                          ag.agent_id === 'iza_doctor' ? 'bg-rose-400' :
                          ag.agent_id === 'iza_bio' ? 'bg-emerald-400' :
                          ag.agent_id === 'iza_ceo' ? 'bg-amber-400' :
                          ag.agent_id === 'iza_live' ? 'bg-cyan-400' : 'bg-purple-400'
                        }`} />
                        <span className="font-mono text-white font-medium">{ag.agent_id}</span>
                      </td>
                      <td className="py-2.5 text-right font-mono text-slate-300">
                        {ag.request_count.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right font-mono text-[#7A9299]">
                        {ag.input_units.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right font-mono text-[#7A9299]">
                        {ag.output_units.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right font-mono text-amber-300">
                        ${ag.provider_cost.toFixed(5)}
                      </td>
                      <td className="py-2.5 text-right font-mono text-emerald-300">
                        ${ag.customer_charge.toFixed(5)}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-[#71F5DB]">
                        +${ag.gross_contribution.toFixed(5)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rate Limits & Simulator */}
        <div className="p-5 rounded-2xl bg-[#0F2024] border border-[#1A2E33] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#71F5DB]" />
                <span>Rate Limits &amp; Tiers</span>
              </h3>
              <span className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                Blocked: {overview?.totalBlocked ?? 0}
              </span>
            </div>
            <p className="text-[11px] text-[#7A9299]">
              Define customer quotas to prevent uncontrolled resource consumption.
            </p>

            {/* Tier Selector */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['free', 'personal', 'pro', 'developer', 'enterprise'].map((t) => (
                <button
                  key={t}
                  onClick={() => handleTierChange(t)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg uppercase tracking-wider transition cursor-pointer font-mono ${
                    activeTier === t 
                      ? 'bg-[#71F5DB] text-[#0D1B1E] font-bold' 
                      : 'bg-[#142A2F] text-[#7A9299] hover:text-white border border-[#1B3036]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="mt-3 p-3 rounded-xl bg-[#0B1517] border border-[#1A2E33] text-xs space-y-1">
              <div className="flex justify-between text-[#7A9299]">
                <span>Active Plan:</span>
                <span className="text-white font-bold uppercase">{activeTier}</span>
              </div>
              <div className="flex justify-between text-[#7A9299]">
                <span>Daily Limit:</span>
                <span className="text-white">
                  {activeTier === 'free' ? '100 req/day' :
                   activeTier === 'personal' ? '1,000 req/day' :
                   activeTier === 'pro' ? '5,000 req/day' :
                   activeTier === 'developer' ? '20,000 req/day' : '100,000 req/day'}
                </span>
              </div>
              <div className="flex justify-between text-[#7A9299]">
                <span>Status:</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Within Limits
                </span>
              </div>
            </div>
          </div>

          {/* Test Agent Request Trigger */}
          <div className="pt-3 border-t border-[#1A2E33]">
            <span className="text-[11px] text-[#7A9299] block mb-2 font-medium">
              Simulate Test Call to Dedicated Agent
            </span>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select
                value={testAgent}
                onChange={(e) => setTestAgent(e.target.value as any)}
                className="bg-[#142A2F] border border-[#1B3036] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#71F5DB]"
              >
                <option value="iza_master">iza_master</option>
                <option value="iza_doctor">iza_doctor</option>
                <option value="iza_bio">iza_bio</option>
                <option value="iza_ceo">iza_ceo</option>
                <option value="iza_research">iza_research</option>
              </select>

              <button
                onClick={handleExecuteTest}
                disabled={testExecuting}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#71F5DB] hover:bg-[#5ae0c7] text-[#0D1B1E] font-bold text-xs uppercase tracking-wider transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{testExecuting ? 'Sending...' : 'Test Event'}</span>
              </button>
            </div>

            {testNotice && (
              <div className="p-2 rounded-lg bg-[#142A2F] border border-[#1A2E33] text-[10px] text-cyan-300 font-mono truncate">
                {testNotice}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Real-Time Safe Telemetry Stream */}
      <div className="p-5 rounded-2xl bg-[#0F2024] border border-[#1A2E33] flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#71F5DB]" />
              <span>Real-Time API Usage Event Stream</span>
            </h3>
            <p className="text-[11px] text-[#7A9299] mt-0.5">
              Zero message content stored &bull; Cryptographic key ID: <code className="text-[#71F5DB]">{data?.safeKeyId}</code>
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> {overview?.totalSuccess ?? 0} OK
            </span>
            <span className="flex items-center gap-1 text-rose-400 ml-2">
              <XCircle className="w-3.5 h-3.5" /> {overview?.totalError ?? 0} Fault
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1A2E33] text-[#7A9299]">
                <th className="pb-2 font-normal">Request ID</th>
                <th className="pb-2 font-normal">Timestamp</th>
                <th className="pb-2 font-normal">Agent</th>
                <th className="pb-2 font-normal">Service / Model</th>
                <th className="pb-2 font-normal">Action</th>
                <th className="pb-2 font-normal text-right">Units (In/Out)</th>
                <th className="pb-2 font-normal text-right">Latency</th>
                <th className="pb-2 font-normal text-right">Provider Cost</th>
                <th className="pb-2 font-normal text-right">Charge</th>
                <th className="pb-2 font-normal text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#16292E]">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-[#7A9299]">
                    No usage events logged yet.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.request_id} className="hover:bg-[#13282D]/40 transition-colors">
                    <td className="py-2 text-[#7A9299] font-mono text-[11px] truncate max-w-[120px]">
                      {ev.request_id.slice(0, 16)}...
                    </td>
                    <td className="py-2 text-[#7A9299] text-[11px]">
                      {new Date(ev.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-2 text-white font-medium">
                      {ev.agent_id}
                    </td>
                    <td className="py-2 text-slate-300 text-[11px]">
                      {ev.service}
                    </td>
                    <td className="py-2 text-[#7A9299]">
                      {ev.action}
                    </td>
                    <td className="py-2 text-right font-mono text-slate-300">
                      {ev.input_units}/{ev.output_units}
                    </td>
                    <td className="py-2 text-right font-mono text-cyan-400">
                      {ev.latency_ms}ms
                    </td>
                    <td className="py-2 text-right font-mono text-amber-300">
                      ${ev.provider_cost.toFixed(5)}
                    </td>
                    <td className="py-2 text-right font-mono text-emerald-300">
                      ${ev.customer_charge.toFixed(5)}
                    </td>
                    <td className="py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ev.status === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                        ev.status === 'blocked' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                        'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      }`}>
                        {ev.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
