import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "./authOptionsEnhanced";
import { prisma } from "./prisma";

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function ensureAdmin() {
  const session = await getServerSession(authOptionsEnhanced);
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.isAdmin) return null;
  return user;
}
