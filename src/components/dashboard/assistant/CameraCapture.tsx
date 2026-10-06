import { useCallback, useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import Button from "../../common/Button";
import { api, errorMessage, type ImageData } from "../../../lib/api";

const MAX_EDGE = 1280;

/** Downscale a data-URL/blob image to JPEG base64 to keep requests small. */
async function toJpeg(
  src: HTMLImageElement | HTMLVideoElement,
  w: number,
  h: number
): Promise<ImageData> {
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
  return { media_type: "image/jpeg", base64: dataUrl.split(",")[1] };
}

export default function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (img: ImageData, preview: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (e) {
        setError(`Camera unavailable: ${errorMessage(e)}. You can pick a photo from disk instead.`);
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [stop]);

  const snap = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !ready) return;
    try {
      const img = await toJpeg(v, v.videoWidth, v.videoHeight);
      stop();
      onCapture(img, `data:${img.media_type};base64,${img.base64}`);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [ready, stop, onCapture]);

  const snapWithTimer = useCallback(() => {
    let n = 3;
    setCountdown(n);
    const id = window.setInterval(() => {
      n -= 1;
      if (n <= 0) {
        window.clearInterval(id);
        setCountdown(null);
        snap();
      } else {
        setCountdown(n);
      }
    }, 1000);
  }, [snap]);

  const pickFile = useCallback(async () => {
    try {
      const path = await open({
        multiple: false,
        directory: false,
        title: "Choose a photo",
        filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp"] }],
      });
      if (typeof path !== "string" || !path) return;
      const raw = await api.aiReadImage(path);
      // Downscale through an <img> so large files stay cheap.
      const img = new Image();
      img.src = `data:${raw.media_type};base64,${raw.base64}`;
      await img.decode();
      const scaled = await toJpeg(img, img.naturalWidth, img.naturalHeight);
      stop();
      onCapture(scaled, `data:${scaled.media_type};base64,${scaled.base64}`);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [stop, onCapture]);

  return (
    <div className="rounded-2xl border border-border/60 dark:border-border-dark/60 bg-surface dark:bg-surface-dark p-3 space-y-3 animate-pop">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
            Posture & appearance check
          </p>
          <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark">
            Stand or sit the way you usually do. Photos stay on this device unless you send one to
            the AI.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            stop();
            onClose();
          }}
          className="w-7 h-7 rounded-lg text-text-secondary hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
          aria-label="Close camera"
        >
          ✕
        </button>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-black/80 aspect-video">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-6xl font-bold drop-shadow-lg animate-pop">
            {countdown}
          </div>
        )}
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">
            Starting camera…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-white/90 text-xs">
            {error}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={snap} disabled={!ready || countdown !== null}>
          📸 Take photo
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={snapWithTimer}
          disabled={!ready || countdown !== null}
        >
          ⏱ 3 s timer
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={pickFile}>
          Choose from disk
        </Button>
      </div>
    </div>
  );
}
