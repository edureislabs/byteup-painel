import Link from "next/link"

export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>ByteUP Painel</h1>
      <p>Gerencie seu bot em múltiplos servidores.</p>
      <Link href="/api/auth/signin/discord">
        <button style={{ padding: "10px 20px", fontSize: "16px" }}>
          Entrar com Discord
        </button>
      </Link>
    </main>
  )
}