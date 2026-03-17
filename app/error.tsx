"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Algo deu errado</h2>
        <p className="text-gray-500 text-sm mb-6">Ocorreu um erro inesperado.</p>
        <button
          onClick={reset}
          className="bg-[#1AABDB] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1594bf] transition"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}