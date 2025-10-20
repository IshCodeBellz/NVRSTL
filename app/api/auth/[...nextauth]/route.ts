import NextAuth from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";

// Force recompilation
const handler = NextAuth(authOptionsEnhanced);
export { handler as GET, handler as POST };
