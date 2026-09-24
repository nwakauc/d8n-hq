import { useCallback, useEffect, useState } from "react";
import {
  fetchCommandCentreBrands,
  fetchCommandCentreHealth,
  fetchCommandCentreRegistrationTrends,
  fetchD8nVersion,
  fetchHqAnalyticsOverview,
  fetchHqDatabaseBackups,
  fetchHqDevices,
  fetchHqNotificationHealth,
  fetchHqSystemHealth,
  fetchHqProductFunnel,
  fetchHqProductTrends,
  fetchHqSecurityAlerts,
  hqErrorMessage,
} from "../../../lib/hq/api.ts";
import type {
  HqCommandCentreBrandsResponse,
  HqCommandCentreHealth,
  HqAnalyticsOverview,
  HqDatabaseBackupsResponse,
  HqDevicesResponse,
  HqNotificationHealthResponse,
  HqRegistrationTrendResponse,
  HqProductFunnel,
  HqProductTrends,
  HqSecurityAlertList,
  HqVersionInfo,
  HqSystemHealthResponse,
} from "../../../lib/hq/types.ts";
import { operationalWindow } from "../commandCentreWindows.ts";

export type CommandCentreLoadState = "loading" | "ready";

export type CommandCentreData = {
  health: HqCommandCentreHealth | null;
  brands: HqCommandCentreBrandsResponse | null;
  alerts: HqSecurityAlertList | null;
  version: HqVersionInfo | null;
  registrations: HqRegistrationTrendResponse | null;
  funnel: HqProductFunnel | null;
  analytics: HqAnalyticsOverview | null;
  productTrends: HqProductTrends | null;
  backups: HqDatabaseBackupsResponse | null;
  devices: HqDevicesResponse | null;
  notificationHealth: HqNotificationHealthResponse | null;
  systemHealth: HqSystemHealthResponse | null;
  healthError: string | null;
  brandsError: string | null;
  alertsError: string | null;
  versionError: string | null;
  registrationsError: string | null;
  funnelError: string | null;
  analyticsError: string | null;
  productTrendsError: string | null;
  backupsError: string | null;
  devicesError: string | null;
  notificationHealthError: string | null;
  systemHealthError: string | null;
};

const EMPTY_DATA: CommandCentreData = {
  health: null,
  brands: null,
  alerts: null,
  version: null,
  registrations: null,
  funnel: null,
  analytics: null,
  productTrends: null,
  backups: null,
  devices: null,
  notificationHealth: null,
  systemHealth: null,
  healthError: null,
  brandsError: null,
  alertsError: null,
  versionError: null,
  registrationsError: null,
  funnelError: null,
  analyticsError: null,
  productTrendsError: null,
  backupsError: null,
  devicesError: null,
  notificationHealthError: null,
  systemHealthError: null,
};

export function useCommandCentreData({
  canAnalytics,
  canAlerts,
  canSystem,
  timeRange = "last_30d",
  refreshNonce = 0,
}: {
  canAnalytics: boolean;
  canAlerts: boolean;
  canSystem: boolean;
  timeRange?: string;
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
    const window = operationalWindow(timeRange);

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
      tasks.push(
        fetchCommandCentreRegistrationTrends(timeRange)
          .then((registrations) => {
            next.registrations = registrations;
          })
          .catch((error) => {
            next.registrationsError = hqErrorMessage(error);
          }),
      );
      tasks.push(
        fetchHqProductFunnel(timeRange)
          .then((funnel) => {
            next.funnel = funnel;
          })
          .catch((error) => {
            next.funnelError = hqErrorMessage(error);
          }),
      );
      tasks.push(
        fetchHqAnalyticsOverview()
          .then((analytics) => {
            next.analytics = analytics;
          })
          .catch((error) => {
            next.analyticsError = hqErrorMessage(error);
          }),
      );
      tasks.push(
        fetchHqProductTrends(timeRange)
          .then((productTrends) => {
            next.productTrends = productTrends;
          })
          .catch((error) => {
            next.productTrendsError = hqErrorMessage(error);
          }),
      );
      if (window) {
        tasks.push(
          fetchHqDevices(window)
            .then((devices) => {
              next.devices = devices;
            })
            .catch((error) => {
              next.devicesError = hqErrorMessage(error);
            }),
        );
        tasks.push(
          fetchHqNotificationHealth(window)
            .then((notificationHealth) => {
              next.notificationHealth = notificationHealth;
            })
            .catch((error) => {
              next.notificationHealthError = hqErrorMessage(error);
            }),
        );
      }
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
    if (canSystem) {
      tasks.push(
        fetchHqDatabaseBackups()
          .then((backups) => {
            next.backups = backups;
          })
          .catch((error) => {
            next.backupsError = hqErrorMessage(error);
          }),
      );
      tasks.push(
        fetchHqSystemHealth()
          .then((systemHealth) => {
            next.systemHealth = systemHealth;
          })
          .catch((error) => {
            next.systemHealthError = hqErrorMessage(error);
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
  }, [canAlerts, canAnalytics, canSystem, refreshNonce, timeRange]);

  const partialErrors = [
    data.healthError,
    data.brandsError,
    data.alertsError,
    data.versionError,
    data.registrationsError,
    data.funnelError,
    data.analyticsError,
    data.productTrendsError,
    data.backupsError,
    data.devicesError,
    data.notificationHealthError,
    data.systemHealthError,
  ].filter((message): message is string => Boolean(message));

  return {
    load,
    data,
    partialErrors,
    refresh,
    operationalWindow: operationalWindow(timeRange),
  };
}
