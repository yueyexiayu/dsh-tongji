window.__ModuleLoader__.load({
  id: "tongji",
  factory: (require) => {
    var React = require("react");
    var h = React.createElement;
    var inject = ["slots", "sidebarRightTabs", "sidebarRight", "uiConversation", "sessions"];
    var TAB_ID = "tongji";
    var TAB_KIND = "tongji";
    var STYLE_ID = "tongji-style";
    var openedSessions = new Set();

    var css = [
      ".sr-root{height:100%;min-height:0;overflow:auto;box-sizing:border-box;padding:14px 12px 22px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#20242a);font:12px/1.45 var(--dsw-font-family,-apple-system,BlinkMacSystemFont,\"SF Pro Text\",\"Segoe UI\",sans-serif)}",
      ".sr-root *{box-sizing:border-box}.sr-title{font-size:16px;font-weight:650;margin:0}.sr-muted{color:var(--dsw-alias-label-secondary,#757b85)}.sr-section{margin-top:14px}.sr-section-title{font-size:12px;font-weight:650;margin:0 0 7px;color:var(--dsw-alias-label-secondary,#656b73)}",
      ".sr-status{display:inline-flex;align-items:center;gap:4px;margin-right:7px;font-size:11px;font-weight:600}.sr-status::before{content:\"\";width:6px;height:6px;border-radius:50%;background:currentColor}.sr-status-success{color:var(--dsw-alias-state-success-primary,#2e9b63)}.sr-status-failed{color:var(--dsw-alias-state-error-primary,#d04444)}.sr-status-running{color:var(--dsw-alias-state-warn-primary,#c58a18)}",
      ".sr-total,.sr-turn{border:1px solid var(--dsw-alias-border-l3,#e1e4e9);border-radius:8px;background:var(--dsw-alias-bg-layer-1,#fafbfc)}.sr-total{padding:10px}.sr-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.sr-metric{min-width:0}.sr-label{display:block;color:var(--dsw-alias-label-secondary,#737982);font-size:11px}.sr-value{display:block;margin-top:2px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.sr-turn-list{max-height:48vh;overflow:auto;overscroll-behavior:contain;padding-right:3px}.sr-turn{margin-top:7px;overflow:hidden}.sr-turn>summary{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:9px 10px;cursor:pointer;list-style:none}.sr-turn>summary::-webkit-details-marker{display:none}.sr-turn>summary:hover{background:var(--dsw-alias-interactive-bg-hover,#f0f2f5)}.sr-turn-number{font-weight:650}.sr-turn-answer{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary,#686f78)}.sr-turn-metrics{font-variant-numeric:tabular-nums;white-space:nowrap}.sr-steps{border-top:1px solid var(--dsw-alias-border-l3,#e1e4e9);padding:3px 10px 7px}.sr-step{padding:7px 0;border-bottom:1px solid var(--dsw-alias-border-l3,#e9ebee)}.sr-step:last-child{border-bottom:0}.sr-step-head{display:flex;justify-content:space-between;gap:8px}.sr-step-summary{margin-top:2px;color:var(--dsw-alias-label-secondary,#686f78);white-space:pre-wrap;overflow-wrap:anywhere}.sr-tool{color:var(--dsw-alias-label-primary,#30343a)}.sr-empty{padding:22px 4px;color:var(--dsw-alias-label-secondary,#737982)}.sr-load-older{width:100%;margin:3px 0;padding:7px;border:1px solid var(--dsw-alias-border-l3,#e1e4e9);border-radius:6px;background:var(--dsw-alias-bg-layer-1,#fafbfc);color:var(--dsw-alias-label-secondary,#656b73);font:inherit;cursor:pointer}.sr-load-older:disabled{cursor:default;opacity:.65}.sr-note{margin-top:10px;color:var(--dsw-alias-label-tertiary,#8b9198);font-size:11px}",
      ".sr-root{background:var(--dsw-alias-bg-base,#f5f7fa);padding:16px 14px 24px;color:var(--dsw-alias-label-primary,#20242a)}.sr-header{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:15px}.sr-kicker{font-size:10px;line-height:1.2;letter-spacing:.08em;color:var(--dsw-alias-label-tertiary,#8b9198);text-transform:uppercase}.sr-title{font-size:18px;line-height:1.2;font-weight:700;letter-spacing:0;margin-top:3px}.sr-header-meta{display:flex;align-items:center;gap:5px;padding:5px 8px;border:1px solid var(--dsw-alias-border-l3,#e1e4e9);border-radius:999px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-secondary,#686f78);font-size:11px;white-space:nowrap}.sr-header-meta::before{content:\"\";width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-success-primary,#2e9b63)}.sr-section{margin-top:16px}.sr-section-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px;color:var(--dsw-alias-label-secondary,#656b73);font-size:11px;font-weight:700;letter-spacing:.04em}.sr-section-title::after{content:\"\";height:1px;flex:1;background:var(--dsw-alias-border-l3,#e1e4e9);order:-1;margin-right:2px}.sr-total{padding:13px;border:1px solid var(--dsw-alias-border-l3,#e1e4e9);border-radius:10px;background:var(--dsw-alias-bg-layer-1,#fff);box-shadow:0 2px 8px rgb(30 41 59 / 5%)}.sr-total-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:11px}.sr-total-label{font-size:12px;font-weight:700}.sr-total-count{font-size:11px;color:var(--dsw-alias-label-tertiary,#8b9198);font-variant-numeric:tabular-nums}.sr-grid{gap:10px}.sr-metric{padding:8px 9px;border:1px solid var(--dsw-alias-border-l3,#edf0f3);border-radius:7px;background:var(--dsw-alias-bg-base,#f8fafc)}.sr-label{font-size:10px;line-height:1.2}.sr-value{margin-top:4px;font-size:15px;line-height:1.15;font-weight:650}.sr-turn-list{max-height:52vh;padding:1px 3px 2px 0;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l2,#cbd2da) transparent}.sr-turn{margin-top:8px;border-color:var(--dsw-alias-border-l3,#e1e4e9);border-radius:9px;background:var(--dsw-alias-bg-layer-1,#fff);box-shadow:0 1px 3px rgb(30 41 59 / 4%)}.sr-turn>summary{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;min-height:55px;padding:10px 11px}.sr-turn>summary::before{content:\"\";width:3px;height:30px;flex:0 0 3px;border-radius:3px;background:var(--dsw-alias-border-l2,#cbd2da);margin-right:1px}.sr-turn[open]>summary::before{background:var(--dsw-alias-state-success-primary,#2e9b63)}.sr-turn-top{display:flex;align-items:center;gap:8px;min-width:0;flex:1 1 100%}.sr-turn-number{flex:0 0 auto;font-size:12px;white-space:nowrap}.sr-turn-answer{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--dsw-alias-label-secondary,#686f78)}.sr-turn-metrics{flex:1 1 100%;padding-left:11px;color:var(--dsw-alias-label-secondary,#686f78);font-size:10px;white-space:nowrap}.sr-turn-submeta{display:flex;align-items:center;gap:6px;margin-top:6px;color:var(--dsw-alias-label-tertiary,#8b9198);font-size:10px}.sr-step{padding:9px 0}.sr-step-head strong{font-size:11px}.sr-step-summary{font-size:11px;line-height:1.5}.sr-status{padding:2px 6px;border-radius:999px;font-size:10px;font-weight:650}.sr-status-success{color:#18794e;background:#e9f7ef}.sr-status-failed{color:#b42318;background:#fcecec}.sr-status-running{color:#9a6700;background:#fff6df}.sr-load-older{margin:8px 0 2px;border-color:var(--dsw-alias-border-l3,#dfe4e9);background:var(--dsw-alias-bg-layer-1,#fff);font-size:11px}.sr-note{margin-top:13px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l3,#e5e8ec);font-size:10px;line-height:1.45}",
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
      return value >= 1000 ? (value / 1000).toFixed(1).replace(/\.0$/, "") + "K" : (value / 1000).toFixed(2) + "K";
    }
    function percent(value) { return isNumber(value) ? (value * 100).toFixed(2) + "%" : "—"; }
    function speed(value) { return isNumber(value) ? value.toFixed(1) + " tok/s" : "—"; }

    function Metric(props) {
      return h("div", { className: "sr-metric" },
        h("span", { className: "sr-label" }, props.label),
        h("span", { className: "sr-value", title: props.title || undefined }, props.value));
    }

    function TotalCard(props) {
      var stats = props.stats;
      var usage = props.usage;
      if (!stats || !usage) return h("div", { className: "sr-empty" }, "统计数据尚未就绪");
      var context = usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
      var hit = context > 0 ? Math.min(1, usage.cacheReadTokens / context) : null;
      var throughput = stats.decodeMs > 0 ? stats.decodeTokens / (stats.decodeMs / 1000) : null;
      return h("div", { className: "sr-total" },
        h("div", { className: "sr-total-head" },
          h("span", { className: "sr-total-label" }, "会话总计"),
          h("span", { className: "sr-total-count" }, stats.turns + " 轮 · " + stats.steps + " 步")
        ),
        h("div", { className: "sr-grid" },
          h(Metric, { label: "会话总上下文", value: stats.steps === 0 ? "—" : tokens(context) }),
          h(Metric, { label: "缓存命中", value: stats.steps === 0 ? "—" : percent(hit) }),
          h(Metric, { label: "输出", value: stats.steps === 0 ? "—" : tokens(usage.outputTokens) }),
          h(Metric, { label: "输出速度", value: stats.steps === 0 ? "—" : speed(throughput) })
        ));
    }

    function answerPreview(answer) {
      if (typeof answer !== "string") return "";
      var line = answer.split("\n").find(function (part) { return part.trim() !== ""; }) || "";
      return line.trim();
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

    function stepStatus(step) {
      var calls = Array.isArray(step.calls) ? step.calls : [];
      if ((Number(step.toolErrors) || 0) > 0 || calls.some(function (call) { return call.error === true; }) || step.aborted === true || step.interrupted === true) return { label: "失败", className: "sr-status-failed" };
      if (step.running === true || (Number(step.toolPending) || 0) > 0) return { label: "进行中", className: "sr-status-running" };
      return { label: "成功", className: "sr-status-success" };
    }

    function stepSummary(step) {
      var groups = callGroups(step.calls);
      if (groups.length) {
        var shown = groups.slice(0, 3).map(function (item) {
          return item.name + (item.count > 1 ? " ×" + item.count : "") + (item.hint ? " " + item.hint : "");
        });
        var shownCalls = groups.slice(0, 3).reduce(function (sum, item) { return sum + item.count; }, 0);
        var totalCalls = (Array.isArray(step.tools) ? step.tools : []).reduce(function (sum, item) { return sum + item.count; }, 0);
        if (totalCalls > shownCalls) shown.push("还有 " + (totalCalls - shownCalls) + " 次");
        return h("span", { className: "sr-tool" }, shown.join(" · "));
      }
      var answer = answerPreview(step.answer);
      if (answer) return "回答：" + answer;
      if (step.running) return "进行中";
      if (step.interrupted || step.aborted) return "已中断";
      return "—";
    }

    function TurnCard(props) {
      var turn = props.turn;
      var answer = typeof turn.answer === "string" && turn.answer.trim() ? turn.answer : "";
      return h("details", { className: "sr-turn" },
        h("summary", null,
          h("span", { className: "sr-turn-top" },
            h("span", { className: "sr-turn-number" }, "第 " + turn.turn + " 轮"),
            h("span", { className: "sr-turn-answer", title: answer || undefined }, answer || (turn.running ? "进行中" : ""))
          ),
          h("span", { className: "sr-turn-metrics", title: "上下文 · 缓存命中 · 输出 · 输出速度" }, ["上 " + tokens(turn.context), "缓 " + percent(turn.cacheHit), "出 " + tokens(turn.output), "速 " + speed(turn.tps)].join(" · "))
        ),
        h("div", { className: "sr-steps" }, turn.steps.map(function (step) {
          return h("div", { className: "sr-step", key: String(step.step) },
            h("div", { className: "sr-step-head" }, h("strong", null, "步骤 " + step.step), h("span", { className: "sr-muted", title: "上下文 · 缓存命中 · 输出 · 输出速度" }, ["上 " + tokens(step.context), "缓 " + percent(step.cacheHit), "出 " + tokens(step.output), "速 " + speed(step.tps)].join(" · "))),
            h("div", { className: "sr-step-summary" }, (function () { var status = stepStatus(step); return [h("span", { className: "sr-status " + status.className, key: "status" }, status.label), stepSummary(step)]; })())
          );
        }))
      );
    }

    function sessionIdOf(props) {
      var info = props && typeof props.useTabInfo === "function" ? props.useTabInfo() : null;
      return props && props.sessionId || info && info.tab && info.tab.sessionId || "";
    }

    function StatsPane(props) {
      var sessionId = sessionIdOf(props);
      var useStats = props.useStats;
      var useProjection = props.useProjection;
      var useSession = props.useSession;
      var snapshot = typeof useStats === "function" ? useStats(function (value) { return value; }) : null;
      var sessionSnapshot = typeof useSession === "function" ? useSession(function (value) { return value; }) : null;
      var stats = typeof useProjection === "function" ? useProjection("sessionStats") : undefined;
      var usage = typeof useProjection === "function" ? useProjection("tokenUsage") : undefined;
      var listRef = React.useRef(null);
      var pagingRef = React.useRef(false);
      var autoAttemptRef = React.useRef(null);
      var turns = snapshot && Array.isArray(snapshot.turns) ? snapshot.turns : [];
      var hasMore = !!(sessionSnapshot && sessionSnapshot.hasMore);
      var loadingOlder = !!(sessionSnapshot && sessionSnapshot.loadingOlder);
      var loadOlder = props.loadOlder;
      if (!sessionId) return h("div", { className: "sr-root" }, h("div", { className: "sr-empty" }, "当前没有可用会话"));

      function requestOlder() {
        if (!hasMore || loadingOlder || pagingRef.current || typeof loadOlder !== "function") return;
        pagingRef.current = true;
        Promise.resolve(loadOlder()).then(function () { pagingRef.current = false; }, function () { pagingRef.current = false; });
      }

      function onListScroll(event) {
        if (event.currentTarget.scrollTop <= 64) requestOlder();
      }

      var windowKey = turns.length + ":" + (turns[0] ? String(turns[0].turn) + ":" + turns[0].steps.length : "");
      React.useEffect(function () {
        var attemptKey = sessionId + ":" + windowKey;
        if (!sessionId || !hasMore || loadingOlder || autoAttemptRef.current === attemptKey) return;
        autoAttemptRef.current = attemptKey;
        requestOlder();
      }, [sessionId, hasMore, loadingOlder, windowKey]);

      return h("div", { className: "sr-root", "data-session-id": sessionId },
        h("div", { className: "sr-header" },
          h("div", null, h("div", { className: "sr-kicker" }, "SESSION INSIGHTS"), h("h2", { className: "sr-title" }, "会话统计")),
          h("div", { className: "sr-header-meta" }, stats && usage ? "实时" : "加载中")
        ),
        h("section", { className: "sr-section" }, h("h3", { className: "sr-section-title" }, "总计"), h(TotalCard, { stats: stats, usage: usage })),
        h("section", { className: "sr-section" },
          h("h3", { className: "sr-section-title" }, "每轮", h("span", { className: "sr-section-count" }, stats ? stats.turns + " 轮" : "—")),
          h("div", { className: "sr-turn-list", ref: listRef, onScroll: onListScroll, "data-turn-count": turns.length },
            turns.length ? turns.map(function (turn) { return h(TurnCard, { key: String(turn.turn), turn: turn }); }) : h("div", { className: "sr-empty" }, "暂无轮次数据"),
            hasMore ? h("button", { className: "sr-load-older", type: "button", disabled: loadingOlder, onClick: requestOlder }, loadingOlder ? "正在加载更早轮次…" : "加载更早轮次") : h("div", { className: "sr-muted", role: "status" }, "已显示全部历史轮次")
          )
        ),
        h("div", { className: "sr-note" }, "数据与官方“统计”页保持同一统计口径；缺失值显示为 —。")
      );
    }

    function AutoOpen(props) {
      var sessionId = props.sessionId || "";
      React.useEffect(function () {
        if (!sessionId || typeof props.open !== "function" || openedSessions.has(sessionId)) return;
        openedSessions.add(sessionId);
        props.open();
      }, [sessionId]);
      return null;
    }

    function Title() { return h("span", null, "统计"); }

    function apply(ctx) {
      ensureStyle();
      ctx.effect(function () {
        return ctx.sidebarRightTabs.register({ id: TAB_ID, kind: TAB_KIND, priority: "extension", title: function () { return "统计"; }, guide: [{ id: "open", order: 23, title: function () { return "统计"; }, description: function () { return "查看当前会话的上下文、缓存命中与输出数据"; } }] });
      }, "tongji.type");
      ctx.effect(function () {
        return ctx.slots.inject("sidebar.right.pane.tab", function () {
          return ctx.slots.register({
            name: "sidebar.right.pane.tab", key: TAB_KIND,
            inject: function (sessionId) {
              var binding = ctx.uiConversation.binding(sessionId);
              var target = binding.target("stats");
              var session = ctx.sessions.binding(sessionId)?.session;
              if (!session) throw new Error("tongji: 当前会话不可用");
              return {
                sessionId: sessionId,
                hooks: { stats: target, session: session },
                keyedHooks: { projection: function (key) { return session.projections.faceOf(key); } }, loadOlder: function () { return session.loadOlder(); }
              };
            }
          }, StatsPane);
        });
      }, "tongji.body");
      ctx.effect(function () {
        return ctx.slots.inject("sidebar.right.pane.tab.title", function () {
          return ctx.slots.register({ name: "sidebar.right.pane.tab.title", key: TAB_KIND }, Title);
        });
      }, "tongji.title");
      ctx.effect(function () {
        return ctx.slots.inject("conversation.session.header.utilities", function () {
          return ctx.slots.register({
            name: "conversation.session.header.utilities", id: "tongji-open", order: 5,
            inject: function (sessionId) {
              return { sessionId: sessionId, open: function () { ctx.sidebarRight.openTab(TAB_KIND); } };
            }
          }, AutoOpen);
        });
      }, "tongji.auto-open");
    }

    return { inject: inject, apply: apply };
  }
});
