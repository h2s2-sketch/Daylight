const BASE = "/api/study";

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

export const api = {
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
};
