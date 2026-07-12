import { useState, useEffect } from 'react';

export function useSound() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('arcade_sound_enabled');
    return saved === null ? true : saved === 'true';
  });

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('arcade_sound_enabled', String(next));
      return next;
    });
  };

  const playSynthesizedSound = (type: 'click' | 'flip' | 'success' | 'error' | 'levelUp' | 'victory' | 'move') => {
    if (!soundEnabled) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      switch (type) {
        case 'click': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(600, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);

          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

          osc.start();
          osc.stop(ctx.currentTime + 0.1);
          break;
        }
        case 'move': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(300, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.08);

          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

          osc.start();
          osc.stop(ctx.currentTime + 0.08);
          break;
        }
        case 'flip': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(250, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.15);

          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

          osc.start();
          osc.stop(ctx.currentTime + 0.15);
          break;
        }
        case 'success': {
          // Play arpeggio
          const now = ctx.currentTime;
          const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
          notes.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + index * 0.08);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.12, now + index * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.25);

            osc.start(now + index * 0.08);
            osc.stop(now + index * 0.08 + 0.25);
          });
          break;
        }
        case 'error': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(130, ctx.currentTime);
          osc.frequency.setValueAtTime(110, ctx.currentTime + 0.08);

          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

          osc.start();
          osc.stop(ctx.currentTime + 0.2);
          break;
        }
        case 'levelUp': {
          const now = ctx.currentTime;
          // Upward sci-fi sweep
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'triangle';
          osc2.type = 'sine';

          osc1.frequency.setValueAtTime(200, now);
          osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.6);

          osc2.frequency.setValueAtTime(300, now);
          osc2.frequency.exponentialRampToValueAtTime(1800, now + 0.6);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

          osc1.start();
          osc2.start();
          osc1.stop(now + 0.6);
          osc2.stop(now + 0.6);
          break;
        }
        case 'victory': {
          // Play majestic fanfaric chord
          const now = ctx.currentTime;
          const rootNotes = [196.00, 261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // G3, C4, E4, G4, C5, E5, G5
          rootNotes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.06 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.6);

            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.6);
          });
          break;
        }
      }
    } catch (e) {
      console.warn('Audio synthesis failed', e);
    }
  };

  return {
    soundEnabled,
    toggleSound,
    play: playSynthesizedSound,
  };
}
