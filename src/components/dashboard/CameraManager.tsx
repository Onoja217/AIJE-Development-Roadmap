import { useState } from "react";
import { Plus, Trash2, Video, Power, PowerOff } from "lucide-react";
import { z } from "zod";
import { useCameras, type StreamType } from "@/hooks/useCameras";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  stream_url: z.string().trim().url().max(500),
  stream_type: z.enum(["hls", "mjpeg", "http"]),
});

export function CameraManager() {
  const { cameras, addCamera, updateCamera, deleteCamera } = useCameras();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<StreamType>("hls");

  const handleAdd = async () => {
    const parsed = schema.safeParse({ name, stream_url: url, stream_type: type });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    await addCamera({
      name: parsed.data.name,
      stream_url: parsed.data.stream_url,
      stream_type: parsed.data.stream_type,
      enabled: true,
    });
    setName(""); setUrl(""); setType("hls"); setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          {cameras.length} CCTV camera{cameras.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>

      {open && (
        <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-3">
          <div className="space-y-1">
            <Label htmlFor="cam-name" className="text-xs">Camera name</Label>
            <Input id="cam-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Front Gate" maxLength={60} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cam-url" className="text-xs">Stream URL</Label>
            <Input
              id="cam-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://192.168.1.10:8888/cam1/index.m3u8"
              maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground">
              For RTSP cams, run MediaMTX locally and paste its HLS URL (.m3u8).
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Stream type</Label>
            <Select value={type} onValueChange={(v) => setType(v as StreamType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hls">HLS (.m3u8)</SelectItem>
                <SelectItem value="mjpeg">MJPEG</SelectItem>
                <SelectItem value="http">HTTP / MP4</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd}>Save camera</Button>
          </div>
        </div>
      )}

      {cameras.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {cameras.map((cam) => (
            <li key={cam.id} className="flex items-center gap-3 p-3">
              <Video className={`h-4 w-4 ${cam.enabled ? "text-primary" : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{cam.name}</p>
                <p className="text-[10px] font-mono text-muted-foreground truncate">
                  {cam.stream_type.toUpperCase()} • {cam.stream_url}
                </p>
              </div>
              <button
                onClick={() => updateCamera(cam.id, { enabled: !cam.enabled })}
                className="p-1.5 rounded hover:bg-secondary"
                title={cam.enabled ? "Disable" : "Enable"}
              >
                {cam.enabled
                  ? <Power className="h-4 w-4 text-success" />
                  : <PowerOff className="h-4 w-4 text-muted-foreground" />}
              </button>
              <button
                onClick={() => deleteCamera(cam.id)}
                className="p-1.5 rounded hover:bg-destructive/10"
                title="Delete"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
