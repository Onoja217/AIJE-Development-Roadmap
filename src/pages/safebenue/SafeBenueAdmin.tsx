import { SafeBenueLayout } from "@/components/safebenue/SafeBenueLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SafeBenueAdmin() {
  return (
    <SafeBenueLayout
      title="SafeBenue Administration"
      description="Administrative controls for SafeBenue communities, verification and configuration."
    >
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            Community onboarding, moderator management and SafeBenue settings will live here. Access
            is restricted to administrators using the existing AIJE role checks.
          </p>
        </CardContent>
      </Card>
    </SafeBenueLayout>
  );
}
