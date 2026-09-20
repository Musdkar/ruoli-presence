export default function BrandMark({ item }) {
  if (item.icon)
    return (
      <img
        src={`/assets/software-icons/${item.icon}`}
        alt=""
        width="18"
        height="18"
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.currentTarget.style.display = "none";
          e.currentTarget.nextElementSibling?.classList.add("show");
        }}
      />
    );
  return (
    <span className="brand-fallback show">
      {item.monogram || item.name.slice(0, 2).toUpperCase()}
    </span>
  );
}
