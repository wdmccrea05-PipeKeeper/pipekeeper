export function getItemPhoto(item) {
  return (
    item?.photo ||
    item?.image ||
    item?.image_url ||
    item?.photo_url ||
    item?.primary_photo ||
    (Array.isArray(item?.photos) ? item.photos[0] : null) ||
    null
  );
}

export function getHighlightPhotos(item, preferLabel = false) {
  const photos = Array.isArray(item?.photos) ? item.photos : [];
  const primary = [item?.__primaryImage, item?.photo, item?.image, item?.image_url, item?.photo_url, item?.primary_photo];
  const labels = [item?.label_image, item?.logo];
  const candidates = preferLabel ? [...photos, ...labels, ...primary] : [...primary, ...photos, ...labels];
  return [...new Set(candidates.flatMap((entry) => {
    const url = typeof entry === 'string' ? entry : entry?.url ?? entry?.file_url;
    return typeof url === 'string' && url.trim() ? [url.trim()] : [];
  }))];
}
