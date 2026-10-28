(function () {
  "use strict";
  var list = document.getElementById("episodes");
  var dialog = document.getElementById("listen-dialog");
  if (!list || !dialog) return;

  var PLATFORMS = [
    { key: "youtube", name: "YouTube" },
    { key: "spotify", name: "Spotify" },
    { key: "apple", name: "Apple Podcasts" }
  ];
  var PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" class="icon-lg play-icon" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5Z"/></svg>';
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" class="icon-sm" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var esc = Site.esc;
  var eps = [];

  function safeUrl(u) { return /^https?:\/\//i.test(u || "") ? u : ""; }
  function youtubeId(u) {
    var m = /(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{11})/.exec(u || "");
    return m ? m[1] : "";
  }
  function linksFor(ep) {
    return PLATFORMS.filter(function (p) { return safeUrl(ep[p.key]); })
      .map(function (p) { return { name: p.name, url: safeUrl(ep[p.key]) }; });
  }
  function status(t) { list.className = "episodes episodes--status"; list.innerHTML = '<p class="posts__status">' + esc(t) + "</p>"; }

  function render() {
    list.className = "episodes";
    list.innerHTML = eps.map(function (ep, i) {
      var img = ep.image_url || (youtubeId(ep.youtube) ? "https://img.youtube.com/vi/" + youtubeId(ep.youtube) + "/hqdefault.jpg" : "");
      var media = img ? '<img src="' + esc(img) + '" alt="" loading="lazy" />' : "";
      var cls = "episode__media" + (img ? "" : " episode__media--empty");
      return '<article class="episode">' +
        '<button type="button" class="' + cls + ' episode__btn" data-i="' + i + '" aria-label="Listen to ' + esc(ep.title) + '">' + media +
        '<span class="episode__play">' + PLAY + "</span></button>" +
        '<div class="episode__body"><p class="label">' + esc(Site.fmtDate(ep.published_at)) + "</p>" +
        '<h2 class="episode__title">' + esc(ep.title) + "</h2>" +
        '<p class="episode__desc">' + esc(ep.description) + "</p></div></article>";
    }).join("");
  }

  function openEpisode(i) {
    var ep = eps[i];
    if (!ep) return;
    var links = linksFor(ep);
    if (links.length === 1) { window.open(links[0].url, "_blank", "noopener"); return; }
    document.getElementById("listen-title").textContent = ep.title;
    document.getElementById("listen-links").innerHTML = links.length
      ? links.map(function (l) {
          return '<a class="listen__link" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer"><span>' + esc(l.name) + "</span>" + ARROW + "</a>";
        }).join("")
      : '<p class="listen__none">Links are coming soon.</p>';
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
  }

  list.addEventListener("click", function (e) {
    var card = e.target.closest ? e.target.closest(".episode") : null;
    if (!card) return;
    openEpisode(+card.querySelector(".episode__btn").getAttribute("data-i"));
  });
  dialog.addEventListener("click", function (e) {
    if (e.target === dialog || (e.target.hasAttribute && e.target.hasAttribute("data-close"))) dialog.close();
  });

  status("Loading episodes…");
  Site.rest("episodes?select=*&published=eq.true&" + Site.nowFilter() + "&order=published_at.desc")
    .then(function (rows) {
      eps = rows;
      if (!eps.length) return status("New episodes are on the way. Check back soon.");
      render();
    })
    .catch(function () { status("Episodes couldn’t be loaded right now. Please refresh in a moment."); });
})();
