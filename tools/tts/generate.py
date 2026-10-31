"""Record article narration with Kokoro (open-source TTS, Apache-2.0) into frontend/public/audio.

One MP3 per chunk, named by a hash of voice + text, plus a manifest the player reads:
  frontend/public/audio/<slug>/manifest.json  {"voice": ..., "chunks": [{"text": ..., "file": ...}]}
The player uses a recording only when its text matches the chunk exactly, so an edited sentence
falls back to the device voice until this script is run again. Unchanged chunks are not re-recorded.

  pip install kokoro-onnx soundfile          (and ffmpeg on PATH)
  # model files: kokoro-v1.0.int8.onnx + voices-v1.0.bin from
  # https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
  node tools/tts/export-chunks.mjs > /tmp/chunks.json
  python tools/tts/generate.py /tmp/chunks.json --model DIR [--voice af_heart] [--only api-types]
"""
import argparse, hashlib, json, os, subprocess, sys, tempfile
import soundfile as sf
from kokoro_onnx import Kokoro

p = argparse.ArgumentParser()
p.add_argument("chunks"); p.add_argument("--model", required=True)
p.add_argument("--voice", default="af_heart"); p.add_argument("--lang", default=None)
p.add_argument("--only", default=None); p.add_argument("--out", default="frontend/public/audio")
p.add_argument("--bitrate", default="40k")
a = p.parse_args()
lang = a.lang or ("en-gb" if a.voice.startswith("b") else "en-us")
k = Kokoro(os.path.join(a.model, "kokoro-v1.0.int8.onnx"), os.path.join(a.model, "voices-v1.0.bin"))

for art in json.load(open(a.chunks)):
    if a.only and art["slug"] != a.only: continue
    d = os.path.join(a.out, art["slug"]); os.makedirs(d, exist_ok=True)
    entries, keep = [], set()
    for i, text in enumerate(art["chunks"]):
        f = hashlib.sha1(f"{a.voice}|{text}".encode()).hexdigest()[:12] + ".mp3"
        keep.add(f); entries.append({"text": text, "file": f})
        path = os.path.join(d, f)
        if os.path.exists(path): continue
        audio, sr = k.create(text, voice=a.voice, speed=1.0, lang=lang)
        with tempfile.NamedTemporaryFile(suffix=".wav") as w:
            sf.write(w.name, audio, sr)
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", w.name, "-ac", "1", "-b:a", a.bitrate, path], check=True)
        print(f"{art['slug']} {i+1}/{len(art['chunks'])} {f}", flush=True)
    for f in os.listdir(d):  # drop recordings of text that no longer exists
        if f.endswith(".mp3") and f not in keep: os.remove(os.path.join(d, f))
    json.dump({"voice": a.voice, "model": "kokoro-v1.0", "chunks": entries}, open(os.path.join(d, "manifest.json"), "w"), ensure_ascii=False, indent=0)
    print(f"{art['slug']}: {len(entries)} chunks, voice {a.voice}")
