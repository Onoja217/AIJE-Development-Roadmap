import { Header } from "@/components/dashboard/Header";
import { EmergencyReportForm } from "@/components/EmergencyReportForm";
import type { EmergencyReport } from "@/types/report";

export default function CitizenIncidentReporting() {
  async function handleSubmitReport(report: EmergencyReport) {
    // Temporary integration.
    // Samuel's Offline Sync module will replace this later.
    console.log("Emergency Report:", report);

    // Simulate a successful save so Christopher's success screen appears.
    await Promise.resolve();
  }

  return (
    <>
      <Header />

      <main className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Citizen Incident Reporting
          </h1>

          <p className="text-muted-foreground mt-2 max-w-2xl">
            Report security incidents, attacks, fires, accidents,
            kidnappings, flooding and other emergencies. Reports can
            later be synchronized automatically when offline support
            is connected.
          </p>
        </div>

        <EmergencyReportForm
          onSubmitReport={handleSubmitReport}
        />
      </main>
    </>
  );
}