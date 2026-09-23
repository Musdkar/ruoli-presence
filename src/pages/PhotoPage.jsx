import React, { useCallback, useState } from "react";
import { config } from "../config";
import { formatPhotoTaken } from "../lib/format";
import { useT } from "../i18n";
import PhotoLightbox from "../components/PhotoLightbox.jsx";

const LazyMasonryPhotoAlbum = React.lazy(async () => {
  await import("react-photo-album/masonry.css");
  const mod = await import("react-photo-album");
  return { default: mod.MasonryPhotoAlbum };
});

// Each tile gets its capture date appended under the image.
//
// `render.extras` is the hook for extra markup inside a tile, and it receives
// the photo context (`{ photo, index, width, height }`). Deliberately NO
// `render.photo` override: that hook is handed only `{ onClick }`, so spreading
// its props onto an <img> would render an image with no src/alt. Letting the
// album render its own <img> from the photo object keeps src, alt and the
// reserved width/height intact, and `extras` then hangs the caption beside it.
function renderExtras(_props, { photo }) {
  const taken = formatPhotoTaken(photo.taken);
  if (!taken) return null;
  return (
    <figcaption className="photo-caption">
      <time dateTime={photo.taken}>{taken}</time>
    </figcaption>
  );
}

const RENDER = { extras: renderExtras };

export default function PhotoPage() {
  const T = useT();
  const photos = config.photos;
  // Index of the frame open in the full-screen viewer, or null when closed.
  const [openIndex, setOpenIndex] = useState(null);
  const close = useCallback(() => setOpenIndex(null), []);
  return (
    <div className="view page-view photo-page">
      <div className="page-mast">
        <div>
          <span className="eyebrow">{T.photo} / ARCHIVE</span>
          <h2>
            {T.homePageTitle1}
            <br />
            {T.homePageTitle2}
          </h2>
        </div>
        <p>
          {T.photoIntro}
          {photos.length > 0 && (
            <span className="photo-count">
              {photos.length} {T.photoCount}
            </span>
          )}
        </p>
      </div>
      <div className="page-rule" />
      {photos.length ? (
        <div className="photo-wall">
          <React.Suspense fallback={<div className="archive-note">{T.loadingArchive}</div>}>
            <LazyMasonryPhotoAlbum
              photos={photos}
              columns={(width) => (width < 700 ? 1 : width < 1200 ? 2 : 3)}
              spacing={10}
              render={RENDER}
              // The album turns each tile into a <button> when onClick is set,
              // which also makes the frames keyboard reachable.
              onClick={({ index }) => setOpenIndex(index)}
            />
          </React.Suspense>
        </div>
      ) : (
        <div className="archive-note">{T.noPhotos}</div>
      )}
      {openIndex !== null && (
        <PhotoLightbox
          photos={photos}
          index={openIndex}
          onClose={close}
          onNavigate={setOpenIndex}
        />
      )}
    </div>
  );
}
