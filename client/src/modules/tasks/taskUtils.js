export function localISODate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function taskDate(task) {
  return task.date ?? task.due_date ?? null;
}

export function taskTime(task) {
  return task.time ?? task.due_time ?? null;
}

export function areaLabel(area) {
  if (area === "work") return "Work";
  if (area === "life") return "Life";
  return "Unsorted";
}

export function displayTaskDate(value, today = localISODate()) {
  if (!value) return "No date";
  if (value === today) return "Today";
  const tomorrow = new Date(`${today}T12:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (value === localISODate(tomorrow)) return "Tomorrow";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
