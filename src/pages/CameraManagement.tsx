import { Header } from "@/components/dashboard/Header";
import { CameraGallery } from "@/components/dashboard/CameraGallery";
import { CameraManager } from "@/components/dashboard/CameraManager";
import { LiveCameraFeed } from "@/components/dashboard/LiveCameraFeed";

export default function CameraManagement() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-[1600px] space-y-8 px-4 py-6 md:px-6">
        <section className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
            AIJE Surveillance
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Camera Management
          </h1>

          <p className="max-w-3xl text-muted-foreground">
            Monitor live camera feeds, manage connected cameras, configure
            streams, and review available surveillance devices.
          </p>
        </section>

        <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="min-w-0">
            <LiveCameraFeed cameraName="Primary Camera" />
          </div>

          <div className="min-w-0">
            <CameraManager />
          </div>
        </section>

        <section>
          <CameraGallery />
        </section>
      </main>
    </div>
  );
}