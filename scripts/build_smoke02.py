"""Create lightweight seamless desktop and mobile loops from the approved Pexels smoke footage."""
from pathlib import Path
import hashlib, subprocess, urllib.request
import imageio_ffmpeg

URL = "https://videos.pexels.com/video-files/9694808/9694808-hd_1920_1080_25fps.mp4"
CHECKSUM = "693cbcad3ecaf90ed3dc33d592ad7c29a607b358fd795df98276ccdaf32fce0b"
assets = Path("assets")
assets.mkdir(exist_ok=True)
src = Path("/tmp/9694808-hd_1920_1080_25fps.mp4")
if not src.exists():
    req=urllib.request.Request(URL,headers={"User-Agent":"Mozilla/5.0"})
    with urllib.request.urlopen(req,timeout=75) as response:
        with src.open("wb") as out:
            while chunk := response.read(1024*1024): out.write(chunk)
assert src.stat().st_size > 1000000, "Downloaded file missing or too small"
digest=hashlib.sha256(src.read_bytes()).hexdigest()
assert digest == CHECKSUM, f"Downloaded footage checksum mismatch: {digest}"
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()

# Loop starts at original frame 212 and transitions to frame 0 during first 38 frames.
# The remaining frames 38..211 then play normally, connecting without a jump.
graph=(
    "[0:v]fps=25,split=3[a][b][c];"
    "[a]trim=start_frame=212:end_frame=250,setpts=N/(25*TB)[tail];"
    "[b]trim=start_frame=0:end_frame=38,setpts=N/(25*TB)[head];"
    "[tail][head]blend=all_expr='A*(1-min(1,T/1.48))+B*min(1,T/1.48)':shortest=1,"
    "trim=end_frame=38,setpts=N/(25*TB)[mix];"
    "[c]trim=start_frame=38:end_frame=212,setpts=N/(25*TB)[mid];"
    "[mix][mid]concat=n=2:v=1:a=0,fps=25,"
)
def encode(path, filter_tail, crf, maxrate):
    cmd=[
        ffmpeg,"-y","-hide_banner","-loglevel","error",
        "-ss","0","-t","10","-i",str(src),
        "-filter_complex",graph+filter_tail.rstrip(",")+"[v]",
        "-map","[v]","-an","-c:v","libx264",
        "-preset","medium","-crf",str(crf),"-maxrate",maxrate,
        "-bufsize","6M","-pix_fmt","yuv420p",
        "-movflags","+faststart",str(path),
    ]
    subprocess.run(cmd,check=True)
    assert path.stat().st_size > 200000, f"Bad output {path}"
    print(f"Built {path} ({path.stat().st_size//1024} KB)",flush=True)

desktop=assets/"009fly-smoke02-desktop-1080p.mp4"
mobile=assets/"009fly-smoke02-mobile-720p.mp4"
encode(desktop,"scale=1920:1080:flags=lanczos,format=yuv420p,",21,"3500k")
encode(mobile,"crop=608:1080:(iw-608)/2:0,scale=720:1280:flags=lanczos,format=yuv420p,",22,"1800k")

poster=assets/"009fly-smoke02-poster.jpg"
subprocess.run([
    ffmpeg,"-y","-hide_banner","-loglevel","error",
    "-ss","2.0","-i",str(desktop),"-frames:v","1",
    "-vf","scale=960:540","-q:v","3",str(poster)
],check=True)
assert poster.stat().st_size > 5000
print("All smoke assets ready",flush=True)
