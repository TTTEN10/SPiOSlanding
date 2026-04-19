import { addMonitoringBreadcrumb, captureMonitoringEvent } from './sentry';

/**
 * Product funnel signals (Sentry breadcrumbs + `activation_*` messages when DSN is set).
 *
 * **KPI model (interpret in Sentry by release / environment):**
 * - **Funnel:** `on_app_open` → `on_first_message` (= message_1_sent) → `on_message_3` (critical retention) →
 *   `on_wallet_prompt_shown` → `on_wallet_prompt_cta` / `on_wallet_prompt_limit` → `on_wallet_success` | `on_wallet_fail`
 * - **Share:** `on_shareable_insight_copy`
 * - **Not yet in-app (needs analytics backend or sessions):** avg user message length, assistant reply latency,
 *   session duration, return within 24h / 7d — correlate Sentry timestamps with your product analytics if added later.
 */
export function trackActivation(name: string, extra?: Record<string, string>): void {
  addMonitoringBreadcrumb('activation', name, extra as Record<string, unknown> | undefined);
  captureMonitoringEvent(`activation_${name}`, { area: 'activation', ...extra }, 'info');
}
