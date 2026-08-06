import { SafeBenueLayout } from "@/components/safebenue/SafeBenueLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SafeBenueCommunityWatch() {
  return (
    <SafeBenueLayout
      title="Community Watch"
      description="Neighbourhood watch groups, patrol coordination and shared local intelligence."
    >
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            Watch-group rosters, patrol schedules and community alert broadcasting will live here.
          </p>
        </CardContent>
      </Card>
    </SafeBenueLayout>
  );
}
