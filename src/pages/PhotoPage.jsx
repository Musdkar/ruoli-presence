import React from "react";
import { config } from "../config";
import { useT } from "../i18n";

const LazyMasonryPhotoAlbum = React.lazy(async () => {
  await import("react-photo-album/masonry.css");
  const mod = await import("react-photo-album");
  return { default: mod.MasonryPhotoAlbum };
});

export default function PhotoPage() {
  const T = useT();
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
        <p>{T.photoIntro}</p>
      </div>
      <div className="page-rule" />
      <div className="photo-wall">
        <React.Suspense fallback={<div className="archive-note">{T.loadingArchive}</div>}>
          <LazyMasonryPhotoAlbum
            photos={config.photos}
            columns={(width) => (width < 700 ? 1 : width < 1200 ? 2 : 3)}
            spacing={10}
          />
        </React.Suspense>
      </div>
      {config.photos.length === 1 && <div className="archive-note">{T.archiveNote}</div>}
    </div>
  );
}
