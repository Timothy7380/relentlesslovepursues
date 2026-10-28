(function () {
  "use strict";
  var box = document.getElementById("posts");
  if (!box) return;
  function msg(t) { box.innerHTML = '<p class="posts__status">' + Site.esc(t) + "</p>"; }
  msg("Loading posts…");
  Site.rest("posts?select=slug,title,excerpt,published_at&published=eq.true&" + Site.nowFilter() + "&order=published_at.desc")
    .then(function (rows) {
      if (!rows.length) return msg("No posts yet. Check back soon.");
      box.innerHTML = rows.map(function (p) {
        return '<a href="post.html?slug=' + encodeURIComponent(p.slug) + '" class="post"><span class="label">' + Site.esc(Site.fmtDate(p.published_at)) +
          '</span><div><p class="post__title">' + Site.esc(p.title) + '</p><p class="post__excerpt">' + Site.esc(p.excerpt) + "</p></div></a>";
      }).join("");
    })
    .catch(function () { msg("Posts couldn’t be loaded right now. Please refresh in a moment."); });
})();
