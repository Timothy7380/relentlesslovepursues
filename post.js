(function () {
  "use strict";
  var slug = new URLSearchParams(location.search).get("slug");
  var head = document.getElementById("post-head");
  var bodyEl = document.getElementById("post-body");
  var navEl = document.getElementById("post-nav");
  var ALLOWED_FRAMES = /^https:\/\/(www\.youtube(-nocookie)?\.com\/embed\/|open\.spotify\.com\/embed\/|embed\.podcasts\.apple\.com\/|player\.vimeo\.com\/video\/)/;

  if (window.DOMPurify) {
    DOMPurify.addHook("afterSanitizeAttributes", function (node) {
      if (node.tagName === "IFRAME" && !ALLOWED_FRAMES.test(node.getAttribute("src") || "")) node.remove();
      if (node.tagName === "A" && node.getAttribute("href")) { node.setAttribute("rel", "noopener noreferrer"); }
    });
  }
  function missing(t) {
    document.title = "Post not found — RelentlessLovePursues";
    head.querySelector(".article__title").textContent = t;
    head.querySelector(".article__lede").textContent = "";
    head.querySelector(".article__meta").textContent = "";
    bodyEl.innerHTML = "";
  }
  if (!slug) return missing("Post not found");

  Site.rest("posts?select=*&slug=eq." + encodeURIComponent(slug) + "&published=eq.true&" + Site.nowFilter() + "&limit=1")
    .then(function (rows) {
      var p = rows[0];
      if (!p) return missing("Post not found");
      document.title = p.title + " — RelentlessLovePursues";
      var m = document.querySelector('meta[name="description"]'); if (m) m.setAttribute("content", p.excerpt || p.title);
      var meta = [p.category, Site.fmtDate(p.published_at)].filter(Boolean).join(" · ");
      head.querySelector(".article__meta").textContent = meta;
      head.querySelector(".article__title").textContent = p.title;
      head.querySelector(".article__lede").textContent = p.excerpt || "";
      if (p.cover_url) {
        var fig = document.getElementById("post-cover");
        fig.innerHTML = '<img src="' + Site.esc(p.cover_url) + '" alt="" />';
        fig.hidden = false;
      }
      var clean = window.DOMPurify
        ? DOMPurify.sanitize(p.body || "", { ADD_TAGS: ["iframe"], ADD_ATTR: ["allowfullscreen", "frameborder", "allow"] })
        : Site.esc(p.body || "");
      bodyEl.innerHTML = clean;
      Site.fixLists(bodyEl);
      return Site.rest("posts?select=slug,title,published_at&published=eq.true&" + Site.nowFilter() + "&order=published_at.desc").then(function (all) {
        var i = all.findIndex(function (x) { return x.slug === p.slug; });
        if (all.length < 2 || i < 0) return;
        var prev = all[(i - 1 + all.length) % all.length], next = all[(i + 1) % all.length];
        navEl.innerHTML =
          '<a href="post.html?slug=' + encodeURIComponent(prev.slug) + '" class="article__nav-link article__nav-link--prev"><span class="label">Previous</span><strong>' + Site.esc(prev.title) + "</strong></a>" +
          '<a href="post.html?slug=' + encodeURIComponent(next.slug) + '" class="article__nav-link article__nav-link--next"><span class="label">Next</span><strong>' + Site.esc(next.title) + "</strong></a>";
        navEl.hidden = false;
      });
    })
    .catch(function () { missing("This post couldn’t be loaded"); });
})();
