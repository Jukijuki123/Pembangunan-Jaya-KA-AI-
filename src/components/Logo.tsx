import Image from "next/image";

/**
 * Logo SIGAP AI — gambar dari /public/logo.png.
 * `withWordmark` menampilkan teks "SIGAP AI" di samping logo.
 */
export function Logo({
  size = 32,
  withWordmark = false,
  className = "",
  dark = false,
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
  dark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src="/logo-no-background.png"
        alt="Logo SIGAP AI"
        width={size}
        height={size}
        priority
        className="object-contain"
      />
      {withWordmark && (
        <span className="flex flex-col leading-none">
          <span className={`text-base font-black tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>
            SIGAP <span className="text-pmi">AI</span>
          </span>
        </span>
      )}
    </span>
  );
}
