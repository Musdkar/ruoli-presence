export default function VrcStatus({ presence }) {
  const vrc = presence?.activities?.find(
    (a) => /vrchat/i.test(a.name || "") || /vrchat/i.test(a.details || "")
  );
  return vrc ? (
    <div className="vrc-line">VRChat · {vrc.details || vrc.state || "active"}</div>
  ) : null;
}
