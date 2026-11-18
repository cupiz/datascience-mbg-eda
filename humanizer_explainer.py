# -*- coding: utf-8 -*-
"""Penjelas Bahasa Sederhana (Humanizer AI) untuk PlateGuard MBG.

Mengubah angka prediksi, TreeSHAP, dan pemicu operasional menjadi bahasa
sehari-hari berbahasa Indonesia yang lugas bagi petugas dapur SPPG dan awam.
Menghindari klise editorial, verba ringan berlebih, serta kalimat majemuk kaku
sesuai kaidah penyuntingan humanizer-id.
"""
from typing import Any, Dict, List


def fmt_id_num(val: float, digits: int = 1) -> str:
    """Format angka desimal memakai koma Indonesia dan titik ribuan."""
    raw = f"{val:,.{digits}f}"
    return raw.replace(",", "_").replace(".", ",").replace("_", ".")


def fmt_id_rp(val: float) -> str:
    """Format rupiah bulat tanpa desimal panjang agar mudah terbaca."""
    return f"Rp{int(round(val)):,}".replace(",", ".")


def fmt_id_rp_scale(val: float) -> str:
    """Format rupiah harian dapur ke satuan ribu atau juta yang akurat."""
    if val >= 1_000_000:
        return f"Rp{fmt_id_num(val / 1_000_000, 2)} juta"
    return fmt_id_rp(val)


_DRIVER_PLAIN: Dict[str, str] = {
    "Prior-Snack-Consumption": "anak sudah kenyang karena jajan sebelum jam makan",
    "Excessive-Portion-Size": "porsi karbohidrat atau lauk terlalu banyak untuk usia penerima",
    "Sub-Optimal-Arrival-Temperature": "makanan tiba terlalu dingin di bawah 60°C",
    "Delivery-Transit-Delay": "pengiriman terlambat tiba sehingga jam makan terlewat",
    "Low-Palatability-Menu": "menu kurang sesuai selera anak di wilayah tersebut",
}

_DRIVER_ACTION: Dict[str, str] = {
    "Prior-Snack-Consumption": (
        "Sepakati aturan kantin sekolah agar tidak menjual jajanan berat "
        "selama dua jam sebelum jadwal makan MBG."
    ),
    "Excessive-Portion-Size": (
        "Sesuaikan takaran nasi dan lauk mengikuti usia penerima agar porsi habis tanpa tersisa."
    ),
    "Sub-Optimal-Arrival-Temperature": (
        "Ganti wadah pengantaran dengan kotak penghangat tertutup rapat agar suhu makanan tetap di atas 60°C."
    ),
    "Delivery-Transit-Delay": (
        "Majukan jadwal memasak atau alihkan rute ke dapur SPPG terdekat agar makanan tiba sebelum jam istirahat."
    ),
    "Low-Palatability-Menu": (
        "Uji variasi bumbu lokal yang lebih akrab di lidah penerima pada siklus menu pekan depan."
    ),
}


