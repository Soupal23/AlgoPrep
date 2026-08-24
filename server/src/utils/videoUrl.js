export const parseAndConvertVideoUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'Video URL is required' };
  }

  const url = rawUrl.trim();

  // 1. YouTube matches
  // https://www.youtube.com/watch?v=ID or https://youtu.be/ID or https://www.youtube.com/embed/ID
  const youtubeRegExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const ytMatch = url.match(youtubeRegExp);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      isValid: true,
      embedUrl: `https://www.youtube.com/embed/${videoId}`
    };
  }

  // 2. Google Drive matches
  // https://drive.google.com/file/d/FILE_ID/view... or preview
  const driveRegExp = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const driveMatch = url.match(driveRegExp);
  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    return {
      isValid: true,
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`
    };
  }

  return {
    isValid: false,
    error: 'Invalid video URL. Only unlisted YouTube links or Google Drive preview links are supported.'
  };
};
