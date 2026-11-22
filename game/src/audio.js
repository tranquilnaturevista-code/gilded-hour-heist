// audio.js — one clear job: all sound, synthesized with WebAudio, no files.
// A soft music-box arpeggio under play, a blip for loot, a rising sting when
// spotted, a low pulse while the alarm climbs. Nothing loads over the network.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let musicTimer = null;
  let alarmOsc = null;
  let alarmGain = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    const ac = ensure();
    if (!ac || muted) return;
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // Music-box arpeggio, one quiet bar looping while the heist runs.
  const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  let step = 0;
  function startMusic() {
    if (musicTimer || muted) return;
    musicTimer = window.setInterval(() => {
      if (muted) return;
      const note = SCALE[step % SCALE.length];
      tone(note, 0.9, 'sine', 0.045);
      if (step % 4 === 2) tone(note / 2, 1.2, 'triangle', 0.03);
      step += 1;
    }, 420);
  }
  function stopMusic() {
    if (musicTimer) {
      window.clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  // A low pulsing drone whose rate follows the alarm meter (0..100).
  function setAlarmLevel(level) {
    const ac = ensure();
    if (!ac) return;
    if (level <= 4) {
      if (alarmOsc) {
        try { alarmOsc.stop(); } catch { /* already stopped */ }
        alarmOsc = null;
        alarmGain = null;
      }
      return;
    }
    if (!alarmOsc) {
      alarmOsc = ac.createOscillator();
      alarmGain = ac.createGain();
      alarmOsc.type = 'sawtooth';
      alarmOsc.frequency.value = 55;
      alarmGain.gain.value = 0;
      const filter = ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 220;
      alarmOsc.connect(filter);
      filter.connect(alarmGain);
      alarmGain.connect(ac.destination);
      alarmOsc.start();
    }
    const rate = 0.4 + (level / 100) * 2.2;
    alarmOsc.frequency.setValueAtTime(55 + (level / 100) * 40, ac.currentTime);
    alarmGain.gain.setTargetAtTime(muted ? 0 : 0.02 + (level / 100) * 0.05, ac.currentTime, 0.1);
    void rate;
  }

  return {
    unlock() { ensure(); },
    toggleMute() {
      muted = !muted;
      if (muted) stopMusic();
      return muted;
    },
    get muted() { return muted; },
    startMusic,
    stopMusic,
    setAlarmLevel,
    pickup() { tone(880, 0.16, 'sine', 0.09); tone(1318.5, 0.22, 'sine', 0.07, 0.07); },
    coin() { tone(1568, 0.1, 'triangle', 0.07); tone(2093, 0.14, 'triangle', 0.05, 0.05); },
    smoke() { tone(220, 0.5, 'sine', 0.06, 0, 110); },
    emp() { tone(1200, 0.35, 'square', 0.04, 0, 180); },
    spotted() { tone(392, 0.28, 'sawtooth', 0.08); tone(311, 0.34, 'sawtooth', 0.08, 0.12); },
    caught() { tone(220, 0.7, 'sawtooth', 0.1, 0, 55); },
    vault() { tone(659.25, 0.12, 'sine', 0.08); tone(987.77, 0.2, 'sine', 0.08, 0.1); },
    win() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.4, 'sine', 0.09, i * 0.13));
    },
    click() { tone(660, 0.06, 'sine', 0.05); },
  };
}
