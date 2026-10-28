/* Shared helpers: read published posts / episodes from the database. */
(function () {
  "use strict";
  var cfg = window.SITE_CONFIG || {};
  var ok = !!(cfg.supabaseUrl && cfg.supabaseKey);

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function rest(query) {
    if (!ok) return Promise.reject(new Error("not-configured"));
    var headers = { apikey: cfg.supabaseKey };
    if (/^eyJ/.test(cfg.supabaseKey)) headers.Authorization = "Bearer " + cfg.supabaseKey;
    return fetch(cfg.supabaseUrl.replace(/\/$/, "") + "/rest/v1/" + query, { headers: headers }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }
  function nowFilter() { return "published_at=lte." + encodeURIComponent(new Date().toISOString()); }
  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase();
  }
  /* Quill writes bullet lists as <ol data-list="bullet">; turn them into real <ul>. */
  function fixLists(root) {
    Array.prototype.slice.call(root.querySelectorAll("ol")).forEach(function (ol) {
      var li = ol.querySelector("li");
      if (li && li.getAttribute("data-list") === "bullet") {
        var ul = document.createElement("ul");
        ul.innerHTML = ol.innerHTML;
        ol.parentNode.replaceChild(ul, ol);
      }
    });
    Array.prototype.slice.call(root.querySelectorAll("li .ql-ui")).forEach(function (n) { n.remove(); });
  }
  window.Site = { ok: ok, cfg: cfg, esc: esc, rest: rest, nowFilter: nowFilter, fmtDate: fmtDate, fixLists: fixLists };
})();
