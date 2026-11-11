# -*- coding: utf-8 -*-
"""Bangun eda_notebook.ipynb dari eda_run.py (split per bagian '# ----------')."""
import json
import os
import re

BASE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(BASE, "eda_run.py"), encoding="utf-8").read()

parts = re.split(r"(?m)^(?=# ----------)", src)
cells = []
md_intro = (
    "# EDA Telemetri Distribusi MBG 2026\n\n"
    "Tugas 2 / UTS - Data Science (PSIKS2W002), Magister Ilmu Komputer, "
    "Universitas Amikom Purwokerto.\n\n"
    "Dataset: [Indonesia Free Nutritious Meal MBG 2026]"
    "(https://www.kaggle.com/datasets/luthfimuthathohirin/indonesia-makan-bergizi-gratis-mbg-telemetry) "
    "(13.000 x 26). Target: `bgn_program_compliance_tier` (klasifikasi 4 kelas).\n\n"
    "Unduh data dulu: jalankan `python download_data.py` (butuh `pip install kagglehub`)."
)
cells.append(("markdown", md_intro))
for part in parts:
    part = part.rstrip()
    if not part:
        continue
    cells.append(("code", part))

nb = {
    "cells": [
        {
            "cell_type": kind,
            "metadata": {},
            **({"source": text.splitlines(keepends=True)} if kind == "markdown"
               else {"source": text.splitlines(keepends=True), "outputs": [],
                     "execution_count": None}),
        }
        for kind, text in cells
    ],
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.12"},
    },
    "nbformat": 4,
    "nbformat_minor": 5,
}
out = os.path.join(BASE, "eda_notebook.ipynb")
with open(out, "w", encoding="utf-8") as fh:
    json.dump(nb, fh, ensure_ascii=False, indent=1)
print("cells:", len(nb["cells"]), "->", out)
