import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = session?.user?.id;
  if (!uid) redirect("/login?callbackUrl=/admin");

  // Require admin
  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { isAdmin: true, mfaEnabled: true },
  });
  if (!user?.isAdmin) redirect("/");

  // Enforce MFA for admins – send to setup if not enabled
  if (!user.mfaEnabled) {
    redirect("/account/security/mfa-setup?return=/admin");
  }

  return <>{children}</>;
}


