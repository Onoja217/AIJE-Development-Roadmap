import { SafeBenueLayout } from "@/components/safebenue/SafeBenueLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SafeBenueResources() {
  return (
    <SafeBenueLayout
      title="SafeBenue Resources"
      description="Hospitals, police stations, shelters, fire services and relief centres available to SafeBenue communities."
    >
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            Resource directory and availability tracking for SafeBenue will live here.
          </p>
        </CardContent>
      </Card>
    </SafeBenueLayout>
  );
}
