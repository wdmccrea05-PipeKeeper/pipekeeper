import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

export default function RecordPhoto({ photos, alt, className, style }) {
  const [failed, setFailed] = useState([]);
  const photo = photos.find((url) => !failed.includes(url));
  if (!photo) {
    return (
      <span role="img" aria-label={alt} className="ck-record-photo-placeholder">
        <ImageOff className="h-8 w-8" aria-hidden="true" />
      </span>
    );
  }
  return <img key={photo} src={photo} alt={alt} className={className} style={style} onError={() => setFailed((urls) => [...urls, photo])} />;
}
