import { SafeBenueLayout } from "@/components/safebenue/SafeBenueLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SafeBenueDashboard() {
  return (
    <SafeBenueLayout
      title="SafeBenue Dashboard"
      description="Operational overview of community incidents, active alerts and response status."
    >
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            This dashboard will surface live incident volume, alert escalation status and responder
            activity for SafeBenue communities.
          </p>
        </CardContent>
      </Card>
    </SafeBenueLayout>
  );
}
