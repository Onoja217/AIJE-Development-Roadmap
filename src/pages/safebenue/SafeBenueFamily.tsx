import { SafeBenueLayout } from "@/components/safebenue/SafeBenueLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SafeBenueFamily() {
  return (
    <SafeBenueLayout
      title="Family Safety"
      description="Family check-ins, emergency contacts and missing-person coordination."
    >
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            Household safety profiles, check-in status and reunification tools will live here.
          </p>
        </CardContent>
      </Card>
    </SafeBenueLayout>
  );
}
