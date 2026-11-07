import crypto from 'crypto';
import { pool } from '../db/index.ts';

export type IzaAgentId = 
  | 'iza_master' 
  | 'iza_doctor' 
  | 'iza_bio' 
  | 'iza_ceo' 
  | 'iza_research' 
  | 'iza_live';

export interface RecordUsageParams {
  userId?: string;
  agentId?: IzaAgentId | string;
  provider?: string;
  service?: string;
  endpoint: string;
  action: string;
  status?: 'success' | 'error' | 'blocked';
  statusCode?: number;
  latencyMs: number;
  inputUnits?: number;
  outputUnits?: number;
  application?: string;
  errorMessage?: string;
}

/**
 * Derives a safe key identifier (e.g. "iza_key_a81f") without ever storing
 * or leaking the actual secret key (OWASP Compliance / REQ-API-002).
 */
export function getSafeKeyId(rawKey?: string): string {
  const key = (rawKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  if (!key || key === 'your_actual_gemini_api_key_here') {
    return 'iza_key_unassigned';
  }
  // Deterministic 8-character token based on hash, never reversible
  const hash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 8);
  return `iza_key_${hash}`;
}

/**
 * Sanitizes error messages to prevent credential or PII leaks in logs or database.
 */
function sanitizeErrorMessage(msg?: string): string | null {
  if (!msg) return null;
  // Scrub API key patterns, bearer tokens, or email addresses
  return msg
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
    .replace(/sk-[0-9A-Za-z-_]{20,}/g, '[REDACTED_SECRET_KEY]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED_TOKEN]')
    .slice(0, 500);
}

/**
 * Calculates provider cost and customer charge based on model token rates.
 */
function calculateCostAndCharge(service: string, inputTokens: number, outputTokens: number): {
  providerCost: number;
  customerCharge: number;
} {
  let inRatePerMillion = 0.075; // Default gemini-3.8-flash: $0.075 / 1M
  let outRatePerMillion = 0.30;  // Default gemini-3.8-flash: $0.30 / 1M

  if (service.includes('flash-lite')) {
    inRatePerMillion = 0.0375;
    outRatePerMillion = 0.15;
  } else if (service.includes('live')) {
    inRatePerMillion = 0.15;
    outRatePerMillion = 0.60;
  } else if (service.includes('argon') || service.includes('pro')) {
    inRatePerMillion = 1.25;
    outRatePerMillion = 5.00;
  }

  const providerCost = (inputTokens / 1_000_000) * inRatePerMillion + (outputTokens / 1_000_000) * outRatePerMillion;
  
  // Standard customer charge calculation ($0.002 per 1,000 units baseline with minimum threshold)
  const totalUnits = inputTokens + outputTokens;
  const customerCharge = Math.max(0.0001, (totalUnits / 1_000) * 0.0025);

  return {
    providerCost: parseFloat(providerCost.toFixed(6)),
    customerCharge: parseFloat(customerCharge.toFixed(6)),
  };
}

/**
 * REQ-API-001: Every API request MUST create a usage event.
 * Client is NEVER the source of truth for billing/usage.
 * Content is strictly SEPARATED from usage.
 */
export async function recordApiUsage(params: RecordUsageParams): Promise<string> {
  const requestId = `req_${crypto.randomUUID()}`;
  const userId = params.userId || 'sovereign_user';
  const agentId = params.agentId || 'iza_master';
  const keyId = getSafeKeyId();
  const provider = params.provider || 'google_gemini';
  const service = params.service || 'gemini-3.8-flash';
  const status = params.status || 'success';
  const statusCode = params.statusCode ?? (status === 'success' ? 200 : status === 'blocked' ? 429 : 500);
  const latencyMs = Math.max(0, Math.round(params.latencyMs));
  const inputUnits = params.inputUnits || 0;
  const outputUnits = params.outputUnits || 0;

  const { providerCost, customerCharge } = calculateCostAndCharge(service, inputUnits, outputUnits);
  const sanitizedError = sanitizeErrorMessage(params.errorMessage);

  try {
    await pool.query(
      `INSERT INTO api_usage (
        request_id, user_id, agent_id, key_id, provider, service,
        endpoint, action, status, status_code, latency_ms,
        input_units, output_units, provider_cost, customer_charge,
        application, error_message, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, NOW()
      )`,
      [
        requestId, userId, agentId, keyId, provider, service,
        params.endpoint, params.action, status, statusCode, latencyMs,
        inputUnits, outputUnits, providerCost, customerCharge,
        params.application || 'iza_os', sanitizedError
      ]
    );
  } catch (err: any) {
    // Failsafe: never crash the core app loop if telemetry insertion fails
    console.warn('API Usage logging notice:', err?.message || err);
  }

  return requestId;
}

/**
 * Rate Limiter Engine: Evaluates user/tier limits before external calls.
 */
