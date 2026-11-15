// Vibração e sons curtos (Web Audio) para dar retorno ao toque, sem arquivos de áudio.

// Feedback Háptico e Sons Sintetizados via Web Audio API
export const feedbackSensorial = {
  vibrar: (padrao = 15) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(padrao)
      } catch (e) {
        console.warn('Vibração indisponível:', e)
      }
    }
  },
  ctx: null,
  tocarTom: function (frequencia = 440, duracao = 0.08, tipo = 'sine') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      // Um único AudioContext reutilizado (criar um por toque esgota o limite do navegador e gasta memória).
      if (!this.ctx || this.ctx.state === 'closed') this.ctx = new AudioCtx()
      const ctx = this.ctx
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = tipo
      osc.frequency.setValueAtTime(frequencia, ctx.currentTime)
      gain.gain.setValueAtTime(0.05, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duracao)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + duracao)
    } catch (e) {
      console.warn('Áudio sintético indisponível:', e)
    }
  },
  toqueSuave: function () {
    this.vibrar(12)
    this.tocarTom(520, 0.05)
  },
  gpsSucesso: function () {
    this.vibrar([30, 40, 30])
    this.tocarTom(660, 0.08)
    setTimeout(() => this.tocarTom(880, 0.1), 80)
  },
  envioSucesso: function () {
    this.vibrar([50, 70, 120])
    this.tocarTom(587, 0.08)
    setTimeout(() => this.tocarTom(880, 0.14), 90)
  },
  alertaErro: function () {
    this.vibrar(150)
    this.tocarTom(220, 0.15, 'triangle')
  }
}
