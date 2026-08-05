// components/EmergencyReportForm.tsx
//
// Requires: npm i react-hook-form @hookform/resolvers zod browser-image-compression
//
// Integration point with Samuel's offline sync module:
// This component does NOT touch IndexedDB or any storage/queue logic directly.
// On submit, it builds a complete EmergencyReport and calls the `onSubmitReport`
// prop, which the app wires up to Samuel's `saveReport()` (or equivalent) function.
// This component only reacts to the returned/observed sync status for display.

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reportSchema, type ReportSchemaType } from "../lib/reportSchema";
import { EMERGENCY_CATEGORIES } from "../config/emergencyCategories";
import { useGeolocation } from "../hooks/useGeolocation";
import { filesToReportImages } from "../lib/imageUtils";
import type { EmergencyReport, ReportImage } from "../types/report";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmergencyReportFormProps {
  // Wired up by the app shell to Samuel's offline storage/sync module.
  // Should return quickly (it just needs to queue the report) — this
  // component shows "Saved, will send when connected" once this resolves.
  onSubmitReport: (report: EmergencyReport) => Promise<void>;
}

export function EmergencyReportForm({ onSubmitReport }: EmergencyReportFormProps) {
  const [images, setImages] = useState<ReportImage[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "saved" | "error">("idle");

  const geo = useGeolocation();

  const form = useForm<ReportSchemaType>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      title: "",
      category: undefined,
      description: "",
      contact: "",
      location: {},
      images: [],
    },
  });

  // Keep the GPS result inside the form state so validation can see it.
  useEffect(() => {
    if (geo.location.lat === undefined || geo.location.lng === undefined) return;
    const current = form.getValues("location") ?? {};
    form.setValue(
      "location",
      {
        ...current,
        lat: geo.location.lat,
        lng: geo.location.lng,
        address: geo.location.address ?? current.address,
      },
      { shouldValidate: true }
    );
  }, [geo.location.lat, geo.location.lng, geo.location.address, form]);



  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsProcessingImages(true);
    try {
      const newImages = await filesToReportImages(e.target.files);
      const updated = [...images, ...newImages].slice(0, 5);
      setImages(updated);
      form.setValue("images", updated, { shouldValidate: true });
    } finally {
      setIsProcessingImages(false);
      e.target.value = ""; // allow re-selecting the same file
    }
  }

  function removeImage(id: string) {
    const updated = images.filter((img) => img.id !== id);
    setImages(updated);
    form.setValue("images", updated, { shouldValidate: true });
  }

  async function onSubmit(values: ReportSchemaType) {
    setSubmitState("submitting");

    const report: EmergencyReport = {
      id: crypto.randomUUID(),
      title: values.title,
      category: values.category,
      description: values.description,
      timestamp: new Date().toISOString(),
      location: {
        ...values.location,
        ...(geo.location.lat !== undefined ? geo.location : {}),
      },
      contact: values.contact || undefined,
      images: values.images as EmergencyReport["images"],
      syncStatus: "pending",
    };

    try {
      await onSubmitReport(report);
      setSubmitState("saved");
      form.reset();
      setImages([]);
    } catch {
      setSubmitState("error");
    }
  }

  if (submitState === "saved") {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6 text-center space-y-3">
          <div className="text-4xl">✅</div>
          <h2 className="text-lg font-semibold">Report saved</h2>
          <p className="text-sm text-muted-foreground">
            Your report is stored and will be sent automatically as soon as a connection
            is available. You don't need to stay on this screen.
          </p>
          <Button onClick={() => setSubmitState("idle")} className="w-full">
            Submit another report
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Category — visual buttons, not a dropdown, for speed under stress */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What's happening?</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-3 gap-2">
                      {EMERGENCY_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => field.onChange(cat.id)}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-colors",
                            field.value === cat.id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:bg-muted"
                          )}
                        >
                          <span className="text-2xl">{cat.icon}</span>
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Armed men entering Ochekwu village" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What's happening — describe briefly</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="Describe what you see or know" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <div className="space-y-2">
              <Label>Location</Label>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={geo.requestLocation}
                  disabled={geo.status === "requesting"}
                >
                  {geo.status === "requesting" ? "Getting location…" : "📍 Use my current location"}
                </Button>

                {geo.status === "granted" && (
                  <p className="text-xs text-muted-foreground">
                    Captured: {geo.location.address ?? `${geo.location.lat?.toFixed(4)}, ${geo.location.lng?.toFixed(4)}`}
                  </p>
                )}

                <FormField
                  control={form.control}
                  name="location.manualEntry"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Or type the location (e.g. nearest landmark, village)"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.formState.errors.location?.message && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.location.message as string}
                  </p>
                )}
              </div>
            </div>


            {/* Images */}
            <div className="space-y-2">
              <Label>Photos (optional, up to 5)</Label>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handleImageSelect}
                  disabled={isProcessingImages || images.length >= 5}
                />
                {isProcessingImages && (
                  <p className="text-xs text-muted-foreground">Compressing images…</p>
                )}
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img) => (
                      <div key={img.id} className="relative">
                        <img
                          src={img.dataUrl}
                          alt={img.fileName}
                          className="h-20 w-full rounded-md object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="absolute -top-1 -right-1 rounded-full bg-destructive text-destructive-foreground w-5 h-5 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>


            <FormField
              control={form.control}
              name="contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your phone number (optional)</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="080…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitState === "error" && (
              <p className="text-sm text-destructive">
                Couldn't save the report. Please try again.
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={submitState === "submitting"}>
              {submitState === "submitting" ? "Saving…" : "Send Report"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
