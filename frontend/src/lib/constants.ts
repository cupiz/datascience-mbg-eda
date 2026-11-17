export const VALID_CLUSTERS = [
  "Jawa Metropolitan",
  "Luar Jawa Urban",
  "Daerah Pedesaan & Kepulauan",
  "Wilayah 3T Perbatasan & Pedalaman",
] as const;

export const VALID_BENEFICIARIES = [
  "Siswa SD / Madrasah Ibtidaiyah",
  "Siswa SMP / MTs",
  "Siswa SMA / SMK / MA",
  "Santri Pondok Pesantren",
  "Balita & Ibu Hamil Posyandu",
] as const;

export const VALID_PROTEINS = [
  "Daging Ayam Broiler",
  "Telur Ayam Boiler",
  "Ikan Kembung / Lele / Bandeng",
  "Daging Sapi / Kerbau",
  "Susu Pasteurisasi Segar",
] as const;

export const VALID_TRANSPORTS = [
  "Mobil Pickup Termal",
  "Motor Listrik / Roda Tiga Box",
  "Mobil Van Tertutup",
  "Perahu Ketinting Sungai / Laut",
  "Jalan Kaki / Gerobak",
] as const;

export const VALID_DRIVERS = [
  {
    value: "Prior-Snack-Consumption",
    label: "Konsumsi Jajanan Sebelum Makan (63,43%)",
  },
  {
    value: "Excessive-Portion-Size",
    label: "Porsi Karbohidrat Terlalu Besar (22,40%)",
  },
  {
    value: "Sub-Optimal-Arrival-Temperature",
    label: "Suhu Makanan Tiba Rendah <60°C (8,58%)",
  },
  {
    value: "Delivery-Transit-Delay",
    label: "Keterlambatan Pengiriman Transit (4,04%)",
  },
  {
    value: "Low-Palatability-Menu",
    label: "Penerimaan Rasa Menu Rendah (1,55%)",
  },
] as const;

export const VALID_PROVINCES = [
  "Aceh",
  "Bali",
  "Bangka Belitung",
  "Banten",
  "Bengkulu",
  "DI Yogyakarta",
  "DKI Jakarta",
  "Gorontalo",
  "Jambi",
  "Jawa Barat",
  "Jawa Tengah",
  "Jawa Timur",
  "Kalimantan Barat",
  "Kalimantan Selatan",
  "Kalimantan Tengah",
  "Kalimantan Timur",
  "Kalimantan Utara",
  "Kepulauan Riau",
  "Lampung",
  "Maluku",
  "Maluku Utara",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Papua",
  "Papua Barat",
  "Papua Barat Daya",
  "Papua Pegunungan",
  "Papua Selatan",
  "Papua Tengah",
  "Riau",
  "Sulawesi Barat",
  "Sulawesi Selatan",
  "Sulawesi Tengah",
  "Sulawesi Tenggara",
  "Sulawesi Utara",
  "Sumatera Barat",
  "Sumatera Selatan",
  "Sumatera Utara",
] as const;

export interface SimulatorPreset {
  id: string;
  label: string;
  tag: string;
  note: string;
  payload: {
    kitchen_daily_capacity_portions: number;
    raw_ingredient_cost_per_portion_idr: number;
    total_meal_cost_idr?: number | null;
    delivery_distance_km: number;
    transit_time_minutes: number;
    food_arrival_temperature_celsius: number;
    estimated_calories_kcal: number;
    estimated_protein_grams: number;
    regional_cluster: (typeof VALID_CLUSTERS)[number];
    province: (typeof VALID_PROVINCES)[number];
    beneficiary_category: (typeof VALID_BENEFICIARIES)[number];
    protein_type: (typeof VALID_PROTEINS)[number];
    delivery_transport_mode: (typeof VALID_TRANSPORTS)[number];
    student_attendance_rate_pct: number;
    local_farmer_sourcing_pct: number;
    primary_food_waste_driver: string;
  };
}

