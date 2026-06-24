// Bentuk kasus setelah serialisasi JSON dari /api/dashboard (Date -> string).
export interface KasusDTO {
  id: string;
  kodeUnik: string;
  sumberInput: "RELAWAN" | "MANDIRI";
  namaKK: string | null;
  usiaKK: number | null;
  anggotaKeluarga: { hubungan: string; usia: number | null; kondisiKhusus: string | null }[] | null;
  kondisiMedisKritis: string[] | null;
  obatTersedia: boolean | null;
  mobilitas: string | null;
  asalLokasi: string | null;
  agentThought: string | null;
  skorKerentanan: number;
  levelPrioritas: "MERAH" | "KUNING" | "HIJAU";
  instansiRujukan: "DINAS_KESEHATAN" | "DINAS_SOSIAL" | "BPBD" | null;
  statusVerifikasiMedis: boolean;
  status: string;
  isSpam: boolean;
  createdAt: string;
}

export interface AgregatDTO {
  totalJiwa: number;
  totalKK: number;
  merah: number;
  kuning: number;
  hijau: number;
  ibuHamil: number;
  balita: number;
  lansia: number;
  tanpaObat: number;
  perInstansi: { DINAS_KESEHATAN: number; DINAS_SOSIAL: number; BPBD: number };
}

export interface DashboardResponse {
  ok: boolean;
  agregat: AgregatDTO;
  kasus: KasusDTO[];
  merahBelumVerifikasi: KasusDTO[];
  jumlahMerahAlarm: number;
  ts: string;
}
