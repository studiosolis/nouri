import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are an evidence-based nutrition coach and food logger named Nouri.

Your goal is to make food tracking effortless while remaining honest about uncertainty.

## Core Principles
Never invent nutritional information.
If confidence is below about 90%, ask clarifying questions before estimating.
Always explain uncertainty.
Do not assume hidden ingredients.
Use USDA nutrition data or equivalent reference values whenever possible.
Round values realistically.

## Profile Setup & Persistence
On the very first message, warmly greet the user and begin collecting profile info — one or two questions at a time, never all at once. Collect:
- Name, Age, Sex, Height, Weight
- Goal (Lose fat / Maintain / Gain muscle)
- Activity level (Sedentary / Lightly active / Moderately active / Very active)
- Preferred units (metric or imperial)

After collecting these, automatically calculate and confirm:
- Estimated BMR, TDEE, Daily calorie target, Protein goal (g), Fiber goal (g)

Display a profile summary and ask the user to confirm before saving. Once confirmed, reference it silently in all future calculations. Never ask again unless the user requests an update.

If the user mentions a change (e.g. "I lost 5 pounds"), prompt them to update their profile and recalculate targets.

## Meal Analysis Workflow
When a user logs a meal or describes food:
1. Identify every food item mentioned.
2. Estimate serving sizes.
3. Assign an internal confidence score per item.

Important — photo/description analysis limitations: Be transparent that estimating portions from descriptions or photos has inherent limitations. When confidence is lower, say so clearly and ask targeted follow-up questions.

If confidence is high: Estimate nutrition immediately.
If confidence is medium or low: Ask only the most important missing questions.

Examples of clarifying questions:
- Fried or grilled?
- Whole milk or skim?
- Approximately how much dressing?
- Did you finish the entire meal?

After clarification, return a Meal Summary in this EXACT format so the dashboard can parse it:

MEAL_DATA_START
calories: [number]
protein: [number]
carbs: [number]
fat: [number]
fiber: [number]
sugar: [number]
sodium: [number]
meal_name: [short name]
confidence: [High/Medium/Low]
MEAL_DATA_END

Then provide a friendly summary below that.

## Daily Tracking
After each meal, reference the running totals and comment on progress toward daily goals. Be encouraging but honest.

## Exercise Tracking
When the user mentions exercise, estimate calories burned. Return in this format:

EXERCISE_DATA_START
calories_burned: [number]
exercise_name: [name]
EXERCISE_DATA_END

## End-of-Day Report
When the user asks for their daily report or end-of-day summary, generate a Nutrition Score out of 100 considering: protein target, fiber target, fruit & vegetable intake, whole food quality, added sugars, healthy fats, calorie target, micronutrient variety.

Format:
SCORE_DATA_START
score: [number]
protein_stars: [1-5]
fiber_stars: [1-5]
vegetables_stars: [1-5]
sugar_stars: [1-5]
calories_stars: [1-5]
SCORE_DATA_END

Then provide three successes, one improvement for tomorrow, and one healthy meal suggestion.

## Coaching
After 3+ days, identify patterns (low protein, low fiber, high sodium, calorie surplus/deficit) and suggest realistic improvements. Never shame. Focus on sustainable habits.

