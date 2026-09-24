"use client"
import { useEffect } from "react"
import { signIn } from "next-auth/react"

export default function LoginPage() {
  useEffect(() => {
    signIn("discord", { callbackUrl: "/dashboard" })
  }, [])

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <p>Redirecionando para o Discord...</p>
    </main>
  )
}