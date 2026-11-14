import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { presignGet, r2Configured } from "@/lib/r2";

/**
 * Download de um arquivo comprado: confere se a pessoa logada tem um
 * pedido PAGO com esse produto e redireciona para um link que expira em 1 h.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL || "http://localhost:3000"));
  if (!/^[0-9a-f-]{36}$/i.test(fileId) || !r2Configured()) return new NextResponse("Arquivo não encontrado", { status: 404 });

  const file = await prisma.storeProductFile.findUnique({ where: { id: fileId } });
  if (!file || file.status !== "ready") return new NextResponse("Arquivo não encontrado", { status: 404 });

  const owns =
    isAdmin(userId) ||
    (await prisma.storeOrderItem.count({
      where: { productId: file.productId, order: { userId, status: "paid" } },
    })) > 0;
  if (!owns) return new NextResponse("Você não comprou este produto.", { status: 403 });

  const url = await presignGet(file.key, { fileName: file.fileName, expiresIn: 3600 });
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "no-store" } });
}
