(function () {
  "use strict";
  var cfg = window.SITE_CONFIG || {};
  var app = document.getElementById("app");
  var toastEl = document.getElementById("toast");
  var btnLogout = document.getElementById("btn-logout");
  var btnPassword = document.getElementById("btn-password");
  var toastTimer;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(sel, root) { return (root || app).querySelector(sel); }
  function toast(msg, isError) {
    toastEl.textContent = msg;
    toastEl.className = "toast" + (isError ? " toast--error" : "");
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, isError ? 6000 : 3000);
  }

  if (!cfg.supabaseUrl || !cfg.supabaseKey || !window.supabase) {
    app.innerHTML = '<div class="admin-card admin-card--narrow"><h1>Not connected yet</h1><p class="admin-muted" style="margin-top:1rem">The admin needs its database connection filled in (config.js).</p></div>';
    return;
  }
  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  var quill = null;
  var currentTab = "posts";

  /* ---------- helpers ---------- */
  function slugify(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  }
  function toDateInput(iso) {
    var d = iso ? new Date(iso) : new Date();
    if (isNaN(d)) d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function fromDateInput(v, existingIso) {
    if (!v) return new Date().toISOString();
    if (existingIso && toDateInput(existingIso) === v) return existingIso; /* unchanged day: keep the exact time */
    return new Date(v + "T12:00:00").toISOString();
  }
  function fmtRowDate(iso) {
    var d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function friendlyError(e) {
    var m = (e && e.message) || String(e);
    if (e && e.code === "23505") return "That web address is already used by another post. Change the “Web address” field.";
    if (/row-level security|permission denied/i.test(m)) return "Not allowed. Make sure you’re logged in with the admin account.";
    if (/Failed to fetch|NetworkError/i.test(m)) return "Couldn’t reach the server. Check your internet and try again.";
    return m;
  }

  /* Downscale big photos so pages stay fast. */
  function prepareImage(file) {
    return new Promise(function (resolve) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 250 * 1024) return resolve({ blob: file, ext: (file.name.split(".").pop() || "jpg").toLowerCase(), type: file.type });
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 1800, w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, max / Math.max(w, h));
        var c = document.createElement("canvas");
        c.width = Math.round(w * s); c.height = Math.round(h * s);
        var ctx = c.getContext("2d");
        var keepPng = file.type === "image/png";
        if (!keepPng) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); }
        ctx.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) {
          URL.revokeObjectURL(url);
          if (!b || b.size >= file.size) return resolve({ blob: file, ext: (file.name.split(".").pop() || "jpg").toLowerCase(), type: file.type });
          resolve({ blob: b, ext: keepPng ? "png" : "jpg", type: keepPng ? "image/png" : "image/jpeg" });
        }, keepPng ? "image/png" : "image/jpeg", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve({ blob: file, ext: (file.name.split(".").pop() || "jpg").toLowerCase(), type: file.type }); };
      img.src = url;
    });
  }
  function uploadImage(file) {
    return prepareImage(file).then(function (p) {
      var base = slugify(file.name.replace(/\.[^.]+$/, "")) || "image";
      var path = new Date().getFullYear() + "/" + Date.now() + "-" + base + "." + p.ext;
      return sb.storage.from("media").upload(path, p.blob, { contentType: p.type, cacheControl: "31536000", upsert: false }).then(function (res) {
        if (res.error) throw res.error;
        return sb.storage.from("media").getPublicUrl(path).data.publicUrl;
      });
    });
  }
  function pickFile() {
    return new Promise(function (resolve) {
      var inp = document.createElement("input");
      inp.type = "file"; inp.accept = "image/*";
      inp.onchange = function () { resolve(inp.files && inp.files[0] ? inp.files[0] : null); };
      inp.click();
    });
  }
  /* Turn the editor's internal HTML into clean, standard HTML for storage. */
  function cleanHtml(root) {
    var box = document.createElement("div");
    box.innerHTML = root.innerHTML;
    box.querySelectorAll(".ql-ui, .ql-cursor").forEach(function (n) { n.remove(); });
    box.querySelectorAll("[contenteditable]").forEach(function (n) { n.removeAttribute("contenteditable"); });
    box.querySelectorAll("ol").forEach(function (ol) {
      var li = ol.querySelector("li");
      if (li && li.getAttribute("data-list") === "bullet") {
        var ul = document.createElement("ul");
        ul.innerHTML = ol.innerHTML;
        ol.parentNode.replaceChild(ul, ol);
      }
    });
    box.querySelectorAll("li[data-list]").forEach(function (li) { li.removeAttribute("data-list"); });
    return box.innerHTML;
  }
  function videoEmbedUrl(u) {
    u = (u || "").trim();
    var m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/.exec(u);
    if (m) return "https://www.youtube.com/embed/" + m[1];
    m = /vimeo\.com\/(\d+)/.exec(u);
    if (m) return "https://player.vimeo.com/video/" + m[1];
    if (/^https:\/\/open\.spotify\.com\/embed\//.test(u)) return u;
    var s = /open\.spotify\.com\/(episode|show)\/([\w]+)/.exec(u);
    if (s) return "https://open.spotify.com/embed/" + s[1] + "/" + s[2];
    return "";
  }

  /* ---------- auth ---------- */
  function showLogin(msg) {
    btnLogout.hidden = true; btnPassword.hidden = true;
    app.innerHTML =
      '<div class="admin-card admin-card--narrow"><h1>Log in</h1><p class="admin-muted" style="margin-top:.75rem">Admin area for the blog and podcast.</p>' +
      '<form id="login-form" novalidate><div class="field"><label for="em">Email</label><input id="em" type="email" autocomplete="username" required /></div>' +
      '<div class="field"><label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password" required /></div>' +
      '<p class="admin-error" id="login-err">' + esc(msg || "") + '</p>' +
      '<div class="admin-actions"><button class="abtn abtn--primary" type="submit">Log in</button></div></form></div>';
    $("#login-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var b = $("button[type=submit]"); b.disabled = true;
      sb.auth.signInWithPassword({ email: $("#em").value.trim(), password: $("#pw").value }).then(function (r) {
        if (r.error) { b.disabled = false; $("#login-err").textContent = /invalid/i.test(r.error.message) ? "Wrong email or password." : r.error.message; return; }
        boot();
      });
    });
  }
  function boot() {
    sb.auth.getSession().then(function (r) {
      if (!r.data.session) return showLogin();
      return sb.from("admins").select("id").maybeSingle().then(function (a) {
        if (!a.data) {
          app.innerHTML = '<div class="admin-card admin-card--narrow"><h1>No access</h1><p class="admin-muted" style="margin-top:1rem">This account isn’t set up as an admin.</p><div class="admin-actions"><button class="abtn" id="so">Log out</button></div></div>';
          $("#so").onclick = function () { sb.auth.signOut().then(function () { showLogin(); }); };
          return;
        }
        btnLogout.hidden = false; btnPassword.hidden = false;
        showList(currentTab);
      });
    });
  }
  btnLogout.addEventListener("click", function (e) { e.preventDefault(); sb.auth.signOut().then(function () { showLogin(); }); });
  btnPassword.addEventListener("click", function (e) {
    e.preventDefault();
    var np = window.prompt("Type a new password (at least 8 characters):");
    if (!np) return;
    if (np.length < 8) return toast("Password must be at least 8 characters.", true);
    sb.auth.updateUser({ password: np }).then(function (r) { r.error ? toast(friendlyError(r.error), true) : toast("Password changed."); });
  });

  /* ---------- lists ---------- */
  function showList(tab) {
    currentTab = tab || currentTab;
    quill = null;
    var isPosts = currentTab === "posts";
    app.innerHTML =
      '<div class="admin-head"><div><h1>' + (isPosts ? "Blog posts" : "Podcast episodes") + '</h1></div>' +
      '<button class="abtn abtn--primary" id="new-btn">+ ' + (isPosts ? "New post" : "New episode") + '</button></div>' +
      '<div class="tabs" role="tablist"><button class="tab" role="tab" data-tab="posts" aria-selected="' + isPosts + '">Blog</button>' +
      '<button class="tab" role="tab" data-tab="episodes" aria-selected="' + !isPosts + '">Podcast</button></div>' +
      '<div class="rows" id="rows"><p class="admin-muted" style="padding-block:1.5rem">Loading…</p></div>' +
      '<div class="admin-foot"><a class="abtn abtn--sm" href="index.html" target="_blank" rel="noopener">View site</a><button class="abtn abtn--sm" id="f-pw" type="button">Change password</button><button class="abtn abtn--sm" id="f-out" type="button">Log out</button></div>';
    $("#f-pw").onclick = function () { btnPassword.click(); };
    $("#f-out").onclick = function () { btnLogout.click(); };
    app.querySelectorAll(".tab").forEach(function (t) { t.onclick = function () { showList(t.getAttribute("data-tab")); }; });
    $("#new-btn").onclick = function () { isPosts ? editPost(null) : editEpisode(null); };

    var q = isPosts
      ? sb.from("posts").select("id,slug,title,published,published_at").order("published_at", { ascending: false })
      : sb.from("episodes").select("id,title,published,published_at").order("published_at", { ascending: false });
    q.then(function (r) {
      var rows = $("#rows");
      if (r.error) { rows.innerHTML = '<p class="admin-error">' + esc(friendlyError(r.error)) + "</p>"; return; }
      if (!r.data.length) { rows.innerHTML = '<p class="admin-muted" style="padding-block:1.5rem">Nothing here yet. Click “' + (isPosts ? "New post" : "New episode") + '” to add the first one.</p>'; return; }
      rows.innerHTML = r.data.map(function (it) {
        return '<div class="row"><div><div class="row__title">' + esc(it.title) + '</div><div class="row__meta"><span>' + esc(fmtRowDate(it.published_at)) +
          '</span><span class="badge ' + (it.published ? "badge--live" : "badge--draft") + '">' + (it.published ? "Published" : "Draft") + '</span></div></div>' +
          '<div class="row__actions">' +
          (isPosts && it.published ? '<a class="abtn abtn--sm" target="_blank" rel="noopener" href="post.html?slug=' + encodeURIComponent(it.slug) + '">View</a>' : "") +
          '<button class="abtn abtn--sm" data-act="edit" data-id="' + esc(it.id) + '">Edit</button>' +
          '<button class="abtn abtn--sm abtn--danger" data-act="del" data-id="' + esc(it.id) + '" data-title="' + esc(it.title) + '">Delete</button></div></div>';
      }).join("");
      rows.querySelectorAll("button[data-act]").forEach(function (b) {
        b.onclick = function () {
          var id = b.getAttribute("data-id");
          if (b.getAttribute("data-act") === "edit") return isPosts ? editPost(id) : editEpisode(id);
          if (!window.confirm("Delete “" + b.getAttribute("data-title") + "”? This can’t be undone.")) return;
          sb.from(isPosts ? "posts" : "episodes").delete().eq("id", id).then(function (d) {
            if (d.error) return toast(friendlyError(d.error), true);
            toast("Deleted."); showList();
          });
        };
      });
    });
  }

  /* ---------- image field ---------- */
  function imageField(label, hint, initialUrl) {
    var state = { url: initialUrl || "" };
    var id = "img" + Math.random().toString(36).slice(2, 7);
    var html = '<div class="field"><span class="field__label">' + esc(label) + '</span><div class="thumb" id="' + id + '"></div>' + (hint ? '<span class="field__hint">' + esc(hint) + "</span>" : "") + "</div>";
    function paint(root) {
      var box = root.querySelector("#" + id);
      box.innerHTML = (state.url ? '<img src="' + esc(state.url) + '" alt="" />' : "") +
        '<button type="button" class="abtn abtn--sm" data-a="up">' + (state.url ? "Change picture" : "Choose picture") + "</button>" +
        (state.url ? '<button type="button" class="abtn abtn--sm abtn--danger" data-a="rm">Remove</button>' : "");
      box.querySelector('[data-a="up"]').onclick = function () {
        var btn = this;
        pickFile().then(function (f) {
          if (!f) return;
          btn.disabled = true; btn.textContent = "Uploading…";
          uploadImage(f).then(function (u) { state.url = u; paint(root); }, function (e) { toast(friendlyError(e), true); paint(root); });
        });
      };
      var rm = box.querySelector('[data-a="rm"]');
      if (rm) rm.onclick = function () { state.url = ""; paint(root); };
    }
    return { html: html, state: state, mount: paint };
  }

  /* ---------- post editor ---------- */
  function editPost(id) {
    app.innerHTML = '<p class="admin-muted">Loading…</p>';
    var load = id ? sb.from("posts").select("*").eq("id", id).single() : Promise.resolve({ data: { title: "", slug: "", category: "", excerpt: "", body: "", cover_url: "", published: true, published_at: new Date().toISOString() } });
    load.then(function (r) {
      if (r.error) { toast(friendlyError(r.error), true); return showList("posts"); }
      var p = r.data;
      var cover = imageField("Cover picture (optional)", "Shown at the top of the post.", p.cover_url);
      app.innerHTML =
        '<button class="abtn abtn--sm" id="back" type="button">← Back to list</button>' +
        '<h1 style="margin-top:1.5rem">' + (id ? "Edit post" : "New post") + '</h1>' +
        '<form id="post-form" class="admin-card" style="margin-top:1.5rem" novalidate>' +
        '<div class="field" style="margin-top:0"><label for="f-title">Title</label><input id="f-title" type="text" value="' + esc(p.title) + '" required /></div>' +
        '<div class="field"><label for="f-excerpt">Short summary</label><textarea id="f-excerpt">' + esc(p.excerpt) + '</textarea><span class="field__hint">Shown under the title on the blog list and at the top of the post.</span></div>' +
        cover.html +
        '<div class="field"><span class="field__label">Post</span><div class="editor-wrap"><div id="editor"></div></div></div>' +
        '<div class="field-row"><div class="field"><label for="f-date">Date</label><input id="f-date" type="date" value="' + toDateInput(p.published_at) + '" /></div>' +
        '<div class="field"><label for="f-status">Status</label><select id="f-status"><option value="1"' + (p.published ? " selected" : "") + '>Published (visible on the site)</option><option value="0"' + (p.published ? "" : " selected") + '>Draft (hidden)</option></select></div></div>' +
        '<div class="field-row"><div class="field"><label for="f-cat">Tag line (optional)</label><input id="f-cat" type="text" placeholder="e.g. LIFESTYLE · NATURE" value="' + esc(p.category) + '" /></div>' +
        '<div class="field"><label for="f-slug">Web address</label><input id="f-slug" type="text" value="' + esc(p.slug) + '" /><span class="field__hint">Fills in automatically from the title.</span></div></div>' +
        '<p class="admin-error" id="form-err"></p>' +
        '<div class="admin-actions"><button class="abtn abtn--primary" type="submit">Save</button><button class="abtn" type="button" id="cancel">Cancel</button></div></form>';
      cover.mount(app);
      $("#back").onclick = $("#cancel").onclick = function () { showList("posts"); };

      var slugTouched = !!id;
      $("#f-slug").addEventListener("input", function () { slugTouched = true; });
      $("#f-title").addEventListener("input", function () { if (!slugTouched) $("#f-slug").value = slugify($("#f-title").value); });

      quill = new window.Quill("#editor", {
        theme: "snow",
        placeholder: "Write your post here…",
        modules: {
          toolbar: {
            container: [[{ header: [2, 3, false] }], ["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], ["blockquote", "link"], [{ align: [] }], ["image", "video"], ["clean"]],
            handlers: {
              image: function () {
                pickFile().then(function (f) {
                  if (!f) return;
                  toast("Uploading picture…");
                  uploadImage(f).then(function (u) {
                    var range = quill.getSelection(true);
                    quill.insertEmbed(range.index, "image", u, "user");
                    quill.setSelection(range.index + 1);
                    toast("Picture added.");
                  }, function (e) { toast(friendlyError(e), true); });
                });
              },
              video: function () {
                var u = window.prompt("Paste a YouTube (or Vimeo / Spotify) link:");
                if (!u) return;
                var emb = videoEmbedUrl(u);
                if (!emb) return toast("That link isn’t a YouTube, Vimeo or Spotify link.", true);
                var range = quill.getSelection(true);
                quill.insertEmbed(range.index, "video", emb, "user");
                quill.setSelection(range.index + 1);
              }
            }
          }
        }
      });
      if (p.body) quill.clipboard.dangerouslyPasteHTML(0, p.body, "silent");
      quill.history.clear();

      $("#post-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var title = $("#f-title").value.trim();
        var slug = slugify($("#f-slug").value || title);
        var err = $("#form-err"); err.textContent = "";
        if (!title) { err.textContent = "Please add a title."; return; }
        if (!slug) { err.textContent = "Please add a web address."; return; }
        var btn = $("button[type=submit]"); btn.disabled = true; btn.textContent = "Saving…";
        var html = cleanHtml(quill.root);
        if (quill.getText().trim() === "" && html.indexOf("<img") < 0 && html.indexOf("<iframe") < 0) html = "";
        var row = {
          title: title, slug: slug, category: $("#f-cat").value.trim(), excerpt: $("#f-excerpt").value.trim(),
          body: html, cover_url: cover.state.url || "", published: $("#f-status").value === "1",
          published_at: fromDateInput($("#f-date").value, p.published_at)
        };
        var q = id ? sb.from("posts").update(row).eq("id", id) : sb.from("posts").insert(row);
        q.then(function (r2) {
          if (r2.error) { btn.disabled = false; btn.textContent = "Save"; err.textContent = friendlyError(r2.error); return; }
          toast(row.published ? "Saved and live on the site." : "Saved as a draft.");
          showList("posts");
        });
      });
    });
  }

  /* ---------- episode editor ---------- */
  function editEpisode(id) {
    app.innerHTML = '<p class="admin-muted">Loading…</p>';
    var load = id ? sb.from("episodes").select("*").eq("id", id).single() : Promise.resolve({ data: { title: "", description: "", image_url: "", youtube: "", spotify: "", apple: "", published: true, published_at: new Date().toISOString() } });
    load.then(function (r) {
      if (r.error) { toast(friendlyError(r.error), true); return showList("episodes"); }
      var p = r.data;
      var pic = imageField("Picture (optional)", "If you skip this and add a YouTube link, the YouTube thumbnail is used.", p.image_url);
      app.innerHTML =
        '<button class="abtn abtn--sm" id="back" type="button">← Back to list</button>' +
        '<h1 style="margin-top:1.5rem">' + (id ? "Edit episode" : "New episode") + '</h1>' +
        '<form id="ep-form" class="admin-card" style="margin-top:1.5rem" novalidate>' +
        '<div class="field" style="margin-top:0"><label for="e-title">Episode title</label><input id="e-title" type="text" value="' + esc(p.title) + '" required /></div>' +
        '<div class="field"><label for="e-desc">Description</label><textarea id="e-desc">' + esc(p.description) + '</textarea></div>' +
        pic.html +
        '<div class="field"><label for="e-yt">YouTube link</label><input id="e-yt" type="url" placeholder="https://www.youtube.com/watch?v=…" value="' + esc(p.youtube) + '" /></div>' +
        '<div class="field"><label for="e-sp">Spotify link</label><input id="e-sp" type="url" placeholder="https://open.spotify.com/episode/…" value="' + esc(p.spotify) + '" /></div>' +
        '<div class="field"><label for="e-ap">Apple Podcasts link</label><input id="e-ap" type="url" placeholder="https://podcasts.apple.com/…" value="' + esc(p.apple) + '" /><span class="field__hint">Leave a link empty if the episode isn’t on that platform. Visitors only see the platforms you fill in.</span></div>' +
        '<div class="field-row"><div class="field"><label for="e-date">Date</label><input id="e-date" type="date" value="' + toDateInput(p.published_at) + '" /></div>' +
        '<div class="field"><label for="e-status">Status</label><select id="e-status"><option value="1"' + (p.published ? " selected" : "") + '>Published (visible on the site)</option><option value="0"' + (p.published ? "" : " selected") + '>Draft (hidden)</option></select></div></div>' +
        '<p class="admin-error" id="form-err"></p>' +
        '<div class="admin-actions"><button class="abtn abtn--primary" type="submit">Save</button><button class="abtn" type="button" id="cancel">Cancel</button></div></form>';
      pic.mount(app);
      $("#back").onclick = $("#cancel").onclick = function () { showList("episodes"); };
      $("#ep-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var err = $("#form-err"); err.textContent = "";
        var title = $("#e-title").value.trim();
        if (!title) { err.textContent = "Please add a title."; return; }
        var links = { youtube: $("#e-yt").value.trim(), spotify: $("#e-sp").value.trim(), apple: $("#e-ap").value.trim() };
        for (var k in links) if (links[k] && !/^https?:\/\//i.test(links[k])) { err.textContent = "Links must start with https://"; return; }
        var btn = $("button[type=submit]"); btn.disabled = true; btn.textContent = "Saving…";
        var row = {
          title: title, description: $("#e-desc").value.trim(), image_url: pic.state.url || "",
          youtube: links.youtube, spotify: links.spotify, apple: links.apple,
          published: $("#e-status").value === "1", published_at: fromDateInput($("#e-date").value, p.published_at)
        };
        var q = id ? sb.from("episodes").update(row).eq("id", id) : sb.from("episodes").insert(row);
        q.then(function (r2) {
          if (r2.error) { btn.disabled = false; btn.textContent = "Save"; err.textContent = friendlyError(r2.error); return; }
          toast(row.published ? "Saved and live on the site." : "Saved as a draft.");
          showList("episodes");
        });
      });
    });
  }

  boot();
})();
