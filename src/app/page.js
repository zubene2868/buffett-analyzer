"use client";
import { useState, useEffect, useCallback } from "react";

const BUFFETT_CRITERIA = [
  { key: "roe", label: "ROE (자기자본이익률)", ideal: "≥ 15%", weight: 20, desc: "버핏은 꾸준히 높은 ROE를 가진 기업을 선호합니다" },
  { key: "debtToEquity", label: "부채비율", ideal: "≤ 50%", weight: 15, desc: "낮은 부채는 재무 안정성을 의미합니다" },
  { key: "currentRatio", label: "유동비율", ideal: "≥ 1.5", weight: 10, desc: "단기 채무 상환 능력을 평가합니다" },
  { key: "profitMargin", label: "순이익률", ideal: "≥ 20%", weight: 15, desc: "경쟁 우위(모트)의 증거입니다" },
  { key: "per", label: "PER", ideal: "≤ 15", weight: 10, desc: "적정 가격에 매수하는 것이 핵심입니다" },
  { key: "pbr", label: "PBR", ideal: "≤ 1.5", weight: 10, desc: "자산 대비 저평가 여부를 판단합니다" },
  { key: "epsGrowth", label: "EPS 성장률(5Y)", ideal: "≥ 10%", weight: 10, desc: "지속적인 이익 성장이 중요합니다" },
  { key: "fcfYield", label: "잉여현금흐름 수익률", ideal: "≥ 5%", weight: 10, desc: "실제 현금 창출 능력을 봅니다" },
];

const SELL_SIGNALS = [
  { id: "rate_hike", label: "금리 인상 (0.5%p 이상)", severity: "high", desc: "급격한 금리 인상은 주식 가치평가에 부정적" },
  { id: "currency_drop", label: "원화 약세 (5% 이상)", severity: "medium", desc: "해외 투자 시 환차손 위험 증가" },
  { id: "pe_overvalued", label: "PER 역사적 고점 돌파", severity: "high", desc: "과열 신호 — 차익실현 고려" },
  { id: "margin_decline", label: "이익률 2분기 연속 하락", severity: "medium", desc: "경쟁 우위 약화 가능성" },
  { id: "debt_increase", label: "부채비율 급등 (전년 대비 30%↑)", severity: "high", desc: "재무 건전성 악화 신호" },
  { id: "recession_signal", label: "경기침체 지표 (장단기 금리 역전)", severity: "critical", desc: "시장 전반적 하락 가능성" },
];

const SAMPLE_RESULTS = [
  { ticker: "BRK-B", name: "Berkshire Hathaway B", market: "NYSE", score: 92, roe: 18.2, debtToEquity: 25, currentRatio: 2.1, profitMargin: 24, per: 12.5, pbr: 1.3, epsGrowth: 14, fcfYield: 6.2, verdict: "버핏 본인의 회사답게 거의 모든 기준을 충족합니다. 낮은 부채, 높은 ROE, 합리적 밸류에이션." },
  { ticker: "AAPL", name: "Apple Inc.", market: "NASDAQ", score: 88, roe: 160, debtToEquity: 176, currentRatio: 0.99, profitMargin: 26.3, per: 28, pbr: 45, epsGrowth: 12, fcfYield: 3.8, verdict: "압도적 이익률과 브랜드 파워(모트). 부채비율이 높지만 현금창출력이 이를 상쇄합니다." },
  { ticker: "KO", name: "Coca-Cola", market: "NYSE", score: 85, roe: 42, debtToEquity: 150, currentRatio: 1.1, profitMargin: 23, per: 24, pbr: 10, epsGrowth: 6, fcfYield: 4.1, verdict: "버핏의 대표 보유 종목. 강력한 브랜드 모트와 안정적 배당." },
  { ticker: "005930.KS", name: "삼성전자", market: "KRX", score: 78, roe: 8.5, debtToEquity: 30, currentRatio: 2.8, profitMargin: 12, per: 14, pbr: 1.2, epsGrowth: -5, fcfYield: 5.5, verdict: "낮은 부채와 합리적 밸류에이션. 반도체 사이클에 따라 변동성이 크나 PBR 기준 저평가." },
  { ticker: "JNJ", name: "Johnson & Johnson", market: "NYSE", score: 83, roe: 22, debtToEquity: 45, currentRatio: 1.4, profitMargin: 18, per: 15, pbr: 5.5, epsGrowth: 7, fcfYield: 4.5, verdict: "헬스케어 섹터의 대표 방어주. 62년 연속 배당 증가." },
  { ticker: "BAC", name: "Bank of America", market: "NYSE", score: 72, roe: 11, debtToEquity: 105, currentRatio: 0.8, profitMargin: 28, per: 11, pbr: 1.0, epsGrowth: 9, fcfYield: 7.2, verdict: "버핏이 대량 보유 중인 금융주. 현재 밸류에이션이 매력적." },
];

