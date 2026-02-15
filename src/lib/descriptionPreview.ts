const URL_REGEX = /(https?:\/\/[^\s]+)/;
const YOUTUBE_VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

export interface DescriptionPreview {
  text: string;
  url: string | null;
  youtubeThumbnailUrl: string | null;
}

const normalizeDescriptionText = (text: string): string => {
  return text.replace(URL_REGEX, "").replace(/\s+/g, " ").trim();
};

const extractYouTubeVideoId = (url: string): string | null => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    if (hostname !== "www.youtube.com" && hostname !== "youtube.com") {
      return null;
    }

    if (parsedUrl.pathname === "/watch") {
      const watchId = parsedUrl.searchParams.get("v");
      return watchId && YOUTUBE_VIDEO_ID_REGEX.test(watchId) ? watchId : null;
    }

    if (parsedUrl.pathname.startsWith("/shorts/")) {
      const [, , shortsId] = parsedUrl.pathname.split("/");
      return shortsId && YOUTUBE_VIDEO_ID_REGEX.test(shortsId) ? shortsId : null;
    }
  } catch {
    return null;
  }

  return null;
};

export const getDescriptionPreview = (description: string): DescriptionPreview => {
  const match = description.match(URL_REGEX);
  const url = match ? match[0] : null;
  const text = normalizeDescriptionText(description);
  const videoId = url ? extractYouTubeVideoId(url) : null;
  const youtubeThumbnailUrl = videoId
    ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
    : null;

  return {
    text,
    url,
    youtubeThumbnailUrl,
  };
};
