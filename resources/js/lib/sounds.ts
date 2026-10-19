let context: AudioContext | null = null;

function audio(): AudioContext | null {
    try {
        context ??= new AudioContext();

        if (context.state === 'suspended') {
            void context.resume().catch(() => undefined);
        }

        return context;
    } catch {
        return null;
    }
}

/**
 * Browsers play sounds only after the user has touched the page: call it from a click (the microphone
 * button) so the alerts can be heard later.
 */
export function prepareSounds(): void {
    audio();
}

/**
 * A short falling tone telling the reader a mistake was heard.
 */
export function playMistakeSound(): void {
    const sound = audio();

    if (!sound) {
        return;
    }

    const now = sound.currentTime;

    [
        [740, 0],
        [494, 0.13],
    ].forEach(([frequency, delay]) => {
        const tone = sound.createOscillator();
        const volume = sound.createGain();

        tone.type = 'triangle';
        tone.frequency.value = frequency;
        volume.gain.setValueAtTime(0.0001, now + delay);
        volume.gain.exponentialRampToValueAtTime(0.35, now + delay + 0.015);
        volume.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.2);
        tone.connect(volume);
        volume.connect(sound.destination);
        tone.start(now + delay);
        tone.stop(now + delay + 0.22);
    });
}

/**
 * A short rising chime: the student is called, or their turn is next.
 */
export function playChime(): void {
    const sound = audio();

    if (!sound) {
        return;
    }

    const now = sound.currentTime;

    [
        [523, 0],
        [659, 0.14],
        [784, 0.28],
    ].forEach(([frequency, delay]) => {
        const tone = sound.createOscillator();
        const volume = sound.createGain();

        tone.type = 'sine';
        tone.frequency.value = frequency;
        volume.gain.setValueAtTime(0.0001, now + delay);
        volume.gain.exponentialRampToValueAtTime(0.3, now + delay + 0.02);
        volume.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.35);
        tone.connect(volume);
        volume.connect(sound.destination);
        tone.start(now + delay);
        tone.stop(now + delay + 0.4);
    });
}

/**
 * An alarm bell that keeps ringing until the returned function is called.
 */
export function startAlarmSound(): () => void {
    const sound = audio();

    if (!sound) {
        return () => undefined;
    }

    let stopped = false;
    let timer = 0;

    const ring = () => {
        if (stopped) {
            return;
        }

        const now = sound.currentTime;

        [0, 0.18, 0.36, 0.54].forEach((delay, index) => {
            const tone = sound.createOscillator();
            const volume = sound.createGain();

            tone.type = 'square';
            tone.frequency.value = index % 2 === 0 ? 880 : 1175;
            volume.gain.setValueAtTime(0.0001, now + delay);
            volume.gain.exponentialRampToValueAtTime(0.12, now + delay + 0.01);
            volume.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.15);
            tone.connect(volume);
            volume.connect(sound.destination);
            tone.start(now + delay);
            tone.stop(now + delay + 0.17);
        });

        timer = window.setTimeout(ring, 1600);
    };

    ring();

    return () => {
        stopped = true;
        window.clearTimeout(timer);
    };
}
