import { useEffect } from "react";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function DocumentTitle({ title }) {
  const { t } = useTranslation();
  const finalTitle = title || t("common.appName");
  
  useEffect(() => {
    document.title = finalTitle;
    const timer = setTimeout(() => (document.title = finalTitle), 50);
    return () => clearTimeout(timer);
  }, [finalTitle]);

  return null;
}