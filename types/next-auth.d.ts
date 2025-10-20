import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
      emailVerified: boolean;
    } & DefaultSession["user"];
  }

  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   */
  interface User extends DefaultUser {
    id: string;
    isAdmin: boolean;
    emailVerified: boolean;
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    id: string;
    isAdmin: boolean;
    emailVerified: boolean;
    email: string;
    name?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    id: string;
    isAdmin: boolean;
    emailVerified: boolean;
    sessionStart: number;
  }
}
