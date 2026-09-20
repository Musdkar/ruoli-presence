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
import { normalizeApps, normalizeHealth, normalizeKeyboard, resolveMusic, mergeAppUsage } from "../lib/normalize";

export default function Home({ presence, displayPresence, active, now }) {
  const kv = presence && presence.kv ? presence.kv : {};
  // Software usage combines every device so the list can show more rows.
  const apps = mergeAppUsage(
    normalizeApps(kv.apps_today_mac || kv.apps_today),
    normalizeApps(kv.apps_today_win)
  );
  const health = normalizeHealth(kv.health_today);
  // Keyboards are per device and never merged.
  const keyboardMac = normalizeKeyboard(
    kv.keyboard_today_mac || kv.keyboard_today || kv.keyboard_yesterday
  );
  const keyboardWin = normalizeKeyboard(kv.keyboard_today_win);
  const music = resolveMusic(kv.music_now, presence && presence.spotify, now);
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
          keyboard={keyboardWin}
          layout={KEYBOARD_WIN_87}
          device="win"
          title="Keyboard · Windows"
          note="Run the Windows bridge (DEVICE=win) to publish a privacy-filtered keyboard aggregate."
        />
      </div>
    </div>
  );
}
