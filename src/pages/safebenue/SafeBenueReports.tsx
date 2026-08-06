import { SafeBenueLayout } from "@/components/safebenue/SafeBenueLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SafeBenueReports() {
  return (
    <SafeBenueLayout
      title="SafeBenue Reports"
      description="Citizen and watch-group incident reports, captured offline and synchronised when connectivity returns."
    >
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            Report intake, triage and verification workflows for SafeBenue will live here.
          </p>
        </CardContent>
      </Card>
    </SafeBenueLayout>
  );
}
