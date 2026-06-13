const PROJECTS = [
  { name: "Tower A", phase: "Structural frame · L4 of 9", percent: 62, open: 8, due: "Concrete pour · Friday" },
  { name: "Site Office", phase: "Internal fit-out", percent: 38, open: 5, due: "Handover · Jun 28" },
  { name: "Phase 2", phase: "Groundworks & drainage", percent: 14, open: 11, due: "RFI overdue", slipping: true },
  { name: "Block C", phase: "Survey & setting out", percent: 5, open: 3, due: "Starts Jun 20" },
];

export default function ProjectsPage({ onOpenTasks }) {
  return (
    <div className="daylight-page fade-enter">
      <div className="page-heading"><div><h1>Projects</h1><p>4 active projects</p></div><span className="prototype-badge">Demo only</span></div>
      <div className="project-grid">
        {PROJECTS.map((project) => (
          <button className="project-card" key={project.name} onClick={onOpenTasks}>
            <div className="project-top"><div><strong>{project.name}</strong><span>{project.phase}</span></div><b>{project.percent}%</b></div>
            <div className="project-track"><span style={{ width: `${project.percent}%` }} /></div>
            <div className="project-footer"><span>{project.open} open tasks</span><span className={project.slipping ? "slipping" : ""}>{project.due}</span></div>
          </button>
        ))}
      </div>
    </div>
  );
}
