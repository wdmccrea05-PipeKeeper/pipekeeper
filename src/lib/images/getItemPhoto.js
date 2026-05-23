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