## Communication Style
Friendly. Supportive. Concise. Evidence-based. Never exaggerate certainty. Ask clarifying questions before making uncertain estimates.`;

const C = {
  bg: "#0F1117",
  surface: "#1A1D27",
  card: "#21253A",
  accent: "#6C63FF",
  green: "#4ADE80",
  yellow: "#FACC15",
  red: "#F87171",
  text: "#E8E9F0",
  muted: "#7B7F9E",
  border: "#2E3250",
};

function parseMealData(text) {
  const match = text.match(/MEAL_DATA_START([\s\S]*?)MEAL_DATA_END/);
  if (!match) return null;
  const data = {};
  match[1].trim().split("\n").forEach(line => {
    const [key, ...rest] = line.split(":");
    const val = rest.join(":").trim();
    if (key && val) data[key.trim()] = isNaN(val) ? val : parseFloat(val);
  });
  return data;
}

function parseExerciseData(text) {
  const match = text.match(/EXERCISE_DATA_START([\s\S]*?)EXERCISE_DATA_END/);
  if (!match) return null;
  const data = {};
  match[1].trim().split("\n").forEach(line => {
    const [key, ...rest] = line.split(":");
    const val = rest.join(":").trim();
    if (key && val) data[key.trim()] = isNaN(val) ? val : parseFloat(val);
  });
  return data;
}

function parseScoreData(text) {
  const match = text.match(/SCORE_DATA_START([\s\S]*?)SCORE_DATA_END/);
  if (!match) return null;
  const data = {};
  match[1].trim().split("\n").forEach(line => {
    const [key, ...rest] = line.split(":");
    const val = rest.join(":").trim();
    if (key && val) data[key.trim()] = isNaN(val) ? val : parseFloat(val);
  });
  return data;
}

function cleanText(text) {
  return text
    .replace(/MEAL_DATA_START[\s\S]*?MEAL_DATA_END/g, "")
    .replace(/EXERCISE_DATA_START[\s\S]*?EXERCISE_DATA_END/g, "")
    .replace(/SCORE_DATA_START[\s\S]*?SCORE_DATA_END/g, "")
    .trim();
}

function Stars({ count }) {
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= count ? C.yellow : C.border, fontSize: 13 }}>★</span>
      ))}
    </span>
  );
}

function MacroBar({ label, value, goal, color, unit = "g" }) {
  const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: C.muted, fontSize: 11, fontFamily: "monospace" }}>{label}</span>
        <span style={{ color: C.text, fontSize: 11, fontFamily: "monospace" }}>
          {Math.round(value)}{unit}
          {goal > 0 && <span style={{ color: C.muted }}> / {goal}{unit}</span>}
        </span>
      </div>
      <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, background: color,
          borderRadius: 3, transition: "width 0.5s ease"
        }} />
      </div>
    </div>
  );
}

function CalorieRing({ net, goal }) {
  const pct = goal > 0 ? Math.min((net / goal) * 100, 100) : 0;
  const r = 30;
  const circ = 2 * Math.PI * r;
  const color = pct > 100 ? C.red : pct > 75 ? C.yellow : C.accent;
  return (
    <svg width={76} height={76} viewBox="0 0 76 76">
      <circle cx={38} cy={38} r={r} fill="none" stroke={C.border} strokeWidth={7} />
      <circle cx={38} cy={38} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct / 100)}
        strokeLinecap="round"
        transform="rotate(-90 38 38)"
        style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
      />
      <text x={38} y={43} textAnchor="middle" fill={C.text} fontSize={12} fontWeight={700}>
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [showDash, setShowDash] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });
  const [goals, setGoals] = useState({ calories: 2000, protein: 150, carbs: 250, fat: 65, fiber: 25 });
  const [exerciseCalories, setExerciseCalories] = useState(0);
  const [meals, setMeals] = useState([]);
  const [score, setScore] = useState(null);

  const chatRef = useRef(null);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  const startChat = async () => {
    setStarted(true);
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: "Hello!" }]
        })
      });
      const data = await res.json();
      const text = data.content.map(b => b.text || "").join("");
      setMessages([
        { role: "user", content: "Hello!", hidden: true },
        { role: "assistant", content: text }
      ]);
    } catch {
      setMessages([{ role: "assistant", content: "Couldn't connect. Please check your connection and try again." }]);
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const apiMessages = newMessages
      .filter(m => !m.hidden)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: apiMessages
        })
      });
      const data = await res.json();
      const rawText = data.content.map(b => b.text || "").join("");

      const mealData = parseMealData(rawText);
      const exerciseData = parseExerciseData(rawText);
      const scoreData = parseScoreData(rawText);

      if (mealData) {
        setTotals(prev => ({
          calories: prev.calories + (mealData.calories || 0),
          protein: prev.protein + (mealData.protein || 0),
          carbs: prev.carbs + (mealData.carbs || 0),
          fat: prev.fat + (mealData.fat || 0),
          fiber: prev.fiber + (mealData.fiber || 0),
          sugar: prev.sugar + (mealData.sugar || 0),
          sodium: prev.sodium + (mealData.sodium || 0),
        }));
        setMeals(prev => [...prev, {
          name: mealData.meal_name || "Meal",
          calories: mealData.calories || 0,
          confidence: mealData.confidence
        }]);
      }

      if (exerciseData) {
        setExerciseCalories(prev => prev + (exerciseData.calories_burned || 0));
      }

      if (scoreData) setScore(scoreData);

      setMessages(prev => [...prev, { role: "assistant", content: rawText }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    }
    setLoading(false);
  };

  const netCalories = totals.calories - exerciseCalories;

  const Dashboard = () => (
    <div style={{
      width: isMobile ? "100%" : 300,
      background: C.surface,
      overflowY: "auto",
      padding: "16px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      height: isMobile ? "100%" : "auto",
    }}>
      {isMobile && (
        <button onClick={() => setShowDash(false)} style={{
          background: "transparent", border: `1px solid ${C.border}`,
          color: C.muted, borderRadius: 10, padding: "8px 0",
          fontSize: 13, cursor: "pointer", marginBottom: 4
        }}>← Back to Chat</button>
      )}

      {/* Calories */}
      <div style={{ background: C.card, borderRadius: 16, padding: 14 }}>
        <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Today's Calories</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <CalorieRing net={netCalories} goal={goals.calories} />
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{Math.round(netCalories)}</div>
            <div style={{ fontSize: 11, color: C.muted }}>net kcal</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>goal: {goals.calories}</div>
            {exerciseCalories > 0 && (
              <div style={{ fontSize: 11, color: C.green, marginTop: 2 }}>−{exerciseCalories} exercise</div>
            )}
          </div>
        </div>
      </div>

      {/* Macros */}
      <div style={{ background: C.card, borderRadius: 16, padding: 14 }}>
        <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Macros</div>
        <MacroBar label="Protein" value={totals.protein} goal={goals.protein} color={C.accent} />
        <MacroBar label="Carbs" value={totals.carbs} goal={goals.carbs} color={C.yellow} />
        <MacroBar label="Fat" value={totals.fat} goal={goals.fat} color="#F97316" />
        <MacroBar label="Fiber" value={totals.fiber} goal={goals.fiber} color={C.green} />
      </div>

      {/* Sugar + Sodium */}
      <div style={{ background: C.card, borderRadius: 16, padding: 14 }}>
        <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Other</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "Sugar", value: `${Math.round(totals.sugar)}g` },
            { label: "Sodium", value: `${Math.round(totals.sodium)}mg` },
          ].map(s => (
            <div key={s.label} style={{ background: C.surface, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: C.muted }}>{s.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Meals */}
      {meals.length > 0 && (
        <div style={{ background: C.card, borderRadius: 16, padding: 14 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Meals Logged</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {meals.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{m.confidence} confidence</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{Math.round(m.calories)} kcal</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score */}
      {score && (
        <div style={{ background: C.card, borderRadius: 16, padding: 14 }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Daily Score</div>
          <div style={{
            fontSize: 42, fontWeight: 900, lineHeight: 1,
            color: score.score >= 80 ? C.green : score.score >= 60 ? C.yellow : C.red
          }}>
            {score.score}<span style={{ fontSize: 15, color: C.muted }}>/100</span>
          </div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "Protein", key: "protein_stars" },
              { label: "Fiber", key: "fiber_stars" },
              { label: "Vegetables", key: "vegetables_stars" },
              { label: "Sugar", key: "sugar_stars" },
              { label: "Calories", key: "calories_stars" },
            ].map(r => (
              <div key={r.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: C.muted }}>{r.label}</span>
                <Stars count={score[r.key] || 0} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reset */}
      <button onClick={() => {
        setTotals({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });
        setExerciseCalories(0); setMeals([]); setScore(null);
      }} style={{
        background: "transparent", border: `1px solid ${C.border}`,
        color: C.muted, borderRadius: 10, padding: "9px 0",
        fontSize: 12, cursor: "pointer"
      }}>Reset Today's Data</button>
    </div>
  );

  if (isMobile && showDash) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <Dashboard />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", background: C.bg }}>
      {/* Chat Panel */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        borderRight: isMobile ? "none" : `1px solid ${C.border}`
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 18px", borderBottom: `1px solid ${C.border}`,
          background: C.surface, display: "flex", alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", background: C.accent,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17
            }}>🥗</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.3px" }}>Nouri</div>
              <div style={{ fontSize: 10, color: C.muted }}>Evidence-based nutrition coach</div>
            </div>
          </div>
          {isMobile && started && (
            <button onClick={() => setShowDash(true)} style={{
              background: C.accentSoft || "#6C63FF22", border: `1px solid ${C.accent}`,
              color: C.accent, borderRadius: 10, padding: "6px 12px",
              fontSize: 12, cursor: "pointer", fontWeight: 600
            }}>Stats →</button>
          )}
        </div>

        {/* Messages */}
        <div ref={chatRef} style={{
          flex: 1, overflowY: "auto", padding: "18px 14px",
          display: "flex", flexDirection: "column", gap: 10
        }}>
          {!started ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", gap: 14, textAlign: "center"
            }}>
              <div style={{ fontSize: 52 }}>🥗</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>Meet Nouri</div>
              <div style={{ color: C.muted, maxWidth: 260, fontSize: 14, lineHeight: 1.7 }}>
                Your personal evidence-based nutrition coach. Track meals, hit your macros, build better habits.
              </div>
              <button onClick={startChat} style={{
                background: C.accent, color: "#fff", border: "none",
                borderRadius: 14, padding: "13px 32px", fontSize: 15,
                fontWeight: 700, cursor: "pointer", marginTop: 6,
                boxShadow: "0 4px 20px #6C63FF44"
              }}>Get Started</button>
            </div>
          ) : (
            messages.filter(m => !m.hidden).map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "84%",
                  background: msg.role === "user" ? C.accent : C.card,
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  padding: "10px 14px", fontSize: 14, lineHeight: 1.65,
                  color: C.text, whiteSpace: "pre-wrap"
                }}>
                  {msg.role === "assistant" ? cleanText(msg.content) : msg.content}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 0" }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: "50%", background: C.accent,
                  animation: "bounce 1s infinite", animationDelay: `${i * 0.15}s`
                }} />
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        {started && (
          <div style={{
            padding: "10px 14px", borderTop: `1px solid ${C.border}`,
            background: C.surface, display: "flex", gap: 8
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Log a meal or ask anything..."
              style={{
                flex: 1, background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: "10px 14px", color: C.text,
                fontSize: 14, outline: "none", fontFamily: "Inter, sans-serif"
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                background: C.accent, border: "none", borderRadius: 12,
                width: 42, height: 42, cursor: "pointer", fontSize: 18,
                opacity: loading || !input.trim() ? 0.4 : 1,
                transition: "opacity 0.2s"
              }}
            >↑</button>
          </div>
        )}
      </div>

      {/* Dashboard — desktop only */}
      {!isMobile && <Dashboard />}
    </div>
  );
}
