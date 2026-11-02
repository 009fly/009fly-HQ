"""Losslessly transcode the original animated 009fly GIF. NEVER publish unverified animation."""
from PIL import Image, ImageSequence, ImageChops, features
from pathlib import Path
import sys

SOURCE = Path("Trasnaprent-Gif-Loop.gif")
OUTPUT = Path("009fly-nav-logo-lossless.webp")

def frame_durations(path):
    data = path.read_bytes()
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise RuntimeError("Not a WebP container")
    durations = []
    off = 12
    while off + 8 <= len(data):
        tag = data[off:off + 4]
        length = int.from_bytes(data[off + 4:off + 8], "little")
        chunk = data[off + 8:off + 8 + length]
        if tag == b"ANMF":
            durations.append(int.from_bytes(chunk[12:15], "little"))
        off += 8 + length + (length % 2)
    return durations

source = Image.open(SOURCE)
n = getattr(source, "n_frames", 1)
size = source.size
loop = source.info.get("loop", 0)
print(f"Original GIF: bytes={SOURCE.stat().st_size}, dimensions={size}, frames={n}, loop={loop}", flush=True)
if n <= 1:
    raise RuntimeError("The repository original contains no animated frames; stop and preserve GIF.")
if n > 900:
    raise RuntimeError("Unexpectedly many frames; preserve original pending safe streaming method.")

frames = []
durations = []
for frame in ImageSequence.Iterator(source):
    frames.append(frame.convert("RGBA").copy())
    durations.append(frame.info.get("duration", 100))
if len(frames) != n or any(d is None or d < 0 for d in durations):
    raise RuntimeError("Unexpected GIF frame timing or count")
print(f"GIF durations: total_ms={sum(durations)}; unique_ms={sorted(set(durations))}", flush=True)
frames[0].save(
    OUTPUT, format="WEBP", save_all=True, append_images=frames[1:],
    duration=durations, loop=loop, lossless=True, exact=True,
    method=6, quality=100
)
out = Image.open(OUTPUT)
actual_durations = frame_durations(OUTPUT)
print(f"WebP candidate: bytes={OUTPUT.stat().st_size}, frames={getattr(out, 'n_frames', 1)}, durations={len(actual_durations)}", flush=True)
if getattr(out, "n_frames", 1) != n:
    raise RuntimeError(f"Frame count mismatch: {out.n_frames} vs {n}")
if actual_durations != durations:
    raise RuntimeError(f"Timing mismatch: source={durations[:15]} output={actual_durations[:15]}")
if out.size != size or out.info.get("loop", 0) != loop:
    raise RuntimeError("Dimension or animation loop mismatch")
for i, orig in enumerate(frames):
    out.seek(i)
    converted = out.convert("RGBA")
    if ImageChops.difference(orig, converted).getbbox() is not None:
        raise RuntimeError(f"Pixel mismatch at frame {i}; KEEP ORIGINAL.")
print(f"PASS: ALL {n} FRAMES PIXEL-IDENTICAL with identical timing/loop, at original dimensions.", flush=True)
original_bytes = SOURCE.stat().st_size
optimized_bytes = OUTPUT.stat().st_size
saving = 100 * (original_bytes - optimized_bytes) / original_bytes
print(f"Original {original_bytes} bytes; lossless WebP {optimized_bytes} bytes; savings {saving:.1f}%", flush=True)
if optimized_bytes >= original_bytes:
    OUTPUT.unlink()
    print("NO SIZE IMPROVEMENT: leaving website on the original GIF.", flush=True)
else:
    print("LOSSLESS OPTIMIZATION VERIFIED; safe to prepare site update after separate review.", flush=True)
