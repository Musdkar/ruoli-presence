import { config } from "../config";
import { useT } from "../i18n";
import BrandMark from "../components/BrandMark.jsx";

export default function UsesPage() {
  const T = useT();
  return (
    <div className="view page-view uses-page">
      <div className="page-mast">
        <div>
          <span className="eyebrow">{T.usesEyebrow}</span>
          <h2>
            {T.usesTitle1}
            <br />
            {T.usesTitle2}
          </h2>
        </div>
        <p>{T.usesIntro}</p>
      </div>
      <div className="page-rule" />
      <div className="uses-grid">
        {config.software.map((group) => (
          <section className="uses-group" key={group.group}>
            <div className="uses-group-head">
              <h3>{T.groups[group.group] || group.group}</h3>
              <span>{T.groupNotes[group.note] || group.note}</span>
            </div>
            <div className="software-list">
              {group.items.map((item) => (
                <div className="software-item" key={item.name}>
                  <div className="software-icon">
                    <BrandMark item={item} />
                    {item.icon && (
                      <span className="brand-fallback">
                        {item.monogram || item.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <b>{item.name}</b>
                    <span>{item.meta}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="uses-foot">
        <span>{T.usesFoot1}</span>
        <span>{T.usesFoot2}</span>
      </div>
    </div>
  );
}