def humanize_contribution(key: str, raw_row: Dict[str, Any], shap_pp: float) -> str:
    """Buat satu kalimat arti awam untuk satu faktor penyumbang TreeSHAP."""
    temp = float(raw_row.get("food_arrival_temperature_celsius", 65.0))
    kcal = float(raw_row.get("estimated_calories_kcal", 680.0))
    protein = float(raw_row.get("estimated_protein_grams", 22.7))
    transit = float(raw_row.get("transit_time_minutes", 25.0))
    dist = float(raw_row.get("delivery_distance_km", 6.8))
    ratio = float(raw_row.get("cost_to_nutrition_ratio", 600.0))
    spoil = float(raw_row.get("spoilage_risk_index", 2.0))
    cap = int(raw_row.get("kitchen_daily_capacity_portions", 1780))
    prov = str(raw_row.get("province", "-"))
    cluster = str(raw_row.get("regional_cluster", "-"))
    benef = str(raw_row.get("beneficiary_category", "-"))
    prot_name = str(raw_row.get("protein_type", "-"))
    driver = str(raw_row.get("primary_food_waste_driver", ""))

    arah = "menambah" if shap_pp >= 0 else "menekan"
    besaran = f"{fmt_id_num(abs(shap_pp), 2)} poin persen"

    if "food_arrival_temperature_celsius" in key:
        kondisi = "dingin di bawah batas aman 60°C" if temp < 60 else "masih hangat saat tiba"
        return f"Suhu makanan {fmt_id_num(temp, 1)}°C tergolong {kondisi} sehingga {arah} sisa sekitar {besaran}."
    if "estimated_calories_kcal" in key:
        return f"Energi {fmt_id_num(kcal, 0)} kkal per porsi {arah} perkiraan makanan tersisa sebesar {besaran}."
    if "estimated_protein_grams" in key:
        return f"Kandungan protein {fmt_id_num(protein, 1)} gram ikut {arah} perkiraan sisa makanan sebesar {besaran}."
    if "cost_to_nutrition_ratio" in key:
        return f"Biaya gizi {fmt_id_rp(ratio)} per gram protein ikut {arah} sisa piring sebesar {besaran}."
    if "spoilage_risk_index" in key:
        return f"Risiko makanan cepat basi ({fmt_id_num(spoil, 2)}/10) {arah} perkiraan sisa sebesar {besaran}."
    if "transit_time_minutes" in key:
        return f"Waktu tempuh {fmt_id_num(transit, 0)} menit dari dapur {arah} sisa makanan sebesar {besaran}."
    if "interaksi_suhu_transit" in key:
        return (
            f"Gabungan lama perjalanan ({fmt_id_num(transit, 0)} menit) dan suhu tiba "
            f"({fmt_id_num(temp, 1)}°C) {arah} sisa makanan sebesar {besaran}."
        )
    if "distance" in key or "kecepatan" in key:
        return f"Jarak kirim {fmt_id_num(dist, 1)} km {arah} perkiraan sisa makanan sebesar {besaran}."
    if "province" in key:
        return f"Pola makan wilayah {prov} {arah} angka perkiraan sebesar {besaran}."
    if "regional_cluster" in key:
        return f"Karakteristik wilayah {cluster} {arah} perkiraan sisa sebesar {besaran}."
    if "beneficiary" in key:
        return f"Kelompok penerima ({benef}) {arah} perkiraan sisa sebesar {besaran}."
    if "protein_type" in key:
        return f"Pilihan lauk ({prot_name}) {arah} selera habis penerima sebesar {besaran}."
    if "kitchen_daily_capacity" in key:
        return f"Skala dapur {cap:,} porsi per hari {arah} sisa makanan sebesar {besaran}.".replace(",", ".")
    if "primary_food_waste_driver" in key and driver in _DRIVER_PLAIN:
        return f"Temuan lapangan bahwa {_DRIVER_PLAIN[driver]} {arah} sisa piring sebesar {besaran}."
    return f"Faktor ini {arah} perkiraan sisa makanan sebesar {besaran}."


