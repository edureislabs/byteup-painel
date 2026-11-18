
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { presignGet, r2Configured } from "@/lib/r2";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;

  if (
    !/^[0-9a-f-]{36}$/i.test(fileId) ||
    !r2Configured()
  ) {
    return new NextResponse("Arquivo não encontrado", {
      status: 404,
    });
  }

  const file = await prisma.storeProductFile.findUnique({
    where: { id: fileId },
    include: {
      product: {
        select: {
          id: true,
          active: true,
          priceCents: true,
          kind: true,
        },
      },
    },
  });

  if (
    !file ||
    file.status !== "ready" ||
    !file.product.active ||
    file.product.kind !== "download"
  ) {
    return new NextResponse("Arquivo não encontrado", {
      status: 404,
    });
  }

  // Produto gratuito: não exige login nem cria pedido.
  if (file.product.priceCents > 0) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.redirect(
        new URL(
          "/login",
          process.env.NEXTAUTH_URL || "http://localhost:3000"
        )
      );
    }

    const owns =
      isAdmin(userId) ||
      (await prisma.storeOrderItem.count({
        where: {
          productId: file.productId,
          order: {
            userId,
            status: "paid",
          },
        },
      })) > 0;

    if (!owns) {
      return new NextResponse(
        "Você não comprou este produto.",
        { status: 403 }
      );
    }
  }

  // Gera o link temporário do Cloudflare R2.
  const url = await presignGet(file.key, {
    fileName: file.fileName,
    expiresIn: 3600,
  });

  // Conta somente downloads autorizados.
  await prisma.storeProduct.update({
    where: { id: file.productId },
    data: {
      downloadCount: {
        increment: 1,
      },
    },
  });

  return NextResponse.redirect(url, {
    status: 302,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