// --- API 호출 + JSON 파싱 헬퍼 ---
async function callClaudeJSON(prompt, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`API ${res.status}: ${errBody.slice(0, 200)}`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error + (data.detail ? ": " + data.detail.slice(0, 150) : ""));

      const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      if (!text) throw new Error("Empty response");
      const clean = text.replace(/```json\s?|```/g, "").trim();
      try { return JSON.parse(clean); } catch {}
      let depth = 0, start = -1;
      for (let i = 0; i < clean.length; i++) {
        if (clean[i] === "{") { if (depth === 0) start = i; depth++; }
        else if (clean[i] === "}") { depth--; if (depth === 0 && start !== -1) { try { return JSON.parse(clean.slice(start, i + 1)); } catch { start = -1; } } }
      }
      throw new Error("JSON 파싱 실패");
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

// --- UI 컴포넌트 ---
function ScoreBar({ score, size = "lg" }) {
  const color = score >= 85 ? "#10b981" : score >= 70 ? "#f59e0b" : score >= 50 ? "#f97316" : "#ef4444";
  const label = score >= 85 ? "강력 매수" : score >= 70 ? "매수 고려" : score >= 50 ? "중립" : "매수 부적합";
  const h = size === "lg" ? 32 : 20;
  const fs = size === "lg" ? 13 : 11;
  return (
    <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: h, background: "rgba(255,255,255,0.06)", borderRadius: h / 2, overflow: "hidden", position: "relative" }}>
        <div style={{ width: `${score}%`, height: "100%", background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: h / 2, transition: "width 1.2s cubic-bezier(.22,1,.36,1)", boxShadow: `0 0 20px ${color}44` }} />
        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: fs, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{score}/100</span>
      </div>
      <span style={{ fontSize: fs, fontWeight: 600, color, minWidth: 70, textAlign: "right" }}>{label}</span>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const map = {
    critical: { bg: "#dc262622", color: "#f87171", border: "#dc262644", label: "위험" },
    high: { bg: "#f9731822", color: "#fb923c", border: "#f9731844", label: "경고" },
    medium: { bg: "#f59e0b22", color: "#fbbf24", border: "#f59e0b44", label: "주의" },
    low: { bg: "#10b98122", color: "#34d399", border: "#10b98144", label: "양호" },
  };
  const s = map[severity] || map.medium;
  return <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{s.label}</span>;
}

function PulsingDot({ color }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: 8, height: 8 }}>
      <span style={{ position: "absolute", width: 8, height: 8, borderRadius: "50%", background: color, animation: "dotPulse 1.5s infinite" }} />
      <span style={{ position: "absolute", width: 8, height: 8, borderRadius: "50%", background: color, opacity: 0.4, animation: "dotPulseRing 1.5s infinite" }} />
    </span>
  );
}

