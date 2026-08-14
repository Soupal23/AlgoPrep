import pdfParse from 'pdf-parse';

export const extractTextFromBuffer = async (fileBuffer, mimetype, originalname) => {
  let text = '';

  const isPdf = mimetype === 'application/pdf' || originalname.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    try {
      const parsed = await pdfParse(fileBuffer);
      text = parsed.text || '';
    } catch (err) {
      throw new Error(`Failed to parse PDF content: ${err.message}`);
    }
  } else {
    text = fileBuffer.toString('utf-8');
  }

  // Sanitize and trim whitespace
  text = text.replace(/\r\n/g, '\n').trim();

  // Cap at top 8,000 characters to prevent payload issues
  if (text.length > 8000) {
    text = text.slice(0, 8000);
  }

  if (!text || text.length < 20) {
    throw new Error('Extracted syllabus content is too short or empty (minimum 20 characters required).');
  }

  return text;
};
