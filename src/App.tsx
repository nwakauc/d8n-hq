import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import SignInPage from "./features/auth/SignInPage.tsx";
import { HqProtectedRoute } from "./features/hq/HqProtectedRoute.tsx";
import HqShell from "./features/hq/HqShell.tsx";
import CommandCentrePage from "./features/hq/pages/CommandCentrePage.tsx";
import AlertsPage from "./features/hq/pages/AlertsPage.tsx";
import LiveEventsPage from "./features/hq/pages/LiveEventsPage.tsx";
import Member360Page from "./features/hq/pages/Member360Page.tsx";
import MemberSearchPage from "./features/hq/pages/MemberSearchPage.tsx";
import ProfilePhotoModerationPage from "./features/hq/pages/ProfilePhotoModerationPage.tsx";
import RealmeModerationPage from "./features/hq/pages/RealmeModerationPage.tsx";
import ReportDetailPage from "./features/hq/pages/ReportDetailPage.tsx";
import TrustSafetyPage from "./features/hq/pages/TrustSafetyPage.tsx";
import UnavailableHqPage from "./features/hq/pages/UnavailableHqPage.tsx";
import OperatorSecurityPage from "./features/hq/pages/OperatorSecurityPage.tsx";
import DatabaseBackupsPage from "./features/hq/pages/DatabaseBackupsPage.tsx";
import NotificationDeliveriesPage from "./features/hq/pages/NotificationDeliveriesPage.tsx";

function HqPlannedPage() {
  const location = useLocation();
  return <UnavailableHqPage path={location.pathname} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/hq" replace />} />
      <Route path="/sign-in" element={<SignInPage />} />

      <Route
        path="/hq"
        element={
          <HqProtectedRoute>
            <HqShell />
          </HqProtectedRoute>
        }
      >
        <Route index element={<CommandCentrePage />} />
        <Route path="members" element={<MemberSearchPage />} />
        <Route path="members/:lookup" element={<Member360Page />} />
        <Route path="live" element={<LiveEventsPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="incidents" element={<UnavailableHqPage path="/hq/incidents" />} />
        <Route path="growth" element={<UnavailableHqPage path="/hq/growth" />} />
        <Route path="product" element={<UnavailableHqPage path="/hq/product" />} />
        <Route path="marketplace" element={<UnavailableHqPage path="/hq/marketplace" />} />
        <Route path="revenue" element={<UnavailableHqPage path="/hq/revenue" />} />
        <Route path="acquisition" element={<UnavailableHqPage path="/hq/acquisition" />} />
        <Route path="customers" element={<UnavailableHqPage path="/hq/customers" />} />
        <Route path="trust-safety" element={<TrustSafetyPage />} />
        <Route path="trust-safety/reports/:reportId" element={<ReportDetailPage />} />
        <Route path="moderation/photos" element={<ProfilePhotoModerationPage />} />
        <Route path="moderation/realme" element={<RealmeModerationPage />} />
        <Route path="reliability" element={<UnavailableHqPage path="/hq/reliability" />} />
        <Route path="apm" element={<UnavailableHqPage path="/hq/apm" />} />
        <Route path="errors" element={<UnavailableHqPage path="/hq/errors" />} />
        <Route path="traces" element={<UnavailableHqPage path="/hq/traces" />} />
        <Route path="logs" element={<UnavailableHqPage path="/hq/logs" />} />
        <Route path="jobs" element={<UnavailableHqPage path="/hq/jobs" />} />
        <Route path="database" element={<DatabaseBackupsPage />} />
        <Route path="notifications" element={<NotificationDeliveriesPage />} />
        <Route path="infrastructure" element={<UnavailableHqPage path="/hq/infrastructure" />} />
        <Route path="deployments" element={<UnavailableHqPage path="/hq/deployments" />} />
        <Route path="data-health" element={<UnavailableHqPage path="/hq/data-health" />} />
        <Route path="security" element={<OperatorSecurityPage />} />
        <Route path="brands" element={<UnavailableHqPage path="/hq/brands" />} />
        <Route path="admin" element={<UnavailableHqPage path="/hq/admin" />} />
        <Route path="audit" element={<UnavailableHqPage path="/hq/audit" />} />
        <Route path="intelligence" element={<UnavailableHqPage path="/hq/intelligence" />} />
        <Route path="briefings" element={<UnavailableHqPage path="/hq/briefings" />} />
        <Route path="*" element={<HqPlannedPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/hq" replace />} />
    </Routes>
  );
}