// --- 메인 앱 ---
export default function BuffettAnalyzer() {
  const [tab, setTab] = useState("analyze");
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [sellChecked, setSellChecked] = useState({});
  const [animateIn, setAnimateIn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanProgress, setScanProgress] = useState("");
  const [rankingLoading, setRankingLoading] = useState(false);
  const [aiRanking, setAiRanking] = useState(null);
  const [rankingProgress, setRankingProgress] = useState("");
  const [rankingCategory, setRankingCategory] = useState("all");

  useEffect(() => { setAnimateIn(true); }, []);

  // --- 종목 분석 ---
  const analyzeStock = useCallback(async () => {
    if (!ticker.trim()) return;
    setLoading(true); setResults(null);
    try {
      const parsed = await callClaudeJSON(
        `You are a Warren Buffett-style value investing analyst. Analyze "${ticker.trim().toUpperCase()}".
Return ONLY valid JSON: {"ticker":"TICKER","name":"Company Name","market":"Exchange","score":85,"roe":18.5,"debtToEquity":30,"currentRatio":2.1,"profitMargin":22,"per":14,"pbr":1.3,"epsGrowth":12,"fcfYield":5.5,"verdict":"Korean 2-3 sentences"}
Use realistic financials. Score 0-100 based on Buffett criteria.`
      );
      setResults(parsed);
    } catch (err) {
      const sample = SAMPLE_RESULTS.find(s => s.ticker.toLowerCase() === ticker.trim().toLowerCase());
      setResults(sample || { ticker: ticker.trim().toUpperCase(), name: "분석 실패", market: "-", score: 0, roe: 0, debtToEquity: 0, currentRatio: 0, profitMargin: 0, per: 0, pbr: 0, epsGrowth: 0, fcfYield: 0, verdict: "오류: " + err.message });
    }
    setLoading(false);
  }, [ticker]);

  // --- 매도 시그널 스캔 ---
  const runAutoScan = useCallback(async () => {
    setScanning(true); setScanResult(null); setScanProgress("AI가 경제 상황을 분석 중...");
    try {
      const parsed = await callClaudeJSON(
        `You are a macro-economic analyst for Korean investors. Analyze current conditions.
Return ONLY valid JSON:
{"timestamp":"${new Date().toLocaleString("ko-KR")}","signals":{"rate_hike":{"active":false,"detail":"한글 설명","severity":"low"},"currency_drop":{"active":false,"detail":"한글 설명","severity":"low"},"pe_overvalued":{"active":false,"detail":"한글 설명","severity":"low"},"margin_decline":{"active":false,"detail":"한글 설명","severity":"low"},"debt_increase":{"active":false,"detail":"한글 설명","severity":"low"},"recession_signal":{"active":false,"detail":"한글 설명","severity":"low"}},"overall_risk":"low","summary":"한글 2-3문장 요약"}
Set active=true and severity (critical/high/medium/low) for concerning signals. Be realistic.`
      );
      setScanResult(parsed);
      if (parsed.signals) {
        const nc = {};
        Object.entries(parsed.signals).forEach(([k, v]) => { nc[k] = v.active; });
        setSellChecked(nc);
      }
    } catch (err) {
      setScanResult({ error: true, summary: "스캔 오류: " + err.message });
    }
    setScanProgress(""); setScanning(false);
  }, []);

  // --- 랭킹 스캔 ---
  const runRankingScan = useCallback(async (category) => {
    setRankingLoading(true); setAiRanking(null); setRankingProgress("AI가 종목 선별 중...");
    const catDesc = {
      all: "Mix of US, Korean, international stocks on Samsung Securities.",
      korea: "Korean KOSPI/KOSDAQ stocks on Samsung Securities.",
      us: "US NYSE/NASDAQ large-cap stocks on Samsung Securities.",
      dividend: "High-dividend US/Korean stocks with long growth history.",
    };
    try {
      const parsed = await callClaudeJSON(
        `You are a Buffett-style analyst for Korean investors. Recommend: ${catDesc[category] || catDesc.all}
Return ONLY valid JSON:
{"timestamp":"${new Date().toLocaleString("ko-KR")}","market_context":"한글 시장 요약 1-2문장","stocks":[{"ticker":"AAPL","name":"Apple","market":"NASDAQ","score":88,"roe":160,"per":28,"profitMargin":26,"fcfYield":3.8,"verdict":"한글 1-2문장"}]}
Return exactly 8 stocks sorted by score desc. Realistic data. Korean verdicts.`
      );
      setAiRanking(parsed);
    } catch (err) {
      setAiRanking({ error: true, market_context: "랭킹 오류: " + err.message });
    }
    setRankingProgress(""); setRankingLoading(false);
  }, []);

  const metricDisplay = (item, val) => {
    let good = false;
    switch (item.key) {
      case "roe": good = val >= 15; break; case "debtToEquity": good = val <= 50; break;
      case "currentRatio": good = val >= 1.5; break; case "profitMargin": good = val >= 20; break;
      case "per": good = val <= 15 && val > 0; break; case "pbr": good = val <= 1.5 && val > 0; break;
      case "epsGrowth": good = val >= 10; break; case "fcfYield": good = val >= 5; break;
    }
    return { good, color: good ? "#10b981" : "#f59e0b" };
  };

  const StockCard = ({ stock, i, prefix = "" }) => {
    const key = prefix + stock.ticker;
    return (
      <div onClick={() => setExpandedCard(expandedCard === key ? null : key)} style={{ marginBottom: 10, borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", transition: "all 0.3s", animation: `fadeIn 0.5s ease-out ${i * 0.08}s both` }}>
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: i === 0 ? "linear-gradient(135deg,#fbbf24,#f59e0b)" : i === 1 ? "linear-gradient(135deg,#94a3b8,#64748b)" : i === 2 ? "linear-gradient(135deg,#d97706,#b45309)" : "rgba(255,255,255,0.06)", fontSize: 16, fontWeight: 900, color: i < 3 ? "#0a0e17" : "#64748b", boxShadow: i === 0 ? "0 4px 15px #fbbf2433" : "none" }}>{i + 1}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9" }}>{stock.ticker}</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>{stock.name}</span>
              <span style={{ fontSize: 10, color: "#475569", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4 }}>{stock.market}</span>
              {prefix && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(59,130,246,0.15)", color: "#60a5fa", fontWeight: 600 }}>AI 추천</span>}
            </div>
            <div style={{ marginTop: 6 }}><ScoreBar score={stock.score} size="sm" /></div>
          </div>
          <div style={{ fontSize: 12, color: "#475569", transition: "transform 0.3s", transform: expandedCard === key ? "rotate(180deg)" : "rotate(0)" }}>▼</div>
        </div>
        {expandedCard === key && (
          <div style={{ padding: "0 20px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: "12px 0" }}>
              {[
                { label: "ROE", val: `${stock.roe ?? "-"}%`, good: (stock.roe ?? 0) >= 15 },
                { label: "PER", val: `${stock.per ?? "-"}x`, good: (stock.per ?? 99) <= 15 },
                { label: "이익률", val: `${stock.profitMargin ?? "-"}%`, good: (stock.profitMargin ?? 0) >= 20 },
                { label: "FCF", val: `${stock.fcfYield ?? "-"}%`, good: (stock.fcfYield ?? 0) >= 5 },
              ].map(m => (
                <div key={m.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#64748b" }}>{m.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: m.good ? "#10b981" : "#f59e0b" }}>{m.val}</div>
                </div>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: "#94a3b8", padding: "8px 0" }}>{stock.verdict}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e17", fontFamily: "'Noto Sans KR','Pretendard',-apple-system,sans-serif", color: "#e2e8f0" }}>
      <div style={{ position: "fixed", top: -200, right: -200, width: 600, height: 600, background: "radial-gradient(circle,#1e3a5f22 0%,transparent 70%)", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ padding: "32px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "linear-gradient(180deg,#0f1520,#0a0e17)", opacity: animateIn ? 1 : 0, transform: animateIn ? "translateY(0)" : "translateY(-20px)", transition: "all 0.8s cubic-bezier(.22,1,.36,1)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 4px 20px #10b98133" }}>📊</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>Buffett Value Analyzer</h1>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>워렌 버핏 스타일 가치투자 분석 시스템</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", maxWidth: 800, margin: "0 auto", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 24px" }}>
        {[{ id: "analyze", label: "종목 분석", icon: "🔍" }, { id: "ranking", label: "추천 랭킹", icon: "🏆" }, { id: "sell", label: "매도 시그널", icon: "🚨" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "14px 20px", fontSize: 13, fontWeight: 600, border: "none", background: "transparent", color: tab === t.id ? "#10b981" : "#64748b", borderBottom: tab === t.id ? "2px solid #10b981" : "2px solid transparent", cursor: "pointer", transition: "all 0.3s" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 24px 60px" }}>

        {/* ===== ANALYZE ===== */}
        {tab === "analyze" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 24, background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
              <input value={ticker} onChange={e => setTicker(e.target.value)} onKeyDown={e => e.key === "Enter" && analyzeStock()} placeholder="티커 입력 (예: AAPL, 005930.KS, TSLA)" style={{ flex: 1, padding: "12px 16px", fontSize: 14, border: "none", background: "transparent", color: "#f1f5f9", outline: "none", fontFamily: "inherit" }} />
              <button onClick={analyzeStock} disabled={loading} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: loading ? "#1e293b" : "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "wait" : "pointer", boxShadow: loading ? "none" : "0 4px 15px #10b98133" }}>
                {loading ? "분석 중..." : "버핏 분석"}
              </button>
            </div>
            {loading && <div style={{ textAlign: "center", padding: 60 }}><div style={{ fontSize: 40, marginBottom: 16, animation: "pulse 1.5s infinite" }}>📈</div><p style={{ color: "#64748b", fontSize: 14 }}>AI가 분석 중입니다...</p></div>}
            {results && !loading && (
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", animation: "fadeIn 0.6s ease-out" }}>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div>
                      <span style={{ fontSize: 11, color: "#64748b" }}>{results.market}</span>
                      <h2 style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>{results.ticker} <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 14 }}>{results.name}</span></h2>
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: results.score >= 85 ? "#10b981" : results.score >= 70 ? "#f59e0b" : "#ef4444" }}>{results.score}</div>
                  </div>
                  <ScoreBar score={results.score} />
                </div>
                <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 10 }}>
                  {BUFFETT_CRITERIA.map(item => {
                    const val = results[item.key]; const { good, color } = metricDisplay(item, val);
                    return (<div key={item.key} style={{ padding: "12px 14px", borderRadius: 10, background: good ? "rgba(16,185,129,0.06)" : "rgba(245,158,11,0.06)", border: `1px solid ${good ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)"}` }}>
                      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color }}>{typeof val === "number" ? val.toFixed(1) : val}{["roe", "profitMargin", "epsGrowth", "fcfYield", "debtToEquity"].includes(item.key) ? "%" : "x"}</div>
                      <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>기준: {item.ideal}</div>
                    </div>);
                  })}
                </div>
                <div style={{ margin: "0 24px 24px", padding: 18, borderRadius: 12, background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.1)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981", marginBottom: 6 }}>💡 버핏 관점 분석</div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: "#cbd5e1" }}>{results.verdict}</p>
                </div>
              </div>
            )}
            {!results && !loading && (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>🔎</div>
                <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.8 }}>티커를 입력하면 AI가 버핏의 투자 원칙에 따라<br />재무제표를 분석하고 점수를 매깁니다</p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
                  {["AAPL", "005930.KS", "BRK-B", "MSFT", "KO"].map(t => (
                    <button key={t} onClick={() => setTicker(t)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}>{t}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== RANKING ===== */}
        {tab === "ranking" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {[{ id: "all", label: "🌍 전체" }, { id: "korea", label: "🇰🇷 한국주식" }, { id: "us", label: "🇺🇸 미국주식" }, { id: "dividend", label: "💰 배당주" }].map(c => (
                <button key={c.id} onClick={() => setRankingCategory(c.id)} style={{ padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, border: rankingCategory === c.id ? "1px solid #10b98144" : "1px solid rgba(255,255,255,0.08)", background: rankingCategory === c.id ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.03)", color: rankingCategory === c.id ? "#10b981" : "#64748b", cursor: "pointer" }}>{c.label}</button>
              ))}
            </div>
            <button onClick={() => runRankingScan(rankingCategory)} disabled={rankingLoading} style={{ width: "100%", padding: "16px 20px", borderRadius: 14, border: "none", background: rankingLoading ? "linear-gradient(90deg,#1e293b,#334155,#1e293b)" : "linear-gradient(135deg,#10b981,#059669)", backgroundSize: rankingLoading ? "200% 100%" : "100%", animation: rankingLoading ? "shimmer 1.5s linear infinite" : "none", color: "#fff", fontSize: 15, fontWeight: 800, cursor: rankingLoading ? "wait" : "pointer", marginBottom: 20, boxShadow: rankingLoading ? "none" : "0 4px 20px #10b98133", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              {rankingLoading ? <><span style={{ animation: "pulse 1s infinite" }}>🔄</span>{rankingProgress || "AI 분석 중..."}</> : <>🤖 AI 실시간 종목 추천</>}
            </button>
            {aiRanking && !aiRanking.error && (<>
              <div style={{ marginBottom: 16, padding: "14px 18px", borderRadius: 12, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", animation: "fadeIn 0.5s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><PulsingDot color="#3b82f6" /><span style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa" }}>AI 실시간 추천</span><span style={{ fontSize: 11, color: "#475569", marginLeft: "auto" }}>{aiRanking.timestamp}</span></div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: "#cbd5e1" }}>{aiRanking.market_context}</p>
              </div>
              {(aiRanking.stocks || []).map((s, i) => <StockCard key={s.ticker + i} stock={s} i={i} prefix="ai-" />)}
            </>)}
            {aiRanking?.error && <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}><p style={{ margin: 0, fontSize: 13, color: "#f87171" }}>⚠️ {aiRanking.market_context}</p></div>}
            {!aiRanking && !rankingLoading && (<>
              <div style={{ padding: 16, marginBottom: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}><p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>📋 기본 샘플입니다. 위 버튼으로 AI 실시간 추천을 받아보세요.</p></div>
              {[...SAMPLE_RESULTS].sort((a, b) => b.score - a.score).map((s, i) => <div key={s.ticker} style={{ opacity: 0.5 }}><StockCard stock={s} i={i} /></div>)}
            </>)}
          </div>
        )}

        {/* ===== SELL SIGNALS ===== */}
        {tab === "sell" && (
          <div>
            <button onClick={runAutoScan} disabled={scanning} style={{ width: "100%", padding: "16px 20px", borderRadius: 14, border: "none", background: scanning ? "linear-gradient(90deg,#1e293b,#334155,#1e293b)" : "linear-gradient(135deg,#f59e0b,#d97706)", backgroundSize: scanning ? "200% 100%" : "100%", animation: scanning ? "shimmer 1.5s linear infinite" : "none", color: "#fff", fontSize: 15, fontWeight: 800, cursor: scanning ? "wait" : "pointer", marginBottom: 20, boxShadow: scanning ? "none" : "0 4px 20px #f59e0b33", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              {scanning ? <><span style={{ animation: "pulse 1s infinite" }}>🔄</span>{scanProgress || "AI 스캔 중..."}</> : <>🤖 AI 자동 시그널 스캔</>}
            </button>
            {scanResult && !scanResult.error && (
              <div style={{ marginBottom: 20, padding: "18px 20px", borderRadius: 14, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", animation: "fadeIn 0.5s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><PulsingDot color="#3b82f6" /><span style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa" }}>AI 분석 완료</span><span style={{ fontSize: 11, color: "#475569", marginLeft: "auto" }}>{scanResult.timestamp}</span></div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.8, color: "#cbd5e1" }}>{scanResult.summary}</p>
              </div>
            )}
            {scanResult?.error && <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}><p style={{ margin: 0, fontSize: 13, color: "#f87171" }}>⚠️ {scanResult.summary}</p></div>}
            <div style={{ padding: 16, marginBottom: 20, borderRadius: 12, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)" }}>
              <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>🚨 AI 스캔 버튼으로 자동 판단하거나, 체크박스를 직접 클릭해 조정할 수 있습니다.</p>
            </div>
            {(() => { const c = Object.values(sellChecked).filter(Boolean).length; const lv = c >= 4 ? "매도 강력 권고" : c >= 2 ? "리스크 주의" : c >= 1 ? "모니터링" : "안정"; const mc = c >= 4 ? "#ef4444" : c >= 2 ? "#f59e0b" : c >= 1 ? "#3b82f6" : "#10b981"; return (
              <div style={{ marginBottom: 20, padding: "16px 20px", borderRadius: 12, background: `${mc}08`, border: `1px solid ${mc}22`, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, background: `${mc}15`, border: `2px solid ${mc}33` }}>{c >= 4 ? "🔴" : c >= 2 ? "🟡" : c >= 1 ? "🔵" : "🟢"}</div>
                <div><div style={{ fontSize: 18, fontWeight: 800, color: mc }}>{lv}</div><div style={{ fontSize: 12, color: "#64748b" }}>{c}/{SELL_SIGNALS.length} 시그널 활성화</div></div>
              </div>);
            })()}
            {SELL_SIGNALS.map((signal, i) => { const sd = scanResult?.signals?.[signal.id]; const active = sellChecked[signal.id]; return (
              <div key={signal.id} onClick={() => setSellChecked(p => ({ ...p, [signal.id]: !p[signal.id] }))} style={{ marginBottom: 8, padding: "14px 18px", borderRadius: 12, cursor: "pointer", background: active ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)", border: active ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(255,255,255,0.06)", transition: "all 0.3s", animation: `fadeIn 0.4s ease-out ${i * 0.06}s both` }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: active ? "2px solid #ef4444" : "2px solid #334155", background: active ? "#ef4444" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff" }}>{active && "✓"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{signal.label}</span>
                      <SeverityBadge severity={sd ? sd.severity : signal.severity} />
                      {sd && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(59,130,246,0.15)", color: "#60a5fa", fontWeight: 600 }}>AI 스캔</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>{sd ? sd.detail : signal.desc}</p>
                  </div>
                </div>
              </div>);
            })}
            <div style={{ marginTop: 24, padding: 18, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>📖 버핏의 매도 원칙</div>
              <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.8 }}>"기업의 경쟁 우위가 사라졌을 때, 경영진을 신뢰할 수 없을 때, 더 좋은 투자 기회가 있을 때만 매도하라."<br /><br />단일 시그널보다는 복합 시그널에 주목하세요.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