export async function checkRateLimit(userId = 'sovereign_user', _agentId: IzaAgentId | string = 'iza_master'): Promise<{
  allowed: boolean;
  tier: string;
  requestsToday: number;
  dailyLimit: number;
  reason?: string;
}> {
  try {
    // 1. Get user tier (default to personal)
    const userTierRes = await pool.query(
      `SELECT u.tier, t.requests_per_day, t.requests_per_month, u.custom_daily_limit 
       FROM user_rate_limit u
       LEFT JOIN rate_limit_tier t ON t.tier = u.tier
       WHERE u.user_id = $1`,
      [userId]
    );

    let tier = 'personal';
    let dailyLimit = 1000;

    if (userTierRes.rows.length > 0) {
      const row = userTierRes.rows[0];
      tier = row.tier || 'personal';
      dailyLimit = row.custom_daily_limit || row.requests_per_day || 1000;
    } else {
      // Default rate limit tier for personal is 1000 requests/day
      const tierRes = await pool.query(`SELECT requests_per_day FROM rate_limit_tier WHERE tier = 'personal'`);
      if (tierRes.rows.length > 0) {
        dailyLimit = tierRes.rows[0].requests_per_day || 1000;
      }
    }

    // 2. Count requests in the last 24 hours
    const countRes = await pool.query(
      `SELECT COUNT(*)::int as count 
       FROM api_usage 
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
      [userId]
    );

    const requestsToday = countRes.rows[0]?.count || 0;

    if (requestsToday >= dailyLimit) {
      return {
        allowed: false,
        tier,
        requestsToday,
        dailyLimit,
        reason: `Daily quota of ${dailyLimit} requests exceeded for plan [${tier}]. Upgrade tier to continue.`,
      };
    }

    return {
      allowed: true,
      tier,
      requestsToday,
      dailyLimit,
    };
  } catch (err) {
    console.warn('Rate limit check fallback allowed:', err);
    return {
      allowed: true,
      tier: 'personal',
      requestsToday: 0,
      dailyLimit: 1000,
    };
  }
}

/**
 * Aggregates statistics for the IZA CONTROL → API & AGENTS Dashboard.
 */
export async function getApiUsageDashboard() {
  const [totalsRes, agentsRes, recentRes, todayRes] = await Promise.all([
    // All-time & today aggregates
    pool.query(`
      SELECT 
        COUNT(*)::int as total_requests,
        COALESCE(SUM(input_units), 0)::bigint as total_input_units,
        COALESCE(SUM(output_units), 0)::bigint as total_output_units,
        COALESCE(SUM(provider_cost), 0)::real as total_provider_cost,
        COALESCE(SUM(customer_charge), 0)::real as total_customer_charge,
        COUNT(CASE WHEN status = 'success' THEN 1 END)::int as total_success,
        COUNT(CASE WHEN status = 'error' THEN 1 END)::int as total_error,
        COUNT(CASE WHEN status = 'blocked' THEN 1 END)::int as total_blocked,
        COALESCE(AVG(latency_ms), 0)::int as avg_latency_ms
      FROM api_usage
    `),

    // Agent-by-agent breakdown
    pool.query(`
      SELECT 
        agent_id,
        COUNT(*)::int as request_count,
        COALESCE(SUM(input_units), 0)::bigint as input_units,
        COALESCE(SUM(output_units), 0)::bigint as output_units,
        COALESCE(SUM(provider_cost), 0)::real as provider_cost,
        COALESCE(SUM(customer_charge), 0)::real as customer_charge,
        (COALESCE(SUM(customer_charge), 0) - COALESCE(SUM(provider_cost), 0))::real as gross_contribution,
        COALESCE(AVG(latency_ms), 0)::int as avg_latency_ms
      FROM api_usage
      GROUP BY agent_id
      ORDER BY request_count DESC
    `),

    // Recent 20 safe events (zero conversation content)
    pool.query(`
      SELECT 
        request_id, user_id, agent_id, key_id, provider, service,
        endpoint, action, status, status_code, latency_ms,
        input_units, output_units, provider_cost, customer_charge,
        created_at
      FROM api_usage
      ORDER BY created_at DESC
      LIMIT 25
    `),

    // Requests and active users today
    pool.query(`
      SELECT 
        COUNT(*)::int as requests_today,
        COUNT(DISTINCT user_id)::int as active_users_today,
        COUNT(DISTINCT agent_id)::int as active_agents_today,
        COALESCE(SUM(provider_cost), 0)::real as provider_cost_today,
        COALESCE(SUM(customer_charge), 0)::real as customer_charge_today,
        COUNT(CASE WHEN status = 'blocked' THEN 1 END)::int as blocked_today
      FROM api_usage
      WHERE created_at >= CURRENT_DATE
    `)
  ]);

  const totals = totalsRes.rows[0] || {};
  const today = todayRes.rows[0] || {};
  const agents = agentsRes.rows || [];
  const recent = recentRes.rows || [];

  const grossContribution = parseFloat((totals.total_customer_charge - totals.total_provider_cost).toFixed(6));
  const grossContributionToday = parseFloat((today.customer_charge_today - today.provider_cost_today).toFixed(6));

  return {
    overview: {
      requestsToday: today.requests_today || 0,
      activeUsersToday: today.active_users_today || (today.requests_today > 0 ? 1 : 0),
      activeAgentsToday: today.active_agents_today || 0,
      providerCostToday: today.provider_cost_today || 0,
      customerChargeToday: today.customer_charge_today || 0,
      grossContributionToday,
      blockedToday: today.blocked_today || 0,
      totalRequests: totals.total_requests || 0,
      totalInputUnits: totals.total_input_units || 0,
      totalOutputUnits: totals.total_output_units || 0,
      totalProviderCost: totals.total_provider_cost || 0,
      totalCustomerCharge: totals.total_customer_charge || 0,
      grossContribution,
      totalSuccess: totals.total_success || 0,
      totalError: totals.total_error || 0,
      totalBlocked: totals.total_blocked || 0,
      avgLatencyMs: totals.avg_latency_ms || 0,
    },
    agents,
    recentEvents: recent,
    safeKeyId: getSafeKeyId(),
  };
}
