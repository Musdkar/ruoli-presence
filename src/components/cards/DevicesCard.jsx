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
        <DeviceGroup title={T.daily} items={DEVICES.daily} />
        <DeviceGroup title={T.play} items={DEVICES.play} />
      </div>
    </article>
  );
}
