import { Navigate, Route } from "react-router-dom";
import { APP_PATHS } from "@/features/navigation/navigationConfig";
const redirects: Array<[string, string]> = [
  ["/dashboard", APP_PATHS.safety],
  ["/incident-report", APP_PATHS.incidentReport],
  ["/resources", APP_PATHS.emergencyResources],
  ["/emergency-contacts", APP_PATHS.emergencyContacts],
  ["/notifications", APP_PATHS.notifications],
  ["/profile", APP_PATHS.profile],
  ["/deployments", APP_PATHS.sites],
  ["/pricing", APP_PATHS.billing],
  ["/control", APP_PATHS.operations],
  ["/cameras", APP_PATHS.cameras],
  ["/sensors", APP_PATHS.sensors],
  ["/household-sensors", APP_PATHS.householdSensors],
  ["/detection", APP_PATHS.detection],
  ["/faces", APP_PATHS.faces],
  ["/community-dashboard", APP_PATHS.community],
  ["/community-alerts", APP_PATHS.communityAlerts],
  ["/osiris", APP_PATHS.intelligence],
  ["/safebenue", APP_PATHS.safeBenue],
  ["/safebenue/dashboard", APP_PATHS.safeBenueDashboard],
  ["/safebenue/reports", APP_PATHS.safeBenueReports],
  ["/safebenue/resources", APP_PATHS.safeBenueResources],
  ["/safebenue/community-watch", APP_PATHS.safeBenueWatch],
  ["/safebenue/family", APP_PATHS.safeBenueFamily],
  ["/safebenue/admin", APP_PATHS.safeBenueAdmin],
  ["/billing/callback", APP_PATHS.billingCallback],
  ["/platform-admin", APP_PATHS.platform],
  ["/admin/webhooks", APP_PATHS.webhooks],
];
export function LegacyRedirects() {
  return (
    <>
      {redirects.map(([from, to]) => (
        <Route key={from} path={from} element={<Navigate to={to} replace />} />
      ))}
    </>
  );
}
