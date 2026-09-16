import { useCallback, useEffect, useState } from "react";
import {
  fetchCommandCentreBrands,
  fetchCommandCentreHealth,
  fetchD8nVersion,
  fetchHqSecurityAlerts,
  hqErrorMessage,
} from "../../../lib/hq/api.ts";
import type {
  HqCommandCentreBrandsResponse,
  HqCommandCentreHealth,
  HqSecurityAlertList,
  HqVersionInfo,
} from "../../../lib/hq/types.ts";

export type CommandCentreLoadState = "loading" | "ready";

export type CommandCentreData = {
  health: HqCommandCentreHealth | null;
  brands: HqCommandCentreBrandsResponse | null;
  alerts: HqSecurityAlertList | null;
  version: HqVersionInfo | null;
  healthError: string | null;
  brandsError: string | null;
  alertsError: string | null;
  versionError: string | null;
};

const EMPTY_DATA: CommandCentreData = {
  health: null,
  brands: null,
  alerts: null,
  version: null,
  healthError: null,
  brandsError: null,
  alertsError: null,
  versionError: null,
};

export function useCommandCentreData({
  canAnalytics,
  canAlerts,
  refreshNonce = 0,
}: {
  canAnalytics: boolean;
  canAlerts: boolean;
  refreshNonce?: number;
}) {
  const [load, setLoad] = useState<CommandCentreLoadState>("loading");
  const [data, setData] = useState<CommandCentreData>(EMPTY_DATA);

  const refresh = useCallback(() => {
    setLoad("loading");
    setData(EMPTY_DATA);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const next: CommandCentreData = { ...EMPTY_DATA };
    const tasks: Promise<void>[] = [];

    if (canAnalytics) {
      tasks.push(
        fetchCommandCentreHealth()
          .then((health) => {
            next.health = health;
          })
          .catch((error) => {
            next.healthError = hqErrorMessage(error);
          }),
      );
      tasks.push(
        fetchCommandCentreBrands()
          .then((brands) => {
            next.brands = brands;
          })
          .catch((error) => {
            next.brandsError = hqErrorMessage(error);
          }),
      );
    }
    if (canAlerts) {
      tasks.push(
        fetchHqSecurityAlerts({ limit: 8 })
          .then((alerts) => {
            next.alerts = alerts;
          })
          .catch((error) => {
            next.alertsError = hqErrorMessage(error);
          }),
      );
    }
    tasks.push(
      fetchD8nVersion()
        .then((version) => {
          next.version = version;
        })
        .catch((error) => {
          next.versionError = hqErrorMessage(error);
        }),
    );

    void Promise.all(tasks).then(() => {
      if (cancelled) return;
      setData(next);
      setLoad("ready");
    });

    return () => {
      cancelled = true;
    };
  }, [canAlerts, canAnalytics, refreshNonce]);

  const partialErrors = [
    data.healthError,
    data.brandsError,
    data.alertsError,
    data.versionError,
  ].filter((message): message is string => Boolean(message));

  return {
    load,
    data,
    partialErrors,
    refresh,
  };
}
