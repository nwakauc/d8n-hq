import { useState } from "react";
import { AnalyticsToolbar } from "../analytics/AnalyticsToolbar.tsx";
import type { HqAnalyticsRange } from "../analytics/analyticsTypes.ts";
import { operatorHasCapability } from "../../../lib/hq/capabilities.ts";
import { canReadSecurityAlerts } from "../../../lib/hq/enforcementAccess.ts";
import { FounderOverview } from "../founder/FounderOverview.tsx";
import { useCommandCentreData } from "../hooks/useCommandCentreData.ts";
import { useHqMode } from "../useHqMode.ts";
import { useHqOperator } from "../useHqOperator.ts";
import { CommandCentreOpsDashboard } from "./CommandCentreOpsDashboard.tsx";

export default function CommandCentrePage() {
  const { operator } = useHqOperator();
  const { mode } = useHqMode();
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [timeRange, setTimeRange] = useState<HqAnalyticsRange>("last_30d");
  const canAnalytics = operatorHasCapability(operator, "hq.analytics.read");
  const canAlerts = canReadSecurityAlerts(operator);

  const { load, data, partialErrors } = useCommandCentreData({
    canAnalytics,
    canAlerts,
    refreshNonce,
    timeRange,
  });

  if (!operator) {
    return null;
  }

  const onRefresh = () => setRefreshNonce((value) => value + 1);

  if (mode === "founder") {
    return (
      <FounderOverview
        key={refreshNonce}
        load={load}
        data={data}
        partialErrors={partialErrors}
        canAnalytics={canAnalytics}
        onRefresh={onRefresh}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />
    );
  }

  return (
    <>
      <AnalyticsToolbar range={timeRange} onRangeChange={setTimeRange} />
      <CommandCentreOpsDashboard
        key={refreshNonce}
        load={load}
        data={data}
        partialErrors={partialErrors}
        canAnalytics={canAnalytics}
        canAlerts={canAlerts}
        onRefresh={onRefresh}
      />
    </>
  );
}
