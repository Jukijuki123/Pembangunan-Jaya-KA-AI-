import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Logo } from "@/components/Logo";
import { InteractiveDashboard } from "@/components/landing/InteractiveDashboard";
import { 
  ArrowRight, 
  QrCode, 
  ChevronRight, 
  Check, 
  Building2, 
  Cpu 
} from "lucide-react";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/intake");
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 overflow-x-hidden selection:bg-pmi selection:text-white">
      {/* Navbar Minimalis */}
      <nav className="fixed top-0 z-50 w-full border-b border-slate-200 bg-white/90 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo size={32} withWordmark />
          
          <div className="flex items-center gap-6">
            <Link
              href="/mandiri/POSKO01"
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-pmi"
            >
              Lapor Mandiri
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-pmi px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-pmi-dark active:scale-98"
            >
              Masuk Sistem
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section (2-Column Grid) */}
      <section className="bg-hero relative flex min-h-[85vh] flex-col justify-center px-4 pt-28 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-12">
          
          {/* Hero Left: Text & Action */}
          <div className="flex flex-col text-left lg:col-span-6">
            <div className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-pmi">
              <span className="h-2 w-2 rounded-full bg-pmi"></span>
              LKS NASIONAL AI 2026
            </div>

            <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl md:leading-[1.15]">
              Sistem Manajemen <br />
              & <span className="text-pmi">Triage Pengungsi</span>
            </h1>

            <p className="mb-8 max-w-xl text-base text-slate-600 sm:text-lg leading-relaxed">
              Aplikasi pendataan korban bencana alam dan klasifikasi tingkat kerentanan keluarga berbasis kecerdasan buatan untuk mempercepat penanganan medis dan alokasi logistik di posko lapangan PMI.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 rounded-lg bg-pmi px-6 py-3.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-pmi-dark active:scale-98"
              >
                Masuk Sesi Relawan
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
              <Link
                href="/mandiri/POSKO01"
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors active:scale-98"
              >
                Isi Formulir Mandiri (Demo)
              </Link>
            </div>

            {/* Simple Metrics */}
            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-slate-200 pt-6">
              <div>
                <p className="text-xl font-bold text-slate-900">72 Jam</p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Golden Hour</p>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">&lt; 1 Detik</p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Analisis AI</p>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">HMAC-256</p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Keamanan QR</p>
              </div>
            </div>
          </div>

          {/* Hero Right: Table Preview Mockup */}
          <div className="w-full lg:col-span-6">
            <InteractiveDashboard />
          </div>

        </div>
      </section>

      {/* Feature Sections */}
      <section className="border-t border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          
          <div className="mb-14 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Fitur Utama Sistem SIGAP
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 sm:text-base">
              Membantu merampingkan koordinasi pencatatan di lapangan hingga rujukan pelayanan medis lanjutan.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            
            {/* Card 1 */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 transition-all hover:bg-white hover:shadow-md">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-pmi">
                <Cpu className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-900">Klasifikasi Triage Otomatis</h3>
              <p className="mb-4 text-xs text-slate-500 leading-relaxed">
                Mengekstrak keluhan medis tertulis dari formulir relawan dan mengelompokkan prioritas penanganan (Merah, Kuning, Hijau) secara otomatis.
              </p>
              <div className="rounded-lg border border-slate-200 bg-white p-3 text-[11px] space-y-2">
                <div className="bg-slate-50 p-1.5 rounded border border-slate-100 italic text-slate-500">
                  &ldquo;Ibu menyusui mengeluh pusing hebat, bayi demam tinggi...&rdquo;
                </div>
                <div className="flex justify-between items-center bg-red-50 border border-red-100 px-2 py-1 rounded text-red-800 font-bold">
                  <span>Triage: MERAH</span>
                  <span className="text-[9px] bg-red-600 text-white px-1 rounded uppercase">Darurat</span>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 transition-all hover:bg-white hover:shadow-md">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <QrCode className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-900">Pencatatan Mandiri & QR</h3>
              <p className="mb-4 text-xs text-slate-500 leading-relaxed">
                Korban dapat mendaftar mandiri via HP dan mengunduh QR Code yang dienkripsi token HMAC untuk mempermudah pendaftaran posko kedatangan.
              </p>
              <div className="rounded-lg border border-slate-200 bg-white p-3 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <QrCode className="h-6 w-6 text-slate-700" />
                  <div>
                    <p className="font-bold text-slate-800">Token QR Terverifikasi</p>
                    <p className="text-[9px] text-slate-400">HMAC-SHA256 Valid</p>
                  </div>
                </div>
                <span className="h-5 w-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                  <Check className="h-3 w-3" />
                </span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 transition-all hover:bg-white hover:shadow-md">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-900">Monitoring Rujukan Medis</h3>
              <p className="mb-4 text-xs text-slate-500 leading-relaxed">
                Menyediakan dashboard pemantauan rumah sakit rujukan terdekat bagi korban berkategori prioritas Merah yang butuh penanganan instan.
              </p>
              <div className="rounded-lg border border-slate-200 bg-white p-3 text-[11px] space-y-1.5">
                <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded">
                  <span className="font-semibold text-slate-700">RSU Sardjito</span>
                  <span className="text-[9px] bg-red-100 text-red-800 px-1 rounded font-bold">Penuh</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded">
                  <span className="font-semibold text-slate-700">RS Bhayangkara</span>
                  <span className="text-[9px] bg-green-100 text-green-800 px-1 rounded font-bold">Ready</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Alur Kerja Section */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          
          <div className="mb-16 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Alur Operasional Lapangan
            </h2>
          </div>

          <div className="relative">
            {/* Center Line (Desktop Only) */}
            <div className="absolute left-6 top-0 h-full w-0.5 bg-slate-200 md:left-1/2 md:-ml-0.5"></div>
            
            <div className="space-y-12">
              
              {/* Step 1 */}
              <div className="relative flex flex-col md:flex-row md:items-center">
                <div className="md:w-1/2 md:pr-12 md:text-right">
                  <span className="inline-flex rounded-lg bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 mb-2">
                    Tahap 1
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 mb-1">Laporan Mandiri / Wawancara</h4>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Pengungsi mengisi form mandiri secara digital atau relawan melakukan wawancara langsung pada meja kedatangan posko bencana.
                  </p>
                </div>
                <div className="absolute left-1.5 top-0 z-10 flex h-9 w-9 items-center justify-center rounded-full border-4 border-slate-50 bg-pmi shadow md:left-1/2 md:-ml-4.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                </div>
                <div className="md:w-1/2 md:pl-12"></div>
              </div>

              {/* Step 2 */}
              <div className="relative flex flex-col md:flex-row-reverse md:items-center">
                <div className="md:w-1/2 md:pl-12 md:text-left">
                  <span className="inline-flex rounded-lg bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 mb-2">
                    Tahap 2
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 mb-1">Klasifikasi Otomatis</h4>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Data masukan diproses oleh sistem untuk mengukur tingkat kerentanan keluarga korban bencana dan menugaskan level Triage medis secara instan.
                  </p>
                </div>
                <div className="absolute left-1.5 top-0 z-10 flex h-9 w-9 items-center justify-center rounded-full border-4 border-slate-50 bg-pmi shadow md:left-1/2 md:-ml-4.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                </div>
                <div className="md:w-1/2 md:pr-12"></div>
              </div>

              {/* Step 3 */}
              <div className="relative flex flex-col md:flex-row md:items-center">
                <div className="md:w-1/2 md:pr-12 md:text-right">
                  <span className="inline-flex rounded-lg bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 mb-2">
                    Tahap 3
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 mb-1">Verifikasi QR Code</h4>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Saat korban tiba di posko pusat, admin memindai QR Code untuk memvalidasi dan mengimpor data terverifikasi ke basis data induk.
                  </p>
                </div>
                <div className="absolute left-1.5 top-0 z-10 flex h-9 w-9 items-center justify-center rounded-full border-4 border-slate-50 bg-pmi shadow md:left-1/2 md:-ml-4.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                </div>
                <div className="md:w-1/2 md:pl-12"></div>
              </div>

              {/* Step 4 */}
              <div className="relative flex flex-col md:flex-row-reverse md:items-center">
                <div className="md:w-1/2 md:pl-12 md:text-left">
                  <span className="inline-flex rounded-lg bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 mb-2">
                    Tahap 4
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 mb-1">Rujukan & Penanganan</h4>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Korban dengan triage prioritas Merah langsung diarahkan ke tenda medis utama posko atau didaftarkan rujukan ke rumah sakit terdekat.
                  </p>
                </div>
                <div className="absolute left-1.5 top-0 z-10 flex h-9 w-9 items-center justify-center rounded-full border-4 border-slate-50 bg-pmi shadow md:left-1/2 md:-ml-4.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                </div>
                <div className="md:w-1/2 md:pr-12"></div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-950 to-pmi-dark py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Mulai Pendataan Posko
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-sm text-slate-300">
            Gunakan kredensial relawan Anda untuk mengelola intake pengungsi atau akses formulir laporan mandiri korban.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-pmi px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-pmi-dark transition-colors sm:w-auto"
            >
              Masuk Sesi Relawan
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/mandiri/POSKO01"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-6 py-3.5 text-sm font-bold text-white ring-1 ring-white/20 hover:bg-white/20 transition-colors sm:w-auto"
            >
              Lapor Mandiri
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 text-center text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-xs">
          <Logo size={32} />
          <p className="max-w-md leading-relaxed text-slate-400">
            © 2026 SIGAP AI. Sistem Manajemen & Triage Pengungsi Palang Merah Indonesia (PMI).
          </p>
          <div className="h-px w-12 bg-slate-200" />
          <p className="text-[10px] text-slate-400 italic">
            Semua data, nama, dan kasus yang ditampilkan adalah simulasi kebutuhan demonstrasi aplikasi.
          </p>
        </div>
      </footer>
    </main>
  );
}