def build_humanizer_bundle(
    scenario: str,
    pred_waste: float,
    loss_idr: float,
    effective_cost_idr: float,
    raw_row: Dict[str, Any],
    contributions: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Susun ringkasan bahasa sehari-hari untuk hasil simulasi tunggal."""
    prov = str(raw_row.get("province", "daerah tujuan"))
    benef = str(raw_row.get("beneficiary_category", "penerima")).split("/")[0].strip()
    temp = float(raw_row.get("food_arrival_temperature_celsius", 65.0))
    transit = float(raw_row.get("transit_time_minutes", 25.0))
    kcal = float(raw_row.get("estimated_calories_kcal", 680.0))
    portions = int(raw_row.get("kitchen_daily_capacity_portions", 1780))
    daily_loss = loss_idr * portions
    cost_total = float(raw_row.get("total_meal_cost_idr", 13500.0))

    if pred_waste >= 20.0:
        headline = "Perhatian segera: hampir seperlima hingga sepertiga porsi berisiko tersisa."
    elif pred_waste >= 15.0:
        headline = "Risiko pemborosan tinggi: sebaiknya perbaiki rencana kirim sebelum berangkat."
    elif pred_waste >= 10.0:
        headline = "Risiko sedang: sebagian porsi dapat tersisa bila suhu atau ukuran porsi luput dijaga."
    else:
        headline = "Aman terkendali: makanan diperkirakan habis hampir seluruhnya."

    story = (
        f"Untuk pengantaran {fmt_id_rp(cost_total)} per porsi ke {prov} ({benef}), "
        f"sekitar {fmt_id_num(pred_waste, 2)}% makanan diperkirakan tidak termakan. "
        f"Artinya, sekitar {fmt_id_rp(loss_idr)} terbuang pada setiap kotak makan sehingga "
        f"biaya nyata per porsi yang benar-benar termakan naik menjadi {fmt_id_rp(effective_cost_idr)}. "
        f"Pada skala {fmt_id_num(portions, 0)} porsi sehari, nilai makanan terbuang mencapai {fmt_id_rp_scale(daily_loss)} per hari."
    )

    pos_items = [c for c in contributions if float(c.get("shap_pp", 0)) > 0.15]
    neg_items = [c for c in contributions if float(c.get("shap_pp", 0)) < -0.15]

    cause_parts: List[str] = []
    if scenario == "post-hoc":
        driver = str(raw_row.get("primary_food_waste_driver", ""))
        if driver in _DRIVER_PLAIN:
            cause_parts.append(f"Catatan lapangan menunjukkan {_DRIVER_PLAIN[driver]}")
    if temp < 60.0:
        cause_parts.append(
            f"makanan tiba terlalu dingin pada suhu {fmt_id_num(temp, 1)}°C karena menempuh perjalanan {fmt_id_num(transit, 0)} menit"
        )
    elif pos_items:
        top = pos_items[0]
        cause_parts.append(
            f"pendorong kenaikan sisa terbesar berasal dari {top['label'].lower()} ({top['display_value']})"
        )

    if neg_items:
        best_neg = neg_items[0]
        penahan_lbl = str(best_neg["label"]).lower().replace("laju pendinginan", "penurunan suhu bertahap")
        penahan_val = str(best_neg["display_value"]).replace(".", ",")
        penahan = (
            f"Sebaliknya, faktor {penahan_lbl} ({penahan_val}) "
            f"ikut menahan sisa piring agar tidak makin tinggi."
        )
    else:
        penahan = ""

    if cause_parts:
        cause_plain = "Penyebab utamanya ialah " + ", dan ".join(cause_parts) + "."
        if penahan:
            cause_plain = f"{cause_plain} {penahan}"
    else:
        cause_plain = (
            "Tidak ditemukan penyimpangan besar pada suhu, jarak tempuh, ataupun porsi gizi rencana ini."
        )

    actions: List[str] = []
    if temp < 60.0:
        actions.append(
            f"Jaga suhu kirim di atas 60°C memakai boks berinsulasi hangat agar tidak turun ke {fmt_id_num(temp, 1)}°C saat tiba."
        )
    if transit > 60.0:
        actions.append(
            f"Pangkas durasi perjalanan {fmt_id_num(transit, 0)} menit dengan memajukan jadwal masak atau memakai dapur satelit lebih dekat."
        )
    if kcal > 800.0:
        actions.append(
            f"Kurangi sedikit porsi karbohidrat ({fmt_id_num(kcal, 0)} kkal saat ini terlalu padat untuk sebagian anak)."
        )
    elif kcal < 550.0:
        actions.append(
            f"Lengkapi menu bernutrisi ({fmt_id_num(kcal, 0)} kkal) agar mengenyangkan tanpa menggoda anak membeli jajanan luar."
        )
    if scenario == "post-hoc":
        drv = str(raw_row.get("primary_food_waste_driver", ""))
        if drv in _DRIVER_ACTION:
            actions.append(_DRIVER_ACTION[drv])

    if not actions:
        if pred_waste >= 10.0:
            actions.append(
                "Koordinasikan pihak sekolah agar siswa tidak jajan menjelang jam makan MBG supaya porsi tersisa turun di bawah 10%."
            )
        else:
            actions.append(
                "Pertahankan standar suhu kotak hangat dan jam pengantaran ini karena seluruh indikator berada pada batas baik."
            )

    return {
        "headline": headline,
        "story": story,
        "cause_plain": cause_plain,
        "action_plain": actions[0],
        "plain_recommendations": actions,
    }
