import { Link } from "react-router-dom";
import { useT } from "../../i18n";
import { config } from "../../config";
import CardHead from "./CardHead.jsx";
import Empty from "./EmptyState.jsx";

export default function HomePhotoCard() {
  const T = useT();
  const photo = config.homePhoto;
  return (
    <article className="card photos-card">
      <CardHead title={T.photo2} meta={T.latestFrame} />
      {photo ? (
        <div className="photo-album">
          <img className="photo-backdrop" src={photo.src} alt="" aria-hidden="true" />
          <img
            className="photo-preview"
            src={photo.src}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            decoding="async"
          />
        </div>
      ) : (
        <Empty label={T.noPhotos} />
      )}
      <Link className="photo-open" to="/photo">
        {T.openArchive} ↗
      </Link>
    </article>
  );
}
