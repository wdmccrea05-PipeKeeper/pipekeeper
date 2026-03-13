/**
 * Social Media Share Utilities
 * Handles sharing to Facebook, Instagram, Pinterest
 */

export const shareToSocialMedia = (platform, options = {}) => {
  const {
    url = window.location.href,
    title = "Check out my collection",
    text = "Check out this amazing item in my collection",
    image = "",
  } = options;

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(text);
  const encodedImage = encodeURIComponent(image);

  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    instagram: `https://www.instagram.com/`,
    pinterest: `https://www.pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage}&description=${encodedText}`,
  };

  const url_to_share = shareUrls[platform];

  if (!url_to_share) {
    console.warn(`Unknown platform: ${platform}`);
    return;
  }

  // For Instagram, copy to clipboard since it doesn't support direct web sharing
  if (platform === "instagram") {
    navigator.clipboard.writeText(url).catch(() => {
      console.warn("Failed to copy to clipboard");
    });
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
    return;
  }

  window.open(url_to_share, "_blank", "noopener,noreferrer,width=600,height=600");
};

export const getSocialMediaIcons = () => {
  return {
    facebook: {
      name: "Facebook",
      icon: "facebook",
      color: "#1877F2",
    },
    instagram: {
      name: "Instagram",
      icon: "instagram",
      color: "#E4405F",
    },
    pinterest: {
      name: "Pinterest",
      icon: "pinterest",
      color: "#E60023",
    },
  };
};