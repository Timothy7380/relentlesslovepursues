(function () {
  "use strict";

  /* Theme toggle ---------------------------------------------------- */
  var root = document.documentElement;
  var toggleBtn = document.getElementById("theme-toggle");
  var moonIcon = document.getElementById("theme-icon-moon");
  var sunIcon = document.getElementById("theme-icon-sun");
  var themeLabel = document.getElementById("theme-label");

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    var isDark = theme === "dark";
    moonIcon.classList.toggle("is-hidden", !isDark);
    sunIcon.classList.toggle("is-hidden", isDark);
    themeLabel.textContent = isDark ? "Dark" : "Light";
  }

  function getStoredTheme() {
    try {
      var t = window.localStorage.getItem("theme");
      return t === "light" || t === "dark" ? t : "dark";
    } catch (e) {
      return "dark";
    }
  }

  applyTheme(getStoredTheme());

  toggleBtn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      window.localStorage.setItem("theme", next);
    } catch (e) {
      /* ignore */
    }
  });

  /* Talks carousel ---------------------------------------------------- */
  var track = document.getElementById("talks-track");
  if (track) {
    var cards = Array.prototype.slice.call(track.querySelectorAll(".talk-card"));
    var active = 0;
    var playing = false;

    function setActive(index) {
      var clamped = Math.max(0, Math.min(cards.length - 1, index));
      cards[active].classList.remove("is-active");
      cards[active].setAttribute("aria-selected", "false");
      active = clamped;
      cards[active].classList.add("is-active");
      cards[active].setAttribute("aria-selected", "true");
      cards[active].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      setPlaying(false);
    }

    function setPlaying(isPlaying) {
      playing = isPlaying;
      var media = cards[active].querySelector(".talk-card__media");
      if (playing) {
        media.innerHTML = '<span class="label">Now playing (placeholder)</span>';
      } else {
        media.innerHTML =
          '<svg viewBox="0 0 24 24" fill="currentColor" class="icon-lg play-icon"><path d="M8 5.5v13l11-6.5-11-6.5Z"/></svg>';
      }
    }

    cards.forEach(function (card, i) {
      card.addEventListener("click", function () {
        setActive(i);
      });
    });

    track.addEventListener("keydown", function (e) {
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setActive(active + 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          setActive(active - 1);
          break;
        case "PageDown":
          e.preventDefault();
          setActive(active + 10);
          break;
        case "PageUp":
          e.preventDefault();
          setActive(active - 10);
          break;
        case "Home":
          e.preventDefault();
          setActive(0);
          break;
        case "End":
          e.preventDefault();
          setActive(cards.length - 1);
          break;
        case "Enter":
          e.preventDefault();
          setPlaying(true);
          break;
        case "Escape":
          e.preventDefault();
          setPlaying(false);
          break;
      }
    });
  }
})();
