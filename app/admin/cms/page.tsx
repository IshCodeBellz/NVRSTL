import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { CMSManagement } from "@/components/admin/cms/CMSManagement";

export default async function CMSPage() {
  const session = await getServerSession(authOptionsEnhanced);

  // Check if user is authenticated
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin/cms");
  }

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    redirect("/");
  }

  return <CMSManagement />;
}
