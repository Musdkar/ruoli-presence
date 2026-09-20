import { useState } from "react";
import { useT } from "../../i18n";
import CardHead from "./CardHead.jsx";
import Empty from "./EmptyState.jsx";

export default function MusicCard({ music }) {
  const T = useT();
  const stateLabels = { playing: T.nowPlaying, paused: T.paused, last_played: T.lastPlayed };
  const serviceLabels = {
    netease: "NetEase Music",
    apple_music: "Apple Music",
    spotify: "Spotify",
  };
  const serviceLabel = music && music.service ? serviceLabels[music.service] || null : null;
  const coverUrl = music?.artwork?.url || null;
  const [failedCover, setFailedCover] = useState(null);
  if (!music || music.state === "never")
    return (
      <article className="card music-card">
        <CardHead title={T.musicStatus} meta={serviceLabel} />
        <Empty label={T.musicNever} detail={T.musicNeverDetail} />
      </article>
    );
  const showCover = coverUrl && failedCover !== coverUrl;
  return (
    <article className="card music-card">
      <CardHead title={T.musicStatus} meta={serviceLabel} />
      <div className={`music-body music-${music.state}`}>
        <div className="music-state">{stateLabels[music.state] || T.music}</div>
        <div className="music-cover-frame">
          {showCover ? (
            <img
              className="music-cover"
              src={coverUrl}
              alt={music.track.title + " cover"}
              loading="lazy"
              decoding="async"
              onError={() => setFailedCover(coverUrl)}
            />
          ) : (
            <div className="music-cover music-cover-empty">&#9834;</div>
          )}
        </div>
        <div className="music-track">
          <strong>{music.track.title}</strong>
          <span>{music.track.artist}</span>
        </div>
      </div>
    </article>
  );
}
