"use client"
import { signIn } from "next-auth/react"

export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>ByteUP Painel</h1>
      <p>Gerencie seu bot em múltiplos servidores.</p>
      <button
        onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
        style={{ padding: "10px 20px", fontSize: "16px" }}
      >
        Entrar com Discord
      </button>
    </main>
  )
}