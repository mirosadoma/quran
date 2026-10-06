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
