import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { ArrowRight, Sun } from "../../shared/icons.jsx";
import WeekNav from "./WeekNav.jsx";
import { CATEGORY_COLORS, addDays, isoWeekStart, nextWeekStart, weekRangeLabel } from "./loopUtils.js";

const LOOKBACK = [["done", "Done"], ["partial", "Partial"], ["missed", "Missed"]];
const SEG_CLASS = { done: "done", partial: "part", missed: "miss" };

export default function WeeklyReviewView() {
  const [weekStart, setWeekStart] = useState(isoWeekStart());
  const [step, setStep] = useState(0);
  const [items, setItems] = useState([]);
  const [nextItems, setNextItems] = useState([]);
  const [moved, setMoved] = useState({});
  const [wins, setWins] = useState("");
  const [slipped, setSlipped] = useState("");
  const [learning, setLearning] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [closed, setClosed] = useState(false);

  function load(week = weekStart) {
    setNotice("");
    Promise.all([
      api.getLoopFocusItems(week),
      api.getLoopReview(week),
      api.getLoopCheckins(week, addDays(week, 6)).catch(() => []),
      api.getLoopFocusItems(nextWeekStart(week)).catch(() => []),
    ]).then(([focus, review, checkins, next]) => {
      setItems(focus);
      setNextItems(next || []);
      setWins(review?.wins || "");
      setSlipped(review?.slipped || "");
      setLearning(review?.learning || "");
      const tally = {};
      for (const c of checkins || []) {
        for (const id of c.progressed_focus_ids || []) tally[id] = (tally[id] || 0) + 1;
      }
      setMoved(tally);
      setError("");
    }).catch((err) => setError(err.message));
  }
  useEffect(() => { load(weekStart); setStep(0); setClosed(false); }, [weekStart]);

  async function scoreItem(id, status) {
    try { await api.updateLoopFocusItem(id, { status }); load(); } catch (err) { setError(err.message); }
  }

  async function carryForward(item) {
    try {
      await api.createLoopFocusItem({ week_start: nextWeekStart(weekStart), title: item.title, goal_id: item.goal_id || null });
      await api.updateLoopFocusItem(item.id, { status: "carried" });
      setNotice(`Carried "${item.title}" to next week.`);
      load();
    } catch (err) { setError(err.message); }
  }

  async function closeWeek() {
    try {
      await api.putLoopReview({ week_start: weekStart, wins: wins.trim() || null, slipped: slipped.trim() || null, learning: learning.trim() || null });
      setClosed(true); setError("");
    } catch (err) { setError(err.message); }
  }

  const dots = [0, 1, 2].map((i) => <span key={i} className={`d${i <= step ? " on" : ""}`} />);

  return (
    <div className="loop-page flat">
      <WeekNav weekStart={weekStart} onChange={setWeekStart} />
      <div className="loop-rstep">{dots}</div>
      {error && <div className="loop-error">{error}</div>}
      {notice && <div className="loop-notice">{notice}</div>}

      {step === 0 && (
        <div>
          <div className="loop-rdate">The week of {weekRangeLabel(weekStart)}</div>
          <h1 className="loop-rtitle">Looking back</h1>
          {items.length === 0 && <div className="loop-empty">No focus items for this week.</div>}
          {items.map((item) => (
            <div className="loop-lb" key={item.id}>
              <div className="tp">
                <span className="loop-bar" style={{ "--cat": CATEGORY_COLORS[item.goal_category], height: 22 }} />
                <span className="nm">{item.title}</span>
                <span className="mv">{moved[item.id] ? `moved ${moved[item.id]}d` : "—"}</span>
              </div>
              <div className="loop-seg">
                {LOOKBACK.map(([value, label]) => (
                  <button
                    key={value}
                    className={item.status === value ? SEG_CLASS[value] : ""}
                    onClick={() => scoreItem(item.id, value)}
                  >{label}</button>
                ))}
              </div>
            </div>
          ))}
          <button className="loop-cta ink" onClick={() => setStep(1)}>Continue <ArrowRight size={15} sw={2.2} /></button>
        </div>
      )}

      {step === 1 && (
        <div>
          <div className="loop-rdate">A few quiet questions</div>
          <h1 className="loop-rtitle">Reflecting</h1>
          <div className="loop-jq">
            <div className="ql">What worked this week?</div>
            <textarea value={wins} onChange={(event) => setWins(event.target.value)} />
          </div>
          <div className="loop-jq">
            <div className="ql">What slipped?</div>
            <textarea value={slipped} onChange={(event) => setSlipped(event.target.value)} />
          </div>
          <div className="loop-jq">
            <div className="ql">What should I change next week?</div>
            <textarea value={learning} onChange={(event) => setLearning(event.target.value)} />
          </div>
          <div className="loop-review-actions">
            <button className="loop-back" onClick={() => setStep(0)}>Back</button>
            <button className="loop-cta ink" onClick={() => setStep(2)}>Continue <ArrowRight size={15} sw={2.2} /></button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="loop-rdate">Looking ahead · {weekRangeLabel(nextWeekStart(weekStart))}</div>
          <h1 className="loop-rtitle">Next week</h1>

          <div className="loop-slab"><span>Carry this week forward</span></div>
          {items.length === 0 && <div className="loop-empty">Nothing to carry.</div>}
          {items.map((item) => (
            <div className="loop-row" key={item.id}>
              <span className="loop-bar" style={{ "--cat": CATEGORY_COLORS[item.goal_category], height: 20 }} />
              <span className="nm" style={{ flex: 1, fontWeight: 600 }}>{item.title}</span>
              {item.status === "carried"
                ? <span className="loop-carry">Carried</span>
                : <button className="loop-back" onClick={() => carryForward(item)}>Carry forward</button>}
            </div>
          ))}

          <div className="loop-slab"><span>Next week's focus</span><span>{String(nextItems.length).padStart(2, "0")}</span></div>
          {nextItems.length === 0 && <div className="loop-empty">No focus planned yet — carry items forward or add them in Weekly Focus.</div>}
          {nextItems.map((item) => (
            <div className="loop-slot" key={item.id}>
              <span className="six">{String(item.sort_order).padStart(2, "0")}</span>
              <div className="bd"><div className="stt">{item.title}</div></div>
            </div>
          ))}

          <div className="loop-review-actions">
            <button className="loop-back" onClick={() => setStep(1)}>Back</button>
            <button className="loop-cta ink" onClick={closeWeek}><Sun size={16} sw={2.2} /> {closed ? "Week closed" : "Close the week"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
