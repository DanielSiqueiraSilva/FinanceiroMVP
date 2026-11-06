import { Platform } from 'react-native';

export type SoundName = 'click' | 'success' | 'message' | 'warning' | 'notice';

let context: AudioContext | null = null;
let lastAt = 0;

/** Tons curtos originais, sem arquivos externos, com volume deliberadamente baixo. */
export function playNotificationSound(name: SoundName): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined' ||
      typeof document === 'undefined' || document.visibilityState === 'hidden') return;
  // Evita sons repetidos em rajadas de eventos Realtime.
  if (Date.now() - lastAt < (name === 'click' ? 80 : 550)) return;
  lastAt = Date.now();

  try {
    const AudioCtor = window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    context ??= new AudioCtor();
    const audio = context;
    if (audio.state === 'suspended') void audio.resume().catch(() => {});
    const notes: Record<SoundName, [number, number][]> = {
      click: [[510, 0]],
      success: [[540, 0], [720, 0.10]],
      message: [[690, 0], [870, 0.12]],
      warning: [[440, 0], [340, 0.14]],
      notice: [[615, 0]],
    };
    const now = audio.currentTime + 0.01;
    notes[name].forEach(([frequency, offset]) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const start = now + offset;
      const duration = name === 'click' ? 0.055 : 0.10;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(name === 'warning' ? 0.014 : 0.018, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.01);
    });
  } catch {
    // Alguns navegadores não permitem áudio sem interação prévia.
  }
}
