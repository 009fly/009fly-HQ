"""Transcode the approved live 1080p smoke into a seamless, GPU-lighter desktop loop."""
import subprocess
from pathlib import Path
import imageio_ffmpeg

SOURCE=Path("assets/009fly-hero-ink-1080p.mp4")
OUTPUT=Path("assets/009fly-hero-ink-seamless-720p60.mp4")
# Original is 600 frames, 10 seconds at 60 FPS.
# Blend the final 90 frames into the first 90, then append original frames 90-509.
# End frame 509 runs naturally into frame 510, which starts the loop.
graph = (
    "[0:v]split=3[a][b][c];"
    "[a]trim=start_frame=510:end_frame=600,setpts=N/(60*TB)[tail];"
    "[b]trim=start_frame=0:end_frame=90,setpts=N/(60*TB)[head];"
    "[tail][head]blend=all_expr='A*(1-min(1,T/1.5))+B*min(1,T/1.5)':"
    "shortest=1,trim=end_frame=90,setpts=N/(60*TB)[mix];"
    "[c]trim=start_frame=90:end_frame=510,setpts=N/(60*TB)[mid];"
    "[mix][mid]concat=n=2:v=1:a=0,fps=60,"
    "scale=1280:720:flags=lanczos,format=yuv420p[out]"
)
assert SOURCE.is_file(), f"Source video missing: {SOURCE}"
cmd=[
    imageio_ffmpeg.get_ffmpeg_exe(),"-y","-hide_banner","-loglevel","error",
    "-i",str(SOURCE),"-filter_complex",graph,"-map","[out]","-an",
    "-c:v","libx264","-preset","medium","-crf","21",
    "-profile:v","main","-level","3.2","-bf","0","-refs","1",
    "-pix_fmt","yuv420p","-r","60","-movflags","+faststart",str(OUTPUT)
]
subprocess.run(cmd,check=True)
frames,seconds=imageio_ffmpeg.count_frames_and_secs(str(OUTPUT))
assert frames==510 and abs(seconds-8.5)<0.1, (frames,seconds)
assert OUTPUT.stat().st_size>200000
print(f"Ready: {OUTPUT}: {frames} frames, {seconds:.2f}s, {OUTPUT.stat().st_size} bytes")

# The same seamless master, sampled at 30fps: half the video decode workload
# for desktop browsers while CSS ticker remains independently GPU-animated.
LIGHT = Path("assets/009fly-hero-ink-seamless-720p30.mp4")
cmd_light = [
    imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-hide_banner", "-loglevel", "error",
    "-i", str(OUTPUT), "-vf", "fps=30,format=yuv420p", "-an",
    "-c:v", "libx264", "-preset", "medium", "-crf", "19",
    "-profile:v", "main", "-level", "3.1", "-bf", "0", "-refs", "1",
    "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", str(LIGHT),
]
subprocess.run(cmd_light, check=True)
light_frames, light_seconds = imageio_ffmpeg.count_frames_and_secs(str(LIGHT))
assert light_frames == 255 and abs(light_seconds - 8.5) < .1, (light_frames, light_seconds)
print(f"Ready: {LIGHT}: {light_frames} frames, {light_seconds:.2f}s, {LIGHT.stat().st_size} bytes")
