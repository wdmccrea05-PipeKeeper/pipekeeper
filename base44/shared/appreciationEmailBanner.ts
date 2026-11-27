/**
 * Display only the photographic strip of the existing square artwork.
 * Its white matte occupies rows 0–223 and 768–1023. Leave a two-pixel
 * inset at each edge, and keep Gmail and desktop Outlook framing identical.
 * The source artwork is unchanged; this only controls its email viewport.
 */
const SOURCE_SIZE = 1024;
const PHOTO_TOP = 226;
const PHOTO_BOTTOM = 766;
const EMAIL_WIDTH = 600;

export default function buildAppreciationEmailBanner(src, escapedAlt) {
  const photoHeight = PHOTO_BOTTOM - PHOTO_TOP;
  const ratio = photoHeight / SOURCE_SIZE;
  const position = (PHOTO_TOP / (SOURCE_SIZE - photoHeight)) * 100;

  return `<tr><td align="center" style="padding:0;font-size:0;line-height:0;">
<!--[if mso]>
<v:image xmlns:v="urn:schemas-microsoft-com:vml" src="${src}" alt="${escapedAlt}" croptop="${PHOTO_TOP / SOURCE_SIZE}" cropbottom="${1 - PHOTO_BOTTOM / SOURCE_SIZE}" style="display:block;width:${EMAIL_WIDTH * 0.75}pt;height:${EMAIL_WIDTH * ratio * 0.75}pt;" />
<![endif]-->
<!--[if !mso]><!-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
<tr><td role="img" aria-label="${escapedAlt}" background="${src}" style="padding:0;background-image:url('${src}');background-repeat:no-repeat;background-size:100% auto;background-position:center ${position}%;font-size:0;line-height:0;">
<div style="height:0;padding:0 0 ${ratio * 100}%;font-size:0;line-height:0;">&#8203;</div>
</td></tr>
</table>
<!--<![endif]-->
</td></tr>`;
}