import { Link } from "react-router-dom";
import { Bell, CloudOff, HeartHandshake, Siren } from "lucide-react";
import { SafeBenueLayout } from "@/components/safebenue/SafeBenueLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const pillars = [
  {
    icon: Bell,
    title: "Community-driven early warning",
    description:
      "Residents, watch groups and responders surface threats early so communities can act before an incident escalates.",
  },
  {
    icon: Siren,
    title: "Emergency response",
    description:
      "Coordinated dispatch, live status tracking and direct routing to the nearest available emergency resource.",
  },
  {
    icon: CloudOff,
    title: "Offline-first architecture",
    description:
      "Reports, alerts and resource data are captured locally on-device and synchronised automatically when connectivity returns.",
  },
  {
    icon: HeartHandshake,
    title: "Community resilience",
    description:
      "Shared intelligence, family safety tools and local resource mapping build lasting preparedness across every ward.",
  },
];

export default function SafeBenueLanding() {
  return (
    <SafeBenueLayout
      title="SafeBenue"
      description="A community safety solution in the AIJE ecosystem: early warning, emergency response and resilience built for low-connectivity environments."
    >
      <section className="grid gap-4 sm:grid-cols-2" aria-label="SafeBenue capabilities">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <Card key={pillar.title} className="border-border bg-card">
              <CardHeader className="space-y-3">
                <div className="w-fit rounded-xl bg-primary/10 p-3 text-primary">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <CardTitle className="text-lg">{pillar.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{pillar.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="flex flex-wrap gap-3" aria-label="SafeBenue quick links">
        <Button asChild>
          <Link to="/safebenue/dashboard">Open SafeBenue dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/safebenue/reports">Submit a report</Link>
        </Button>
      </section>
    </SafeBenueLayout>
  );
}
