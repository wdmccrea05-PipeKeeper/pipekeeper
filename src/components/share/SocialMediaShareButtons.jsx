import React from "react";
import { shareToSocialMedia } from "./socialMediaShare";
import { toast } from "sonner";
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function SocialMediaShareButtons({ 
  url, 
  title = "Check out my collection", 
  text = "Check out this amazing item",
  image = "",
  onShare
}) {
  const { t } = useTranslation();
  const platforms = [
    {
      id: "facebook",
      name: "Facebook",
      color: "#1877F2",
      symbol: "f",
    },
    {
      id: "instagram",
      name: "Instagram",
      color: "#E4405F",
      symbol: "📷",
    },
    {
      id: "pinterest",
      name: "Pinterest",
      color: "#E60023",
      symbol: "P",
    },
  ];

  const handleShare = (platform) => {
    try {
      shareToSocialMedia(platform, { url, title, text, image });
      onShare?.(platform);
      
      if (platform === "instagram") {
        toast.success(t("auto.components_share_SocialMediaShareButtons.link_copied_open_instagram_to_share_b95sdy"));
      } else {
        toast.success(`Sharing on ${platform}`);
      }
    } catch (error) {
      console.error(`Failed to share on ${platform}:`, error);
      toast.error(`Failed to share on ${platform}`);
    }
  };

  return (
    <div className="flex gap-3 items-center">
      {platforms.map((platform) => (
        <button
          key={platform.id}
          onClick={() => handleShare(platform.id)}
          className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{
            background: platform.color,
            opacity: 0.85,
          }}
          title={`Share on ${platform.name}`}
          aria-label={`Share on ${platform.name}`}
        >
          <span className="text-white font-bold text-lg">{platform.symbol}</span>
          <div
            className="absolute opacity-0 group-hover:opacity-100 transition-opacity -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs whitespace-nowrap px-2 py-1 rounded pointer-events-none"
          >
            {platform.name}
          </div>
        </button>
      ))}
    </div>
  );
}