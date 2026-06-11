export function speak(text, language) {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = language === "kr" ? "ko-KR" : "en-US";
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  } catch (_) { /* no-op */ }
}
