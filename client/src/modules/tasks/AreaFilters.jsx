const OPTIONS = [
  ["", "All"],
  ["work", "Work"],
  ["life", "Life"],
];

export default function AreaFilters({ value, onChange, counts }) {
  return (
    <div className="ds-filters" aria-label="Area filter">
      {OPTIONS.map(([id, label]) => (
        <button key={label} className={`ds-filter${value === id ? " on" : ""}`} onClick={() => onChange(id)}>
          {id && <span className={`ds-area-dot ${id}`} />}
          {label}
          {counts && <span className="ds-filter-count">{counts[id || "all"] || 0}</span>}
        </button>
      ))}
    </div>
  );
}
