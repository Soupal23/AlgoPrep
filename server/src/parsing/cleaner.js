/**
 * Text Cleaner Utility
 * Normalizes extracted document text, cleans up hyphenated line wraps,
 * collapses excessive whitespace, and removes non-printable characters.
 */

export const cleanText = (rawText = '') => {
  if (typeof rawText !== 'string') return '';

  return (
    rawText
      // Remove null bytes and non-printable control characters (except newline, tab, carriage return)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Fix words split across lines by hyphens (e.g. "backpropaga-\ntion" -> "backpropagation")
      .replace(/(\b[a-zA-Z]+)-\r?\n([a-zA-Z]+\b)/g, '$1$2')
      // Normalize Windows CRLF to LF
      .replace(/\r\n/g, '\n')
      // Collapse 3 or more consecutive newlines into 2
      .replace(/\n{3,}/g, '\n\n')
      // Replace horizontal tab / non-breaking spaces with standard space
      .replace(/[\t\u00A0\u2000-\u200B]/g, ' ')
      // Collapse multiple consecutive horizontal spaces into one
      .replace(/[ ]{2,}/g, ' ')
      .trim()
  );
};

export default cleanText;
