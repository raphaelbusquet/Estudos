# Karaokê

Web app (PWA) de karaokê: toca o instrumental, mostra a letra estilo teleprompter
e grava **áudio** ou **vídeo** (voz + instrumental mixados) direto no navegador,
inclusive no Safari do iPhone.

## Rodando

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes do parser de letras
npm run build
```

> Microfone/câmera exigem **HTTPS** (ou `localhost`). Para testar no celular,
> faça deploy (ex.: Vercel com *Root Directory* = `karaoke`) e abra a URL no Safari.
> "Compartilhar → Adicionar à Tela de Início" instala como app.

## Como usar

1. Escolha o arquivo do instrumental e cole a letra — ou clique em **Testar com música demo**
   (instrumental gerado no próprio navegador, livre de direitos).
2. Letra em formato **LRC** (`[mm:ss.xx] verso`) acompanha linha a linha, com preenchimento
   progressivo. Texto sem timestamps rola em velocidade constante pela duração da faixa.
3. Escolha 🎤 Áudio ou 🎥 Vídeo, **Gravar** → contagem 3‑2‑1 → a música começa do início.
4. Ao final: ouvir/assistir, baixar ou compartilhar (Web Share API no iOS/Android).

## Arquitetura

```
src/
  lib/
    lyrics.ts          parser LRC (multi-timestamp, [offset:]) + busca binária da linha ativa
    KaraokeEngine.ts   grafo Web Audio + MediaRecorder (framework-agnostic)
    media.ts           escolha de mime/codec por navegador (MP4 no Safari, WebM no resto)
    demoTrack.ts       instrumental demo via OfflineAudioContext → WAV
  hooks/usePlaybackTime.ts   relógio do <audio> via requestAnimationFrame
  components/                Setup, Stage, Teleprompter, MixPanel, RecordingResult
```

Grafo de áudio:

```
<audio> ─┬─ monitorGain ─────────────────────▶ fone/alto-falante
         └─ delay(latência) ─ trackMixGain ─┐
mic ─────────────────────────── voiceGain ──┴─▶ MediaStreamDestination ─┐
câmera (modo vídeo) ────────────────────────────────────────────────────┴─▶ MediaRecorder
```

- O microfone **nunca** vai para a saída (sem microfonia).
- `echoCancellation/noiseSuppression/autoGainControl` desligados: são pensados para chamadas e
  degradam voz cantada. Por isso **fone de ouvido** é recomendado.
- **Compensação de latência**: a voz chega ao mic atrasada em relação ao instrumental enviado à
  saída; o instrumental é atrasado na mixagem pelo mesmo valor (ajustável em "Ajustes de áudio").

## Limitações conhecidas / próximos passos

- Latência de áudio no browser é maior que em nativo (AVAudioEngine); a compensação é manual.
- A letra não é "queimada" no vídeo gravado (dá para fazer compondo câmera + letra num `<canvas>`
  e gravando `canvas.captureStream()`).
- Sem catálogo de músicas: instrumental e letra são fornecidos pelo usuário.
- Service worker/offline não implementado (manifest + meta tags já permitem instalar na tela inicial).
