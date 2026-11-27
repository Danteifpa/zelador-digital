import { MARCA } from '../lib/marca'

/**
 * Marca "Rua Viva" (nome vem de lib/marca.js), direção Rota: símbolo (rua em curva, com o pino) + nome em dois pesos.
 * O símbolo é SVG inline para ficar nítido em qualquer tamanho e funcionar offline.
 */
export function SimboloMarca({ size = 32, className = '', fundo = '#1D4ED8', traco = '#FFFFFF', acento = '#F59E0B', titulo }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      <rect x="4" y="4" width="92" height="92" rx="24" fill={fundo} />
      <path d="M22 28 H50 C68 28 68 50 50 50 C32 50 32 72 50 72 H74" fill="none" stroke={traco} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 28 H50 C68 28 68 50 50 50 C32 50 32 72 50 72 H74" fill="none" stroke={fundo} strokeWidth="3" strokeDasharray="6 7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="76" cy="72" r="11" fill={acento} />
      <circle cx="76" cy="72" r="4.5" fill={fundo} />
    </svg>
  )
}

/** Logotipo horizontal. `escuro` para uso sobre fundo escuro. */
export default function Logotipo({ size = 30, escuro = false, className = '', compacto = false }) {
  const texto = Math.round(size * 0.78)
  const palavras = MARCA.nome.split(' ')
  const fim = palavras.pop()
  const inicio = palavras.join(' ')
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <SimboloMarca size={size} fundo={escuro ? '#FFFFFF' : '#1D4ED8'} traco={escuro ? '#1D4ED8' : '#FFFFFF'} />
      <span className="font-marca leading-none tracking-tight whitespace-nowrap" style={{ fontSize: texto }}>
        {/* Palavras iniciais em peso normal; a última em destaque (ex.: Rua **Viva**). */}
        <span className={`font-normal ${escuro ? 'text-white' : 'text-slate-900'} ${compacto ? 'hidden min-[360px]:inline' : ''}`}>{inicio}</span>{inicio ? ' ' : ''}
        <span className={`font-extrabold ${escuro ? 'text-white' : 'text-blue-700'}`}>{fim}</span>
      </span>
    </span>
  )
}
