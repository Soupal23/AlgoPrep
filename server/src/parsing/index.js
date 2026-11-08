import { extractText } from 'unpdf';
import mammoth from 'mammoth';
import { parseOffice } from 'officeparser';
import pdfParse from 'pdf-parse';
import { cleanText } from './cleaner.js';
import logger from '../utils/logger.js';

/**
 * Parses file buffers into structured sections preserving location (page/slide).
 *
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - File mimetype
 * @param {string} originalName - Original filename
 * @returns {Promise<{ sections: Array<{ page?: number, slide?: number, text: string }>, pageCount: number, charCount: number }>}
 */
export async function parseDocument(buffer, mimeType = '', originalName = '') {
  const extension = originalName.split('.').pop()?.toLowerCase() || '';

  // 1. PDF Documents
  if (mimeType.includes('pdf') || extension === 'pdf') {
    try {
      const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
      const { totalPages, text } = await extractText(uint8, { mergePages: false });
      if (Array.isArray(text) && text.length > 0) {
        const sections = text.map((pageText, idx) => ({
          page: idx + 1,
          text: cleanText(pageText)
        })).filter(s => s.text.length > 0);

        const charCount = sections.reduce((sum, s) => sum + s.text.length, 0);
        return {
          sections,
          pageCount: totalPages || sections.length,
          charCount
        };
      }
    } catch (unpdfErr) {
      logger.warn({ err: unpdfErr.message, fileName: originalName }, 'unpdf extraction failed, falling back to pdf-parse');
    }

    // Fallback: pdf-parse
    try {
      const parsed = await pdfParse(buffer);
      const cleaned = cleanText(parsed.text);
      return {
        sections: [{ page: 1, text: cleaned }],
        pageCount: parsed.numpages || 1,
        charCount: cleaned.length
      };
    } catch (fallbackErr) {
      logger.error({ err: fallbackErr.message, fileName: originalName }, 'PDF parsing failed');
      throw new Error(`Failed to parse PDF document: ${fallbackErr.message}`);
    }
  }

  // 2. Microsoft Word Documents (.docx)
  if (
    mimeType.includes('wordprocessingml') ||
    mimeType.includes('msword') ||
    extension === 'docx'
  ) {
    try {
      const { value } = await mammoth.extractRawText({ buffer });
      const cleaned = cleanText(value);
      // Split into logical pages/sections by double newline paragraphs if long
      const paragraphs = cleaned.split('\n\n').filter(p => p.trim().length > 0);
      const sections = paragraphs.map((para, idx) => ({
        page: Math.floor(idx / 4) + 1,
        text: para.trim()
      }));

      return {
        sections: sections.length > 0 ? sections : [{ page: 1, text: cleaned }],
        pageCount: Math.ceil((sections.length || 1) / 4),
        charCount: cleaned.length
      };
    } catch (docxErr) {
      logger.warn({ err: docxErr.message, fileName: originalName }, 'Mammoth docx parse failed, falling back to officeparser');
    }
  }

  // 3. PowerPoint Presentations (.pptx) & other office files
  if (
    mimeType.includes('presentationml') ||
    mimeType.includes('powerpoint') ||
    extension === 'pptx' ||
    extension === 'ppt' ||
    extension === 'docx'
  ) {
    try {
      const rawOutput = await parseOffice(buffer);
      let textString = '';
      if (typeof rawOutput === 'string') {
        textString = rawOutput;
      } else if (rawOutput && typeof rawOutput.toText === 'function') {
        textString = rawOutput.toText();
      } else if (rawOutput && typeof rawOutput.text === 'string') {
        textString = rawOutput.text;
      } else if (rawOutput) {
        textString = String(rawOutput);
      }

      const cleaned = cleanText(textString);

      // Separate slides if slide markers exist or by double newlines
      const rawSlides = cleaned.split(/(?:---+|Slide \d+:?|\n\n\n+)/i).filter(s => s.trim().length > 0);
      const sections = (rawSlides.length > 0 ? rawSlides : [cleaned]).map((slideText, idx) => ({
        slide: idx + 1,
        text: slideText.trim()
      }));

      return {
        sections,
        pageCount: sections.length,
        charCount: cleaned.length
      };
    } catch (officeErr) {
      logger.error({ err: officeErr.message, fileName: originalName }, 'Office presentation parsing failed');
      throw new Error(`Failed to parse presentation: ${officeErr.message}`);
    }
  }

  // 4. Plain Text & Markdown (Validate that unsupported binary files are rejected)
  const isTextLike =
    mimeType.startsWith('text/') ||
    mimeType.includes('plain') ||
    ['txt', 'md', 'markdown', 'csv', 'json'].includes(extension);

  if (!isTextLike) {
    throw new Error(`Unsupported file type '${originalName || mimeType}'. Allowed types: PDF, DOCX, PPTX, TXT, MD.`);
  }

  const textContent = cleanText(buffer.toString('utf-8'));
  const chunks = textContent.split(/(?:\n---+\n|\n#{1,2} )/).filter(t => t.trim().length > 0);

  const sections = (chunks.length > 0 ? chunks : [textContent]).map((t, idx) => ({
    page: idx + 1,
    text: t.trim()
  }));

  return {
    sections,
    pageCount: sections.length,
    charCount: textContent.length
  };
}

export default parseDocument;
