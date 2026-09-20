import { useT } from "../../i18n";
import CardHead from "./CardHead.jsx";
import { DEVICES } from "../../data/devices";

function DeviceGroup({ title, items }) {
  return (
    <div>
      <h4>{title}</h4>
      {items.map(([n, m]) => (
        <div className="device" key={n}>
          <b>{n}</b>
          <span>{m}</span>
        </div>
      ))}
    </div>
  );
}

export default function DevicesCard() {
  const T = useT();
  return (
    <article className="card devices-card">
      <CardHead title={T.devices} meta={T.daily + " / " + T.play} />
      <div className="device-columns">
        <DeviceGroup
          title={T.daily}
          items={[
            ["MacBook Pro · M1 Pro", "macOS"],
            ["iPhone 16 Pro Max", "mobile"],
            ["AirPods Pro 3", "audio"],
          ]}
        />
        <DeviceGroup
          title={T.play}
          items={[
            ["Quest 3", "VR"],
            ["Gaming Laptop", "7945HX · RTX 5070 Ti"],
            ["Desktop PC", "5800X · RX 6900 XT"],
            ["Xiaomi Pad 7S Pro", "tablet"],
          ]}
        />
      </div>
    </article>
  );
}
