import StatusCard from "../components/cards/StatusCard.jsx";
import WeatherCard from "../components/cards/WeatherCard.jsx";
import MapCard from "../components/cards/MapCard.jsx";
import MusicCard from "../components/cards/MusicCard.jsx";
import HomePhotoCard from "../components/cards/HomePhotoCard.jsx";
import FitnessCard from "../components/cards/FitnessCard.jsx";
import DevicesCard from "../components/cards/DevicesCard.jsx";
import SoftwareCard from "../components/cards/SoftwareCard.jsx";
import KeyboardCard from "../components/cards/KeyboardCard.jsx";
import { KEYBOARD_MAC, KEYBOARD_WIN_87 } from "../data/keyboardLayouts";
import { normalizeHealth, resolveMusic } from "../lib/normalize";
import { selectComputerUsage, selectMusicValue } from "../../api/lib/computer-presence.mjs";

export default function Home({ presence, displayPresence, active, now }) {
  const kv = presence && presence.kv ? presence.kv : {};
  const { apps, keyboardMac, keyboardPC } = selectComputerUsage(kv, now);
  const health = normalizeHealth(kv.health_today);
  const music = resolveMusic(selectMusicValue(kv, now), presence && presence.spotify, now);
  return (
    <div className="view home-view" hidden={!active}>
      <div className="grid">
        <StatusCard displayPresence={displayPresence} />
        <WeatherCard />
        <MapCard active={active} />
        <MusicCard music={music} />
        <HomePhotoCard />
        <FitnessCard health={health} />
        <DevicesCard />
        <SoftwareCard apps={apps} />
        <KeyboardCard
          keyboard={keyboardMac}
          layout={KEYBOARD_MAC}
          device="mac"
          title="Keyboard · Mac"
          note="Run bridge/whatpulse_presence.py on the Mac to publish a privacy-filtered keyboard aggregate."
        />
        <KeyboardCard
          keyboard={keyboardPC}
          layout={KEYBOARD_WIN_87}
          device="win"
          title="Keyboard · PC"
          note="Publish Windows (DEVICE=win) and Intel macOS (DEVICE=mac-intel) snapshots for this PC."
        />
      </div>
    </div>
  );
}
