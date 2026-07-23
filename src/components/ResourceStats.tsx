// components/ResourceStats.tsx

import type { EmergencyResource } from "../types/resource";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  resources: EmergencyResource[];
}

export function ResourceStats({ resources }: Props) {
  const total = resources.length;

  const active = resources.filter(
    (r) => r.status === "active"
  ).length;

  const verified = resources.filter(
    (r) => r.verificationStatus === "verified"
  ).length;

  const full = resources.filter(
    (r) => r.status === "full"
  ).length;

  const stats = [
    {
      title: "Total Resources",
      value: total,
    },
    {
      title: "Active",
      value: active,
    },
    {
      title: "Verified",
      value: verified,
    },
    {
      title: "Full",
      value: full,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              {stat.title}
            </p>

            <p className="text-3xl font-bold mt-2">
              {stat.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}