export const SIMULATOR_PRESETS: SimulatorPreset[] = [
  {
    id: "papua-3t",
    label: "3T Papua Selatan · Suhu 54°C",
    tag: "Risiko Tinggi",
    note: "Pengiriman sungai & darat 75 menit di wilayah 3T dengan suhu tiba di bawah ambang aman 60°C.",
    payload: {
      kitchen_daily_capacity_portions: 950,
      raw_ingredient_cost_per_portion_idr: 12500,
      total_meal_cost_idr: 15000,
      delivery_distance_km: 26.5,
      transit_time_minutes: 75,
      food_arrival_temperature_celsius: 54.0,
      estimated_calories_kcal: 540,
      estimated_protein_grams: 19.5,
      regional_cluster: "Wilayah 3T Perbatasan & Pedalaman",
      province: "Papua Selatan",
      beneficiary_category: "Siswa SD / Madrasah Ibtidaiyah",
      protein_type: "Telur Ayam Boiler",
      delivery_transport_mode: "Perahu Ketinting Sungai / Laut",
      student_attendance_rate_pct: 88.2,
      local_farmer_sourcing_pct: 64.0,
      primary_food_waste_driver: "Sub-Optimal-Arrival-Temperature",
    },
  },
  {
    id: "jawa-optimal",
    label: "Jawa Metro · SMA Optimal",
    tag: "Efisien",
    note: "Dapur kapasitas padat di DKI Jakarta melayani siswa SMA/SMK dengan energi tinggi dan rantai hangat terjaga.",
    payload: {
      kitchen_daily_capacity_portions: 2450,
      raw_ingredient_cost_per_portion_idr: 11200,
      total_meal_cost_idr: 13500,
      delivery_distance_km: 4.2,
      transit_time_minutes: 16,
      food_arrival_temperature_celsius: 68.5,
      estimated_calories_kcal: 810,
      estimated_protein_grams: 31.0,
      regional_cluster: "Jawa Metropolitan",
      province: "DKI Jakarta",
      beneficiary_category: "Siswa SMA / SMK / MA",
      protein_type: "Daging Sapi / Kerbau",
      delivery_transport_mode: "Mobil Van Tertutup",
      student_attendance_rate_pct: 96.4,
      local_farmer_sourcing_pct: 79.0,
      primary_food_waste_driver: "Prior-Snack-Consumption",
    },
  },
  {
    id: "kepulauan-transit",
    label: "Kepulauan · Transit 68 Menit",
    tag: "Waspada",
    note: "Distribusi Posyandu & SD antar-kecamatan dengan waktu tempuh panjang namun kotak termal masih memadai.",
    payload: {
      kitchen_daily_capacity_portions: 1420,
      raw_ingredient_cost_per_portion_idr: 11800,
      total_meal_cost_idr: 14400,
      delivery_distance_km: 19.8,
      transit_time_minutes: 68,
      food_arrival_temperature_celsius: 59.2,
      estimated_calories_kcal: 630,
      estimated_protein_grams: 23.4,
      regional_cluster: "Daerah Pedesaan & Kepulauan",
      province: "Nusa Tenggara Timur",
      beneficiary_category: "Balita & Ibu Hamil Posyandu",
      protein_type: "Ikan Kembung / Lele / Bandeng",
      delivery_transport_mode: "Mobil Pickup Termal",
      student_attendance_rate_pct: 91.5,
      local_farmer_sourcing_pct: 74.0,
      primary_food_waste_driver: "Delivery-Transit-Delay",
    },
  },
];

export const EDA_FIGURES_CATALOG = [
  { file: "fig02_hist_kde.png", title: "Distribusi Sisa Makanan (Target Right-Skewed)" },
  { file: "fig09_bermasalah_cluster.png", title: "Tingkat Distribusi Bermasalah (>=20%) per Klaster" },
  { file: "fig10_driver_tier.png", title: "Pemicu Sisa Makanan vs Tier Kepatuhan BGN" },
  { file: "fig07_corr_heatmap.png", title: "Peta Korelasi Fitur Numerik terhadap Plate Waste" },
  { file: "fig05_scatter.png", title: "Hubungan Bivariat Kalori, Suhu, & Transit" },
  { file: "fig06_box_per_tier.png", title: "Sebaran Sisa Makanan & Suhu per Tier Mutu" },
  { file: "fig03_bar_kategorikal.png", title: "Komparasi Kategori Penerima, Protein & Transport" },
  { file: "fig04_log_transform.png", title: "Transformasi Log & Refleksi Log Distribusi Fitur" },
  { file: "fig08_outlier_box.png", title: "Deteksi & Retensi Pencilan Operasional 3T" },
  { file: "fig01_missing.png", title: "Audit Kelengkapan Kolom (0 Missing Values)" },
];
