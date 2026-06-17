const BASE = "/api/study";

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

async function taskReq(method, path, body) {
  const res = await fetch(`/api/tasks${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

async function dataReq(method, path, body) {
  const res = await fetch(`/api/data${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

async function loopReq(method, path, body) {
  const res = await fetch(`/api/loop${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

export const api = {
  getAuthStatus: () => fetch("/api/auth/status", { credentials: "include" }).then((res) => res.json()),
  login: async (username, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Login failed");
    return data;
  },
  logout: () => fetch("/api/auth/logout", { method: "POST", credentials: "include" }),
  getDashboard: ()                => req("GET",    "/dashboard"),
  getQueue:     (language)        => req("GET",    `/queue${language ? `?language=${language}` : ""}`),
  getCards:     (params = {})     => req("GET",    `/cards?${new URLSearchParams(params)}`),
  getCard:      (id)              => req("GET",    `/cards/${id}`),
  createCard:   (body)            => req("POST",   "/cards", body),
  updateCard:   (id, body)        => req("PATCH",  `/cards/${id}`, body),
  deleteCard:   (id)              => req("DELETE", `/cards/${id}`),
  reviewCard:   (id, grade)       => req("POST",   `/cards/${id}/review`, { grade }),
  getIntervals: (id)              => req("GET",    `/cards/${id}/intervals`),
  getSettings:  ()                => req("GET",    "/settings"),
  patchSettings:(body)            => req("PATCH",  "/settings", body),
  getStats:     ()                => req("GET",    "/stats"),
  quickAddCard: (word, language = "en") => req("POST", "/cards/quick-add", { word, language }),
  retryCard:    (id)             => req("POST",   `/cards/${id}/retry`),
  getHangulProgress: ()          => req("GET",    "/hangul/progress"),
  getHangulQueue: ()             => req("GET",    "/hangul/queue"),
  answerHangulCard: (id, correct, scheduled) => req("POST", `/hangul/cards/${id}/answer`, { correct, scheduled }),
  getHangulOverview: ()          => req("GET",    "/hangul/overview"),
  getTaskDashboard: (date, area) => taskReq("GET", `/dashboard?${new URLSearchParams({ ...(date ? { date } : {}), ...(area ? { area } : {}) })}`),
  getTasks: (params = {})        => taskReq("GET", `/?${new URLSearchParams(params)}`),
  createTask: (body)             => taskReq("POST", "/", body),
  updateTask: (id, body)         => taskReq("PATCH", `/items/${id}`, body),
  deleteTask: (id)               => taskReq("DELETE", `/items/${id}`),
  getProjects: (params = {})     => taskReq("GET", `/projects/list?${new URLSearchParams(params)}`),
  createProject: (body)          => taskReq("POST", "/projects", body),
  updateProject: (id, body)      => taskReq("PATCH", `/projects/${id}`, body),
  deleteProject: (id)            => taskReq("DELETE", `/projects/${id}`),
  exportData: async () => {
    const res = await fetch("/api/data/export", { credentials: "include" });
    if (!res.ok) throw new Error("Could not export your data");
    return res.blob();
  },
  importData: (body) => dataReq("POST", "/import", body),
  createServerBackup: () => dataReq("POST", "/backup"),
  uploadSidebarPhoto: async (file) => {
    const res = await fetch("/api/appearance/sidebar-photo", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Could not upload image");
    return data;
  },
  resetSidebarPhoto: () => fetch("/api/appearance/sidebar-photo", {
    method: "DELETE", credentials: "include",
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Could not restore default image");
    return data;
  }),
  getLoopDashboard:    ()             => loopReq("GET",    "/dashboard"),
  getLoopGoals:        (params = {})  => loopReq("GET",    `/goals?${new URLSearchParams(params)}`),
  createLoopGoal:      (body)         => loopReq("POST",   "/goals", body),
  updateLoopGoal:      (id, body)     => loopReq("PATCH",  `/goals/${id}`, body),
  deleteLoopGoal:      (id)           => loopReq("DELETE", `/goals/${id}`),
  getLoopFocusItems:   (weekStart)    => loopReq("GET",    `/focus-items${weekStart ? `?week_start=${weekStart}` : ""}`),
  createLoopFocusItem: (body)         => loopReq("POST",   "/focus-items", body),
  updateLoopFocusItem: (id, body)     => loopReq("PATCH",  `/focus-items/${id}`, body),
  deleteLoopFocusItem: (id)           => loopReq("DELETE", `/focus-items/${id}`),
  getLoopCheckin:      (date)         => loopReq("GET",    `/checkins${date ? `?date=${date}` : ""}`),
  getLoopCheckins:     (since, until) => loopReq("GET",    `/checkins/list?${new URLSearchParams({ since, until })}`),
  putLoopCheckin:      (body)         => loopReq("PUT",    "/checkins", body),
  getLoopReview:       (weekStart)    => loopReq("GET",    `/reviews?week_start=${weekStart}`),
  putLoopReview:       (body)         => loopReq("PUT",    "/reviews", body),
};
