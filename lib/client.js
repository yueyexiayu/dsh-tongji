window.__ModuleLoader__.load({
  id: "tongji",
  factory: (require) => {
    var React = require("react");
    var h = React.createElement;
    var inject = ["slots", "sidebarRightTabs", "sidebarRight", "uiConversation", "sessions", "locale"];
    var TAB_ID = "tongji";
    var TAB_KIND = "tongji";
    var STYLE_ID = "tongji-style";
    var LOCALE_NS = "tongji";
    var openedSessions = new Set();
    var dictionaries = {
      zh: {
        "tab.title": "统计", "tab.guide": "查看当前会话的上下文、缓存命中与输出数据",
        "header.kicker": "会话洞察", "header.title": "会话统计", "status.loading": "加载中",
        "status.updated": "已更新", "status.failed": "更新失败", "error.stale": "统计更新失败，当前显示上次成功的数据。",
        "error.empty": "统计读取失败，请重试。", "error.code": "错误：{code}", "error.updatedAt": "上次成功更新：{time}",
        "action.retry": "重试", "section.total": "总计", "section.turns": "每轮",
        "total.title": "会话总计", "metric.context": "累计上下文", "metric.cache": "缓存命中（已知）",
        "metric.output": "累计输出", "metric.speed": "主代理输出速度", "counts": "{turns} 轮 · {steps} 步",
        "turn.number": "第 {turn} 轮", "turn.running": "进行中", "step.number": "步骤 {step}",
        "status.success": "成功", "status.running": "进行中", "status.failed": "失败", "status.interrupted": "已中断", "partial": "（部分）", "answer.prefix": "回答：",
        "turn.tooltip": "累计上下文 · 已知缓存命中 · 累计输出 · 主代理输出速度",
        "step.tooltip": "上下文 · 缓存命中 · 输出 · 输出速度", "action.loadOlder": "加载更早轮次",
        "action.loadingOlder": "正在加载更早轮次…", "history.complete": "已显示全部历史轮次",
        "empty.turns": "暂无轮次数据", "empty.notReady": "统计数据尚未就绪", "empty.session": "当前没有可用会话",
        "label.contextShort": "上", "label.cacheShort": "缓", "label.outputShort": "出", "label.speedShort": "速",
        "moreCalls": "还有 {count} 次", "unassigned": "未归属：上 {context} · 出 {output}", "history.error": "更早轮次加载失败，请重试。", "cache.exact": "缓存读取 {read} / 提示输入 {input}",
        "note": "上下文和输出为累计用量，含可读取的子代理及重试；子代理计入创建它的轮次。+ 表示存在未知用量，— 表示没有可用数据；缓存命中仅按报告缓存读取的样本计算，“部分”表示有未计入的用量。速度和步骤仅显示主代理。"
      },
      en: {
        "tab.title": "Statistics", "tab.guide": "Inspect context, cache reuse, and output for this session",
        "header.kicker": "SESSION INSIGHTS", "header.title": "Session statistics", "status.loading": "Loading",
        "status.updated": "Updated", "status.failed": "Update failed", "error.stale": "Update failed. Showing the last successful data.",
        "error.empty": "Statistics could not be loaded. Please retry.", "error.code": "Error: {code}", "error.updatedAt": "Last successful update: {time}",
        "action.retry": "Retry", "section.total": "Totals", "section.turns": "Turns",
        "total.title": "Session totals", "metric.context": "Cumulative context", "metric.cache": "Cache hit (known)",
        "metric.output": "Cumulative output", "metric.speed": "Lead output speed", "counts": "{turns} turns · {steps} steps",
        "turn.number": "Turn {turn}", "turn.running": "Running", "step.number": "Step {step}",
        "status.success": "Succeeded", "status.running": "Running", "status.failed": "Failed", "status.interrupted": "Interrupted", "partial": " (partial)", "answer.prefix": "Answer: ",
        "turn.tooltip": "Cumulative context · Known cache hit · Cumulative output · Lead output speed",
        "step.tooltip": "Context · Cache hit · Output · Output speed", "action.loadOlder": "Load earlier turns",
        "action.loadingOlder": "Loading earlier turns…", "history.complete": "All turns are shown",
        "empty.turns": "No turn data", "empty.notReady": "Statistics are not ready", "empty.session": "No session is available",
        "label.contextShort": "In", "label.cacheShort": "Cache", "label.outputShort": "Out", "label.speedShort": "Speed",
        "moreCalls": "{count} more calls", "unassigned": "Unassigned: in {context} · out {output}", "history.error": "Earlier turns could not be loaded. Please retry.", "cache.exact": "{read} cached / {input} prompt tokens",
        "note": "Context and output are cumulative and include readable subagents and retries. A subagent is assigned to the turn that created it. + means some usage is unknown; — means no data is available. Cache hit uses only samples that report cache reads, and “partial” marks excluded samples. Speed and steps cover the lead agent only."
      }
    };

    var css = [
      ".sr-root{height:100%;min-height:0;overflow:auto;box-sizing:border-box;padding:16px 14px 24px;background:var(--dsw-alias-bg-base,#f5f7fa);color:var(--dsw-alias-label-primary,#20242a);font:12px/1.45 -apple-system,BlinkMacSystemFont,'SF Pro Text',var(--dsw-font-family,system-ui),sans-serif}",
      ".sr-root *{box-sizing:border-box}.sr-header{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:15px}.sr-kicker{font-size:10px;line-height:1.2;letter-spacing:.08em;color:var(--dsw-alias-label-tertiary,#8b9198);text-transform:uppercase}.sr-title{font-size:18px;line-height:1.2;font-weight:700;letter-spacing:-.02em;margin:3px 0 0}.sr-header-meta{display:flex;align-items:center;gap:5px;padding:5px 8px;border:1px solid var(--dsw-alias-border-l3,#e1e4e9);border-radius:999px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#686f78);font-size:11px;white-space:nowrap}.sr-header-meta::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor}.sr-header-meta-loading{color:var(--dsw-alias-state-warn-primary,#c58a18)}.sr-header-meta-success{color:var(--dsw-alias-state-success-primary,#2e9b63)}.sr-header-meta-failed{color:var(--dsw-alias-state-error-primary,#d04444)}",
      ".sr-section{margin-top:16px}.sr-section-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px;color:var(--dsw-alias-label-secondary,#656b73);font-size:11px;font-weight:700;letter-spacing:.04em}.sr-section-title::after{content:'';height:1px;flex:1;background:var(--dsw-alias-border-l3,#e1e4e9);order:-1;margin-right:2px}.sr-section-count{font-variant-numeric:tabular-nums}",
      ".sr-total,.sr-turn{border:1px solid var(--dsw-alias-border-l3,#e1e4e9);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#fff)}.sr-total{padding:15px;border-radius:14px;box-shadow:0 2px 8px rgb(30 41 59 / 5%)}.sr-total-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:11px}.sr-total-label{font-size:12px;font-weight:700}.sr-total-count{font-size:11px;color:var(--dsw-alias-label-tertiary,#8b9198);font-variant-numeric:tabular-nums}.sr-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.sr-metric{min-width:0;padding:10px;border:1px solid var(--dsw-alias-border-l3,#edf0f3);border-radius:10px;background:var(--dsw-alias-bg-base,#f8fafc)}.sr-label{display:block;color:var(--dsw-alias-label-secondary,#737982);font-size:10px;line-height:1.2}.sr-value{display:block;margin-top:4px;font-size:15px;line-height:1.15;font-weight:650;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}",
      ".sr-turn-list{max-height:52vh;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l2,#cbd2da) transparent;padding:1px 3px 2px 0}.sr-turn{margin-top:8px;overflow:hidden;border-radius:12px;box-shadow:0 1px 3px rgb(30 41 59 / 4%)}.sr-turn>summary{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;min-height:55px;padding:12px;cursor:pointer;list-style:none}.sr-turn>summary::-webkit-details-marker{display:none}.sr-turn>summary:hover{background:var(--dsw-alias-interactive-bg-hover,#f0f2f5)}.sr-turn>summary:focus-visible,.sr-load-older:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#007aff);outline-offset:-2px}.sr-turn-top{display:flex;align-items:center;gap:8px;min-width:0;flex:1 1 100%}.sr-turn-number{flex:0 0 auto;font-size:12px;font-weight:650;white-space:nowrap}.sr-turn-answer{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--dsw-alias-label-secondary,#686f78)}.sr-turn-metrics{flex:1 1 100%;padding-left:11px;color:var(--dsw-alias-label-secondary,#686f78);font-size:10px;white-space:nowrap;font-variant-numeric:tabular-nums}",
      ".sr-steps{border-top:1px solid var(--dsw-alias-border-l3,#e1e4e9);padding:3px 10px 7px}.sr-step{padding:9px 0;border-bottom:1px solid var(--dsw-alias-border-l3,#e9ebee)}.sr-step:last-child{border-bottom:0}.sr-step-head{display:flex;justify-content:space-between;gap:8px}.sr-step-head strong{font-size:11px}.sr-step-summary{margin-top:2px;color:var(--dsw-alias-label-secondary,#686f78);font-size:11px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.sr-tool{color:var(--dsw-alias-label-primary,#30343a)}.sr-status{display:inline-flex;align-items:center;gap:4px;margin-right:7px;padding:2px 6px;border-radius:999px;font-size:10px;font-weight:650}.sr-status::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor}.sr-status-success{color:var(--dsw-alias-state-success-primary,#2e9b63);background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#2e9b63) 12%,transparent)}.sr-status-failed{color:var(--dsw-alias-state-error-primary,#d04444);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d04444) 12%,transparent)}.sr-status-running{color:var(--dsw-alias-state-warn-primary,#c58a18);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#c58a18) 12%,transparent)}",
      ".sr-empty{padding:22px 4px;color:var(--dsw-alias-label-secondary,#737982)}.sr-load-older{width:100%;margin:8px 0 2px;padding:9px;border:1px solid var(--dsw-alias-border-l3,#dfe4e9);border-radius:10px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#656b73);font:inherit;font-size:11px;cursor:pointer}.sr-load-older:disabled{cursor:default;opacity:.65}.sr-load-older:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#f0f2f5)}.sr-muted{color:var(--dsw-alias-label-secondary,#757b85)}.sr-note{margin-top:13px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l3,#e5e8ec);color:var(--dsw-alias-label-tertiary,#8b9198);font-size:10px;line-height:1.45}"
    ].join("");

    function ensureStyle() {
      var style = document.getElementById(STYLE_ID);
      if (!style) { style = document.createElement("style"); style.id = STYLE_ID; document.head.appendChild(style); }
      style.textContent = css;
    }

    function isNumber(value) { return typeof value === "number" && Number.isFinite(value); }
    function tokens(value) {
      if (!isNumber(value)) return "—";
      if (value >= 1000000) return (value / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
      return value >= 1000 ? (value / 1000).toFixed(1).replace(/\.0$/, "") + "K" : value.toLocaleString();
    }
    function exact(value) { return isNumber(value) ? value.toLocaleString() : undefined; }
    function percent(value) { return isNumber(value) ? (value * 100).toFixed(2) + "%" : "—"; }
    function speed(value) { return isNumber(value) ? value.toFixed(1) + " tok/s" : "—"; }
    function usageContext(value) { return value && value.samples ? value.input + value.read + value.write : null; }
    function usageNumber(value, field) { return field === "context" ? usageContext(value) : value && value.samples ? value.output : null; }
    function usageTokens(value, field) {
      var number = usageNumber(value, field);
      return number === null ? "—" : tokens(number) + (value.unknown || (field === "context" && value.cacheMissing) ? "+" : "");
    }
    function usageExact(value, field) {
      var number = usageNumber(value, field);
      return number === null ? undefined : exact(number) + (value.unknown || (field === "context" && value.cacheMissing) ? "+" : "");
    }
    function usageHit(value, t) {
      if (!value || !value.cacheSamples || !(value.cacheInput > 0)) return "—";
      return percent(Math.min(1, value.read / value.cacheInput)) + (value.cacheMissing || value.unknown ? t("partial") : "");
    }
    function usageCacheExact(value, t) {
      if (!value || !value.cacheSamples || !(value.cacheInput > 0)) return undefined;
      return t("cache.exact", { read: exact(value.read), input: exact(value.cacheInput) }) + (value.cacheMissing || value.unknown ? t("partial") : "");
    }

    function getter(props, key) { return typeof props[key] === "function" ? props[key] : function (name) { return name + "." + key; }; }
    function Metric(props) {
      return h("div", { className: "sr-metric" },
        h("span", { className: "sr-label" }, props.label),
        h("span", { className: "sr-value", title: props.title || undefined }, props.value));
    }

    function TotalCard(props) {
      var stats = props.stats, usage = props.usage, t = getter(props, "t");
      if (!stats || !usage) return h("div", { className: "sr-empty" }, t("empty.notReady"));
      var throughput = stats.decodeMs > 0 ? stats.decodeTokens / (stats.decodeMs / 1000) : null;
      return h("div", { className: "sr-total" },
        h("div", { className: "sr-total-head" },
          h("span", { className: "sr-total-label" }, t("total.title")),
          h("span", { className: "sr-total-count" }, t("counts", { turns: stats.turns, steps: stats.steps }))
        ),
        h("div", { className: "sr-grid" },
          h(Metric, { label: t("metric.context"), value: usageTokens(usage, "context"), title: usageExact(usage, "context") }),
          h(Metric, { label: t("metric.cache"), value: usageHit(usage, t), title: usageCacheExact(usage, t) }),
          h(Metric, { label: t("metric.output"), value: usageTokens(usage, "output"), title: usageExact(usage, "output") }),
          h(Metric, { label: t("metric.speed"), value: stats.steps === 0 ? "—" : speed(throughput) })
        ));
    }

    function answerPreview(answer) {
      if (typeof answer !== "string") return "";
      return (answer.split("\n").find(function (part) { return part.trim() !== ""; }) || "").trim();
    }

    function callGroups(calls) {
      var groups = new Map();
      (Array.isArray(calls) ? calls : []).forEach(function (call) {
        var name = call.name || "?";
        var hint = call.hint || "";
        var key = name + "\u0000" + hint;
        var group = groups.get(key);
        if (group) group.count += 1;
        else groups.set(key, { name: name, hint: hint, count: 1 });
      });
      return Array.from(groups.values());
    }

    function stepStatus(step, t) {
      var calls = Array.isArray(step.calls) ? step.calls : [];
      if ((Number(step.toolErrors) || 0) > 0 || calls.some(function (call) { return call.error === true; }) || step.aborted === true || step.interrupted === true) return { label: t("status.failed"), className: "sr-status-failed" };
      if (step.running === true || (Number(step.toolPending) || 0) > 0) return { label: t("status.running"), className: "sr-status-running" };
      return { label: t("status.success"), className: "sr-status-success" };
    }

    function stepSummary(step, t) {
      var groups = callGroups(step.calls);
      if (groups.length) {
        var shown = groups.slice(0, 3).map(function (item) {
          return item.name + (item.count > 1 ? " ×" + item.count : "") + (item.hint ? " " + item.hint : "");
        });
        var shownCalls = groups.slice(0, 3).reduce(function (sum, item) { return sum + item.count; }, 0);
        var totalCalls = (Array.isArray(step.tools) ? step.tools : []).reduce(function (sum, item) { return sum + item.count; }, 0);
        if (totalCalls > shownCalls) shown.push(t("moreCalls", { count: totalCalls - shownCalls }));
        return h("span", { className: "sr-tool" }, shown.join(" · "));
      }
      var answer = answerPreview(step.answer);
      if (answer) return t("answer.prefix") + answer;
      if (step.running) return t("status.running");
      if (step.interrupted || step.aborted) return t("status.interrupted");
      return "—";
    }

    function TurnCard(props) {
      var turn = props.turn, usage = props.usage, t = getter(props, "t");
      var answer = typeof turn.answer === "string" && turn.answer.trim() ? turn.answer : "";
      var openState = React.useState(false);
      var open = openState[0], setOpen = openState[1];
      return h("details", { className: "sr-turn", onToggle: function (event) { setOpen(event.currentTarget.open === true); } },
        h("summary", null,
          h("span", { className: "sr-turn-top" },
            h("span", { className: "sr-turn-number" }, t("turn.number", { turn: turn.turn })),
            h("span", { className: "sr-turn-answer", title: answer || undefined }, answer || (turn.running ? t("turn.running") : ""))
          ),
          h("span", { className: "sr-turn-metrics", title: t("turn.tooltip") }, [t("label.contextShort") + " " + usageTokens(usage, "context"), t("label.cacheShort") + " " + usageHit(usage, t), t("label.outputShort") + " " + usageTokens(usage, "output"), t("label.speedShort") + " " + speed(turn.tps)].join(" · "))
        ),
        open ? h("div", { className: "sr-steps" }, turn.steps.map(function (step) {
          var status = stepStatus(step, t);
          return h("div", { className: "sr-step", key: String(step.step) },
            h("div", { className: "sr-step-head" }, h("strong", null, t("step.number", { step: step.step })), h("span", { className: "sr-muted", title: t("step.tooltip") }, [t("label.contextShort") + " " + tokens(step.context), t("label.cacheShort") + " " + percent(step.cacheHit), t("label.outputShort") + " " + tokens(step.output), t("label.speedShort") + " " + speed(step.tps)].join(" · "))),
            h("div", { className: "sr-step-summary" }, h("span", { className: "sr-status " + status.className }, status.label), stepSummary(step, t))
          );
        })) : null
      );
    }

    function sessionIdOf(props) {
      var info = props && typeof props.useTabInfo === "function" ? props.useTabInfo() : null;
      return props && props.sessionId || info && info.tab && info.tab.sessionId || "";
    }

    function StatsPane(props) {
      if (typeof props.useLocale === "function") props.useLocale(function (value) { return value.revision; });
      var sessionId = sessionIdOf(props);
      var useStats = props.useStats, useProjection = props.useProjection, useSession = props.useSession;
      var snapshot = typeof useStats === "function" ? useStats(function (value) { return value; }) : null;
      var sessionSnapshot = typeof useSession === "function" ? useSession(function (value) { return value; }) : null;
      var stats = typeof useProjection === "function" ? useProjection("sessionStats") : undefined;
      var t = getter(props, "t");
      var usageState = React.useState(null);
      var result = usageState[0], setResult = usageState[1];
      var retryState = React.useState(0);
      var retry = retryState[0], setRetry = retryState[1];
      var loadingState = React.useState(true);
      var loading = loadingState[0], setLoading = loadingState[1];
      var current = result && result.sessionId === sessionId ? result : null;
      var usage = current && current.usage;
      var usageError = current && current.error;
      var updatedAt = current && current.updatedAt;
      var pagingRef = React.useRef(false);
      var pagingErrorState = React.useState(false);
      var pagingError = pagingErrorState[0], setPagingError = pagingErrorState[1];
      var turns = snapshot && Array.isArray(snapshot.turns) ? snapshot.turns : [];
      var running = turns.some(function (turn) { return turn.running === true; });
      var hasMore = !!(sessionSnapshot && sessionSnapshot.hasMore);
      var loadingOlder = !!(sessionSnapshot && sessionSnapshot.loadingOlder);
      var loadOlder = props.loadOlder;

      React.useEffect(function () {
        if (!sessionId) return;
        var stopped = false;
        var timer;
        var controller = new AbortController();
        function refresh() {
          if (!stopped) setLoading(true);
          fetch("/api/tongji/usage?" + new URLSearchParams({ sessionId: sessionId }), { signal: controller.signal })
            .then(function (response) { return response.json().catch(function () { return {}; }).then(function (value) { if (!response.ok) throw Object.assign(new Error("statistics unavailable"), { code: value && value.error && value.error.code || "usage-unavailable" }); return value; }); })
            .then(function (value) { if (!stopped) { setResult({ sessionId: sessionId, usage: value, error: null, updatedAt: Date.now() }); setLoading(false); } })
            .catch(function (error) { if (!stopped) { setResult(function (previous) { return { sessionId: sessionId, usage: previous && previous.sessionId === sessionId ? previous.usage : null, error: error && error.code || "usage-unavailable", updatedAt: previous && previous.sessionId === sessionId ? previous.updatedAt : null }; }); setLoading(false); } })
            .finally(function () { if (!stopped) timer = setTimeout(refresh, running ? 5000 : 30000); });
        }
        refresh();
        return function () { stopped = true; controller.abort(); clearTimeout(timer); };
      }, [sessionId, running, retry]);

      function requestOlder() {
        if (!hasMore || loadingOlder || pagingRef.current || typeof loadOlder !== "function") return;
        pagingRef.current = true;
        setPagingError(false);
        Promise.resolve(loadOlder()).then(function () { pagingRef.current = false; }, function () { pagingRef.current = false; setPagingError(true); });
      }

      if (!sessionId) return h("div", { className: "sr-root" }, h("div", { className: "sr-empty" }, t("empty.session")));
      var statusClass = loading ? "sr-header-meta-loading" : usageError ? "sr-header-meta-failed" : !usage ? "sr-header-meta-loading" : "sr-header-meta-success";
      var statusText = loading ? t("status.loading") : usageError ? t("status.failed") : !usage ? t("status.loading") : t("status.updated");
      var errorText = usage ? t("error.stale") : t("error.empty");
      var timeText = updatedAt ? new Date(updatedAt).toLocaleString() : "";

      return h("div", { className: "sr-root", "data-session-id": sessionId },
        h("div", { className: "sr-header" },
          h("div", null, h("div", { className: "sr-kicker" }, t("header.kicker")), h("h2", { className: "sr-title" }, t("header.title"))),
          h("div", { className: "sr-header-meta " + statusClass }, statusText)
        ),
        usageError ? h("div", { className: "sr-note", role: "alert" }, errorText, " ", h("button", { type: "button", className: "sr-load-older", disabled: loading, onClick: function () { setRetry(function (value) { return value + 1; }); } }, t("action.retry")), h("div", null, t("error.code", { code: usageError })), timeText ? h("div", null, t("error.updatedAt", { time: timeText })) : null) : null,
        h("section", { className: "sr-section" }, h("h3", { className: "sr-section-title" }, t("section.total")), h(TotalCard, { stats: stats, usage: usage && usage.total, t: t })),
        h("section", { className: "sr-section" },
          h("h3", { className: "sr-section-title" }, t("section.turns"), h("span", { className: "sr-section-count" }, stats ? t("counts", { turns: stats.turns, steps: stats.steps }) : "—")),
          h("div", { className: "sr-turn-list", "data-turn-count": turns.length },
            hasMore ? h("button", { className: "sr-load-older", type: "button", disabled: loadingOlder, onClick: requestOlder }, loadingOlder ? t("action.loadingOlder") : t("action.loadOlder")) : h("div", { className: "sr-muted", role: "status" }, t("history.complete")),
            pagingError ? h("div", { className: "sr-note", role: "alert" }, t("history.error")) : null,
            turns.length ? turns.map(function (turn) { return h(TurnCard, { key: String(turn.turn), turn: turn, usage: usage && usage.turns[String(turn.turn)], t: t }); }) : h("div", { className: "sr-empty" }, t("empty.turns"))
          )
        ),
        usage && usage.turns.unassigned ? h("div", { className: "sr-note" }, t("unassigned", { context: usageTokens(usage.turns.unassigned, "context"), output: usageTokens(usage.turns.unassigned, "output") })) : null,
        h("div", { className: "sr-note" }, t("note"))
      );
    }

    function AutoOpen(props) {
      var sessionId = props.sessionId || "";
      React.useEffect(function () {
        if (!sessionId || typeof props.open !== "function" || openedSessions.has(sessionId)) return;
        return props.open(function () { openedSessions.add(sessionId); });
      }, [sessionId]);
      return null;
    }

    function Title(props) {
      if (typeof props.useLocale === "function") props.useLocale(function (value) { return value.revision; });
      return h("span", null, getter(props, "t")("tab.title"));
    }

    function apply(ctx) {
      ensureStyle();
      ctx.effect(function () { return ctx.locale.register(LOCALE_NS, dictionaries); }, "tongji.locale");
      var t = ctx.locale.bind(LOCALE_NS);
      ctx.effect(function () {
        return ctx.sidebarRightTabs.register({ id: TAB_ID, kind: TAB_KIND, priority: "extension", title: function () { return t("tab.title"); }, guide: [{ id: "open", order: 23, title: function () { return t("tab.title"); }, description: function () { return t("tab.guide"); } }] });
      }, "tongji.type");
      ctx.effect(function () {
        return ctx.slots.inject("sidebar.right.pane.tab", function () {
          return ctx.slots.register({
            name: "sidebar.right.pane.tab", key: TAB_KIND,
            inject: function (sessionId) {
              var binding = ctx.uiConversation.binding(sessionId);
              var target = binding.target("stats");
              var session = ctx.sessions.binding(sessionId)?.session;
              if (!session) throw new Error("tongji: current session unavailable");
              return { sessionId: sessionId, hooks: { stats: target, session: session, locale: ctx.locale }, keyedHooks: { projection: function (key) { return session.projections.faceOf(key); } }, loadOlder: function () { return session.loadOlder(); }, t: t };
            }
          }, StatsPane);
        });
      }, "tongji.body");
      ctx.effect(function () {
        return ctx.slots.inject("sidebar.right.pane.tab.title", function () {
          return ctx.slots.register({ name: "sidebar.right.pane.tab.title", key: TAB_KIND, inject: function () { return { t: t, hooks: { locale: ctx.locale } }; } }, Title);
        });
      }, "tongji.title");
      ctx.effect(function () {
        return ctx.slots.inject("conversation.session.header.utilities", function () {
          return ctx.slots.register({
            name: "conversation.session.header.utilities", id: "tongji-open", order: 5,
            inject: function (sessionId) {
              return { sessionId: sessionId, open: function (completed) {
                var right = ctx.sidebarRight, inventory = right.openTabs, mounted = right.mounted, finished = false;
                if (!inventory || !mounted || typeof inventory.getSnapshot !== "function" || typeof mounted.getSnapshot !== "function") return;
                var offInventory = function () {}, offMounted = function () {};
                function dispose() { finished = true; offInventory(); offMounted(); }
                function attempt() {
                  if (finished || mounted.getSnapshot() !== sessionId) return;
                  var tabs = inventory.getSnapshot().filter(function (tab) { return tab.sessionId === sessionId; });
                  if (!tabs.length) return;
                  dispose(); completed();
                  if (tabs.every(function (tab) { return tab.kind === "guide"; })) right.openTab(TAB_KIND);
                }
                offInventory = inventory.subscribe(attempt); offMounted = mounted.subscribe(attempt); attempt();
                return dispose;
              } };
            }
          }, AutoOpen);
        });
      }, "tongji.auto-open");
    }

    return { inject: inject, apply: apply };
  }
});
