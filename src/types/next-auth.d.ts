import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

// Augmentasi tipe agar `session.user.role` & `session.user.id` bertipe kuat.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    username: string;
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: Role;
  }
}
