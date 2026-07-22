import { Header } from "@/components/dashboard/Header";
import { EmergencyReportForm } from "@/components/EmergencyReportForm";
import type { EmergencyReport } from "@/types/report";

export default function CitizenIncidentReporting() {
  async function handleSubmitReport(report: EmergencyReport) {
    console.log("Emergency Report:", report);
    await Promise.resolve();
  }

  return (
    <>
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Citizen Incident Reporting
          </h1>

          <p className="mt-2 max-w-3xl text-muted-foreground">
            Report attacks, kidnappings, fires, flooding, medical emergencies,
            accidents, and other incidents within your community.
          </p>
        </div>

        <EmergencyReportForm onSubmitReport={handleSubmitReport} />
      </main>
    </>
  );
}
