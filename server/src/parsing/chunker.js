import crypto from 'crypto';

/**
 * Splits document sections into semantic chunks preserving source citation metadata.
 *
 * @param {Array<{ page?: number, slide?: number, heading?: string, text: string }>} sections
 * @param {Object} options
 * @param {number} options.maxChars - Maximum characters per chunk (default ~2000, ~500-600 tokens)
 * @param {number} options.overlapChars - Character overlap between chunks (default ~300)
 * @returns {Array<{ text: string, tokenCount: number, location: { page?: number, slide?: number, heading?: string }, hash: string }>}
 */
export function chunkSections(sections, options = {}) {
  const maxChars = options.maxChars || 2000;
  const overlapChars = options.overlapChars || 300;
  const minChars = 25;

  const chunks = [];
  const seenHashes = new Set();

  for (const section of sections) {
    const rawText = (section.text || '').trim();
    if (rawText.length < minChars) continue;

    const location = {
      page: section.page || null,
      slide: section.slide || null,
      heading: section.heading || null
    };

    // If section fits comfortably within one chunk, emit directly
    if (rawText.length <= maxChars) {
      const hash = crypto.createHash('sha256').update(rawText).digest('hex');
      if (!seenHashes.has(hash)) {
        seenHashes.add(hash);
        chunks.push({
          text: rawText,
          tokenCount: Math.ceil(rawText.length / 4),
          location,
          hash
        });
      }
      continue;
    }

    // Split recursively by paragraphs, then sentences
    const paragraphs = rawText.split('\n\n').filter(p => p.trim().length > 0);
    let currentChunk = '';

    for (const para of paragraphs) {
      if ((currentChunk + '\n\n' + para).length <= maxChars) {
        currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;
      } else {
        if (currentChunk.length >= minChars) {
          const hash = crypto.createHash('sha256').update(currentChunk).digest('hex');
          if (!seenHashes.has(hash)) {
            seenHashes.add(hash);
            chunks.push({
              text: currentChunk,
              tokenCount: Math.ceil(currentChunk.length / 4),
              location,
              hash
            });
          }
        }

        // Handle paragraphs longer than maxChars by sliding sentence window
        if (para.length > maxChars) {
          const sentences = para.split(/(?<=[.?!])\s+/);
          let sentenceChunk = '';

          for (const s of sentences) {
            if ((sentenceChunk + ' ' + s).length <= maxChars) {
              sentenceChunk = sentenceChunk ? `${sentenceChunk} ${s}` : s;
            } else {
              if (sentenceChunk.length >= minChars) {
                const hash = crypto.createHash('sha256').update(sentenceChunk).digest('hex');
                if (!seenHashes.has(hash)) {
                  seenHashes.add(hash);
                  chunks.push({
                    text: sentenceChunk,
                    tokenCount: Math.ceil(sentenceChunk.length / 4),
                    location,
                    hash
                  });
                }
              }
              // Carry over overlap from previous sentences
              sentenceChunk = sentenceChunk.slice(-overlapChars) + ' ' + s;
            }
          }
          currentChunk = sentenceChunk;
        } else {
          // Carry over overlap
          currentChunk = currentChunk.slice(-overlapChars) + '\n\n' + para;
        }
      }
    }

    if (currentChunk.trim().length >= minChars) {
      const hash = crypto.createHash('sha256').update(currentChunk.trim()).digest('hex');
      if (!seenHashes.has(hash)) {
        seenHashes.add(hash);
        chunks.push({
          text: currentChunk.trim(),
          tokenCount: Math.ceil(currentChunk.length / 4),
          location,
          hash
        });
      }
    }
  }

  return chunks;
}

export default chunkSections;
