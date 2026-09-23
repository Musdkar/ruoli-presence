import { useCallback, useEffect, useRef } from "react";
import { formatPhotoTaken } from "../lib/format";
import { useT } from "../i18n";

// Full-screen view for one archive frame, opened by clicking a tile.
//
// Deliberately styled as its own surface with a back control in the top-left,
// matching the /email route so opening a photo reads the same way as opening
// that page.
//
// Closes on Escape or a click on the backdrop, and steps through the archive
// with the arrow keys. Focus is moved into the dialog on open and restored to
// the tile afterwards, and the background is scroll-locked while it is up.
export default function PhotoLightbox({ photos, index, onClose, onNavigate }) {
  const T = useT();
  const closeRef = useRef(null);
  const photo = photos[index];

  const step = useCallback(
    (delta) => {
      if (photos.length < 2) return;
      onNavigate((index + delta + photos.length) % photos.length);
    },
    [index, photos.length, onNavigate]
  );

  useEffect(() => {
    if (!photo) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft") step(-1);
      else if (event.key === "ArrowRight") step(1);
    };
    document.addEventListener("keydown", onKeyDown);

    // Scroll lock: the archive scrolls in .page-view, so freezing <body> alone
    // would not stop the page behind the overlay from moving.
    const scroller = document.querySelector(".page-view");
    const previousOverflow = scroller ? scroller.style.overflow : "";
    if (scroller) scroller.style.overflow = "hidden";

    const previouslyFocused = document.activeElement;
    if (closeRef.current) closeRef.current.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (scroller) scroller.style.overflow = previousOverflow;
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
    };
  }, [photo, onClose, step]);

  if (!photo) return null;

  const taken = formatPhotoTaken(photo.taken);

  return (
    <div
      className="photo-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt}
      onClick={onClose}
    >
      <button ref={closeRef} type="button" className="photo-viewer-back" onClick={onClose}>
        ←<span className="photo-viewer-sr">{T.closeViewer}</span>
      </button>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            className="photo-viewer-nav photo-viewer-prev"
            aria-label={T.previousPhoto}
            onClick={(event) => {
              event.stopPropagation();
              step(-1);
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="photo-viewer-nav photo-viewer-next"
            aria-label={T.nextPhoto}
            onClick={(event) => {
              event.stopPropagation();
              step(1);
            }}
          >
            ›
          </button>
        </>
      )}

      {/* stopPropagation so a click on the frame itself does not dismiss it. */}
      <figure className="photo-viewer-stage" onClick={(event) => event.stopPropagation()}>
        <img className="photo-viewer-image" src={photo.src} alt={photo.alt} decoding="async" />
        {(taken || photos.length > 1) && (
          <figcaption className="photo-viewer-meta">
            {taken && <time dateTime={photo.taken}>{taken}</time>}
            {photos.length > 1 && (
              <span className="photo-viewer-index">
                {index + 1} / {photos.length}
              </span>
            )}
          </figcaption>
        )}
      </figure>
    </div>
  );
}
