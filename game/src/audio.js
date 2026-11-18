// audio.js — all SOL BAY sounds are synthesized with WebAudio oscillators
// and filtered noise. No external audio files are loaded.
export function createAudio() {
  const audio = {
    ctx: null, master: null, engineOsc: null, engineGain: null,
    sirenTimer: null, musicTimer: null, musicStep: 0, muted: false,
  };

  audio.init = () => {
    if (audio.ctx) { if (audio.ctx.state === 'suspended') audio.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      audio.ctx = new AC();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.35;
      audio.master.connect(audio.ctx.destination);
      // Engine hum: two detuned sawtooth oscillators through a low-pass.
      audio.engineOsc = audio.ctx.createOscillator();
      audio.engineOsc.type = 'sawtooth';
      audio.engineOsc.frequency.value = 50;
      const engineOsc2 = audio.ctx.createOscillator();
      engineOsc2.type = 'square';
      engineOsc2.frequency.value = 25;
      audio.engineGain = audio.ctx.createGain();
      audio.engineGain.gain.value = 0;
      const filter = audio.ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 400;
      audio.engineOsc.connect(filter); engineOsc2.connect(filter);
      filter.connect(audio.engineGain); audio.engineGain.connect(audio.master);
      audio.engineOsc.start(); engineOsc2.start();
      audio.engineOsc2 = engineOsc2;
    } catch (err) { audio.ctx = null; }
  };

  audio.setEngine = (speedNorm, on) => {
    if (!audio.ctx || !audio.engineGain) return;
    const t = audio.ctx.currentTime;
    audio.engineGain.gain.setTargetAtTime(on ? 0.05 + speedNorm * 0.09 : 0, t, 0.1);
    const f = 45 + speedNorm * 160;
    audio.engineOsc.frequency.setTargetAtTime(f, t, 0.08);
    audio.engineOsc2.frequency.setTargetAtTime(f * 0.5, t, 0.08);
  };

  audio.beep = (freq, dur, type, vol) => {
    if (!audio.ctx) return;
    const t = audio.ctx.currentTime;
    const o = audio.ctx.createOscillator(); const g = audio.ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(audio.master);
    o.start(t); o.stop(t + dur + 0.02);
  };

  audio.noiseBurst = (dur, vol, filterFreq) => {
    if (!audio.ctx) return;
    const t = audio.ctx.currentTime;
    const len = Math.floor(audio.ctx.sampleRate * dur);
    const buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audio.ctx.createBufferSource(); src.buffer = buf;
    const f = audio.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq || 1200;
    const g = audio.ctx.createGain(); g.gain.value = vol || 0.4;
    src.connect(f); f.connect(g); g.connect(audio.master);
    src.start(t);
  };

  audio.gunshot = () => audio.noiseBurst(0.14, 0.5, 2500);
  audio.punch = () => audio.noiseBurst(0.08, 0.3, 500);
  audio.pickup = () => { audio.beep(660, 0.1, 'sine', 0.25); setTimeout(() => audio.beep(990, 0.16, 'sine', 0.25), 90); };
  audio.cash = () => { audio.beep(880, 0.09, 'triangle', 0.25); setTimeout(() => audio.beep(1174, 0.09, 'triangle', 0.25), 80); setTimeout(() => audio.beep(1568, 0.18, 'triangle', 0.25), 160); };
  audio.horn = () => audio.beep(370, 0.25, 'square', 0.15);
  audio.sirenBlip = () => { audio.beep(700, 0.18, 'sine', 0.12); setTimeout(() => audio.beep(950, 0.18, 'sine', 0.12), 180); };

  // Two-tone police siren while wanted level is above zero.
  audio.startSiren = () => {
    if (!audio.ctx || audio.sirenTimer) return;
    let high = false;
    audio.sirenTimer = setInterval(() => {
      if (audio.muted) return;
      audio.beep(high ? 950 : 700, 0.32, 'sine', 0.07);
      high = !high;
    }, 340);
  };
  audio.stopSiren = () => { if (audio.sirenTimer) { clearInterval(audio.sirenTimer); audio.sirenTimer = null; } };

  // Simple sunny-day music loop: a cheerful pentatonic walk, scheduled notes.
  const MELODY = [523, 587, 659, 784, 880, 784, 659, 587, 523, 0, 659, 784, 659, 587, 523, 0];
  audio.startMusic = () => {
    if (!audio.ctx || audio.musicTimer) return;
    audio.musicTimer = setInterval(() => {
      if (audio.muted || !audio.ctx) return;
      const n = MELODY[audio.musicStep % MELODY.length];
      audio.musicStep++;
      if (n) audio.beep(n, 0.22, 'triangle', 0.06);
      if (audio.musicStep % 4 === 0) audio.beep(262, 0.3, 'sine', 0.05);
    }, 260);
  };
  audio.stopMusic = () => { if (audio.musicTimer) { clearInterval(audio.musicTimer); audio.musicTimer = null; } };
  audio.toggleMute = () => {
    audio.muted = !audio.muted;
    if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.35;
    return audio.muted;
  };
  return audio;
}
