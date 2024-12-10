import Service from '@ember/service';
import { AssemblyAI } from 'assemblyai';

export default class TextToSpeechService extends Service {
  constructor() {
    super(...arguments);
    this.client = new AssemblyAI({
      apiKey: '41d7fa9deb7a4349ad19e0d6549e38f0',
    });
  }

  async getDuration(blob) {
    const context = new AudioContext();
    const buffer = await blob.arrayBuffer();
    const audio = await context.decodeAudioData(buffer);
    context.close();
    return audio.duration;
  }

  async transcribe(audioUrl, audioBlob) {
    // API is limited, we don't want people transcribing massive files
    const maxDurationSeconds = 120;
    if (this.getDuration(audioBlob) > maxDurationSeconds) {
      throw `Audio duration too long! Must be under ${maxDurationSeconds} seconds.`;
    }

    // Request parameters
    const data = {
      audio: audioUrl,
      speech_model: 'nano',
      language_detection: true,
    };

    // Transcribe
    const transcript = await this.client.transcripts.transcribe(data);

    if (transcript.status === 'error') {
      console.error(`Transcription failed: ${transcript.error}`);
      throw `Failed to transcribe!`;
    }

    return transcript.text;
  }
}
