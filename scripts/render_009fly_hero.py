"""Render the 009fly stable volumetric ink animation for a video-only desktop hero.

Source algorithm: the same stabilized shader used for the approved 1080p/60fps asset.
This script is used only in GitHub Actions, never executed in visitors' browsers.
"""
import math
import subprocess
import imageio_ffmpeg
from pathlib import Path

import numpy as np
from numba import njit, prange, set_num_threads
from PIL import Image

set_num_threads(4)
SIDE = 2048
x = np.arange(SIDE, dtype=np.float64) - SIDE // 2
y = np.arange(SIDE, dtype=np.float64) - SIDE // 2
values = np.sin(y[:, None] * 311.7 + x[None, :] * 127.1) * 43758.5453
values -= np.floor(values)
texture = np.floor(np.clip(values * 256, 0, 255)).astype(np.uint8)
del values


@njit(fastmath=True)
def noise(x, y, tex):
    ix, iy = math.floor(x), math.floor(y)
    fx, fy = x - ix, y - iy
    fx, fy = fx*fx*(3.-2.*fx), fy*fy*(3.-2.*fy)
    a = tex[(iy + 1024) & 2047, (ix + 1024) & 2047] / 255.
    b = tex[(iy + 1024) & 2047, (ix + 1025) & 2047] / 255.
    c = tex[(iy + 1025) & 2047, (ix + 1024) & 2047] / 255.
    d = tex[(iy + 1025) & 2047, (ix + 1025) & 2047] / 255.
    return (a * (1. - fx) + b * fx) * (1. - fy) + (c * (1. - fx) + d * fx) * fy


@njit(fastmath=True)
def fbm(x, y, tex):
    n, amplitude = 0., 0.5
    for _ in range(5):
        n += amplitude * noise(x, y, tex)
        x, y = x*1.6 + y*1.2 + 13.7, -x*1.2 + y*1.6 + 13.7
        amplitude *= 0.5
    return n


@njit(fastmath=True)
def smooth(a, b, value):
    q = max(0., min(1., (value - a) / (b - a)))
    return q*q*(3. - 2.*q)


@njit(parallel=True, fastmath=True)
def render(tex, width, height, t):
    pixels = np.empty((height, width, 3), dtype=np.uint8)
    ratio = width / height
    for yy in prange(height):
        py = .5 - (yy + .5) / height
        for xx in range(width):
            px = ((xx + .5) / width - .5) * ratio
            qx = fbm(px*2.3 + t*.09, py*2.3 - t*.07, tex)
            qy = fbm(px*2.3 - t*.08 + 3., py*2.3 + t*.06 + 3., tex)
            wx, wy = px + (qx - .5) * .53, py + (qy - .5) * .53
            a = fbm(wx*3.5 + t*.115, wy*3.5 - t*.07, tex)
            b = fbm(wx*6.4 - t*.12 + 8., wy*6.4 - t*.07 + 3., tex)
            c = fbm(wx*12. + t*.08, wy*12. - t*.1, tex)
            envelope = max(0., 1. - math.sqrt((px*.72)**2 + (py*1.05)**2) * .85)**.8
            v = a*.68 + b*.27 + c*.1
            cloud = smooth(.37, .76, v)
            edges = smooth(.53, .76, a*.71 + b*.24 + c*.05) - smooth(.75, .95, a*.7 + b*.3)
            density = (cloud*.35 + edges*.27) * envelope
            brightness = .012 + density*(.94 + .08*math.sin(t*.24))
            vignette = 1. - smooth(.45, 1.4, math.sqrt((px*.95)**2 + py*py))
            brightness *= .36*(1. - vignette) + vignette
            z = max(0, min(255, int(brightness * 255)))
            pixels[yy, xx, 0] = z
            pixels[yy, xx, 1] = z
            pixels[yy, xx, 2] = z
    return pixels


def main():
    width, height, fps, seconds = 960, 540, 60, 10
    target = Path('assets/009fly-hero-ink-1080p.mp4')
    poster = Path('assets/009fly-hero-ink-poster.jpg')
    target.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(render(texture, width, height, 0.)).resize(
        (1920, 1080), Image.Resampling.LANCZOS
    ).save(poster, quality=89, optimize=True)
    args = [
        imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-loglevel', 'error',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24',
        '-s', f'{width}x{height}', '-r', str(fps), '-i', '-',
        '-vf', 'scale=1920:1080:flags=lanczos,format=yuv420p',
        '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
        '-movflags', '+faststart', str(target),
    ]
    ffmpeg = subprocess.Popen(args, stdin=subprocess.PIPE)
    try:
        for frame in range(fps * seconds):
            ffmpeg.stdin.write(render(texture, width, height, frame / fps).tobytes())
            if frame % 60 == 0:
                print(f'Rendered {frame}/{fps*seconds} frames', flush=True)
    finally:
        ffmpeg.stdin.close()
    code = ffmpeg.wait()
    if code:
        raise RuntimeError(f'FFmpeg exited with {code}')
    print(f'Created {target}: {target.stat().st_size} bytes')


if __name__ == '__main__':
    main()
