# -*- coding: utf-8 -*-
"""Unduh dataset MBG 2026 dari Kaggle (publik, tanpa kredensial) ke data/."""
import os

import kagglehub

BASE = os.path.dirname(os.path.abspath(__file__))
DEST = os.path.join(BASE, "data")
os.makedirs(DEST, exist_ok=True)

path = kagglehub.dataset_download(
    "luthfimuthathohirin/indonesia-makan-bergizi-gratis-mbg-telemetry")
print("Path to benchmark dataset:", path)
for f in os.listdir(path):
    src = os.path.join(path, f)
    if os.path.isfile(src):
        dst = os.path.join(DEST, f)
        with open(src, "rb") as a, open(dst, "wb") as b:
            b.write(a.read())
        print("copied ->", dst)
