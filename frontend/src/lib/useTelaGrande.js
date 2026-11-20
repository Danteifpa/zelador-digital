import { useEffect, useState } from 'react'

/** True a partir do breakpoint lg do Tailwind (1024px). Só a gestão usa; o celular nunca monta o painel lateral. */
export default function useTelaGrande(consulta = '(min-width: 1024px)') {
  const [grande, setGrande] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(consulta).matches)
  useEffect(() => {
    if (!window.matchMedia) return undefined
    const lista = window.matchMedia(consulta)
    const aoMudar = (e) => setGrande(e.matches)
    lista.addEventListener('change', aoMudar)
    return () => lista.removeEventListener('change', aoMudar)
  }, [consulta])
  return grande
}
