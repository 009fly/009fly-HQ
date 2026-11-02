"""Render the approved smooth 009fly smoke footage for desktop (60fps) and mobile (30fps).
The two outputs use the existing lightweight background video system; ticker animation is unaffected.
"""
from pathlib import Path
import hashlib
import subprocess
import urllib.request
import imageio_ffmpeg

SOURCE_URL="https://videos.pexels.com/video-files/9694808/9694808-hd_1920_1080_25fps.mp4"
SOURCE_SHA256="693cbcad3ecaf90ed3dc33d592ad7c29a607b358fd795df98276ccdaf32fce0b"
src=Path("/tmp/9694808-hd_1920_1080_25fps.mp4")
assets=Path("assets")
assets.mkdir(parents=True,exist_ok=True)
if not src.is_file():
    req=urllib.request.Request(SOURCE_URL,headers={"User-Agent":"Mozilla/5.0"})
    with urllib.request.urlopen(req,timeout=90) as response, src.open("wb") as out:
        while True:
            block=response.read(1024*1024)
            if not block:break
            out.write(block)
assert src.stat().st_size>1000000
assert hashlib.sha256(src.read_bytes()).hexdigest()==SOURCE_SHA256, "Original footage checksum differs"
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()

# Approved 8.5-second smoke loop: dissolve tail 1.52s into head 1.52s,
# then run the body. Frame-rate interpolation removes 25Hz judder.
base=(
  "[0:v]fps=25,split=3[a][b][c];"
  "[a]trim=start_frame=212:end_frame=250,setpts=N/(25*TB)[tail];"
  "[b]trim=start_frame=0:end_frame=38,setpts=N/(25*TB)[head];"
  "[tail][head]blend=all_expr='A*(1-min(1,T/1.48))+B*min(1,T/1.48)':"
  "shortest=1,trim=end_frame=38,setpts=N/(25*TB)[mix];"
  "[c]trim=start_frame=38:end_frame=212,setpts=N/(25*TB)[mid];"
  "[mix][mid]concat=n=2:v=1:a=0,"
)
def encode(dest, fps, max_frames, processing, crf, maxrate):
    filt=(base+
          f"framerate=fps={fps},"
          "tpad=stop_mode=clone:stop_duration=0.08,"
          f"trim=end_frame={max_frames},setpts=N/({fps}*TB),"
          +processing+
          "format=yuv420p[v]")
    cmd=[
      ffmpeg,"-y","-hide_banner","-loglevel","error",
      "-t","10","-i",str(src),
      "-filter_complex",filt,"-map","[v]","-an",
      "-c:v","libx264","-preset","medium","-crf",str(crf),
      "-maxrate",maxrate,"-bufsize","6M",
      "-profile:v","main","-bf","0","-refs","1",
      "-pix_fmt","yuv420p","-r",str(fps),
      "-movflags","+faststart",str(dest)
    ]
    subprocess.run(cmd,check=True)
    assert dest.stat().st_size>200000,(dest,dest.stat().st_size)
    print(f"Rendered {dest} {dest.stat().st_size//1024} KiB",flush=True)

desktop=assets/"009fly-smoke02-desktop-1080p.mp4"
mobile=assets/"009fly-smoke02-mobile-720p.mp4"
encode(desktop,60,510,"scale=1920:1080:flags=lanczos,",21,"3800k")
encode(mobile,30,255,"crop=608:1080:(iw-608)/2:0,scale=720:1280:flags=lanczos,",21,"2000k")

poster=assets/"009fly-smoke02-poster.jpg"
subprocess.run([
  ffmpeg,"-y","-hide_banner","-loglevel","error",
  "-ss","2","-i",str(desktop),"-frames:v","1",
  "-vf","scale=960:540","-q:v","3",str(poster)
],check=True)
assert poster.stat().st_size>5000
print("Both smoother smoke loops and poster ready",flush=True)
