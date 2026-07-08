import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function transcribeAudio(audioFilePath) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const audioBuffer = fs.readFileSync(audioFilePath);
    const base64Audio = audioBuffer.toString('base64');

    const ext = path.extname(audioFilePath).toLowerCase();
    const mimeTypes = {
      '.webm': 'audio/webm',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      '.flac': 'audio/flac',
    };
    const mimeType = mimeTypes[ext] || 'audio/webm';

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Audio,
        },
      },
      {
        text: 'Transcribe this audio recording exactly as spoken. Only output the transcription text, nothing else. Do not include any commentary, labels, or formatting instructions.',
      },
    ]);

    const response = await result.response;
    return response.text().trim();
  } catch (err) {
    console.error('Transcription error:', err);
    return null;
  }
}

export async function generateNarrative(transcript, allChapters, book) {
  if (!transcript) return null;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Build context from other chapters
    const otherChaptersContext = allChapters
      .filter(ch => ch.original_transcript && ch.id !== allChapters.find(c => c.original_transcript === transcript)?.id)
      .map(ch => `"${ch.title}": ${ch.original_transcript}`)
      .join('\n\n');

    const prompt = `You are a skilled ghostwriter helping someone turn their spoken stories into a compelling autobiography/memoir.

The book is titled "${book.title}" by ${book.author}.

${otherChaptersContext ? `Here are other chapters from this book for voice/style reference:\n${otherChaptersContext}\n\n` : ''}

Here is the spoken story transcript to transform into a chapter:
"${transcript}"

Instructions:
- Transform this spoken story into well-written prose that reads like a chapter from a memoir or autobiography
- Maintain the original storyteller's voice, personality, and perspective (first person)
- Keep all the key details and events from the original story
- Use Google Search to find relevant historical events, cultural moments, or world events that were happening around the time period mentioned in the story, and weave them naturally into the narrative to provide context and richness
- Create smooth transitions and well-structured paragraphs
- Add sensory details and emotional depth while staying true to the original tone
- If other chapters are provided, ensure consistency in voice and style across the narrative
- Only output the chapter text. Do not include any titles, headers, chapter numbers, commentary, or meta-text about the writing process.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (err) {
    console.error('Narrative generation error:', err);
    return null;
  }
}
