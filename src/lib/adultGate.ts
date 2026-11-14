import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ADULT_COOKIE } from "@/lib/listingShared";

/**
 * Pode ver servidores +18?
 * Precisa: estar logado com o Discord E ter confirmado "tenho 18 anos"
 * (cookie gravado pela página ao clicar em confirmar).
 *
 * Observação: não existe como confirmar a idade real de alguém pelo
 * Discord; isto é uma barreira de confirmação, como em outros sites.
 */
export async function getViewer() {
  const session = await getServerSession(authOptions);
  const store = await cookies();
  const userId = session?.user?.id ?? null;
  const confirmed18 = store.get(ADULT_COOKIE)?.value === "1";

  return {
    userId,
    loggedIn: Boolean(userId),
    confirmed18,
    canSeeAdult: Boolean(userId) && confirmed18,
  };
}
