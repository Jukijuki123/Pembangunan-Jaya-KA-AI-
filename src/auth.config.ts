import type { NextAuthConfig } from "next-auth";

/**
 * Konfigurasi Auth.js yang AMAN untuk Edge runtime (middleware).
 * TIDAK mengimpor Prisma/bcrypt di sini — provider Credentials (yang butuh DB)
 * ditambahkan di src/auth.ts yang berjalan di Node runtime.
 *
 * Session pakai strategi JWT → role disimpan di token, bisa dibaca middleware
 * tanpa query database (penting untuk serverless free-tier).
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [], // diisi di src/auth.ts
  callbacks: {
    // Sisipkan id/username/role ke token saat login.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? token.sub ?? "";
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    // Ekspos field tersebut ke session yang dipakai di server & client.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as "ADMIN" | "RELAWAN";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
