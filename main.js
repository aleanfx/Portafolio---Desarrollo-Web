// PROJECT STRUCTURE: All assets and scripts are located in the project root (no "modules" folder, no "assets" folder).
// Audio files expected at project root (e.g. hover-sfx.mp3, ambient.mp3). Tap SFX was removed.

// Simple scroll reveal for sections and cards
document.addEventListener("DOMContentLoaded", () => {
  const revealElements = [
    ...document.querySelectorAll(".section"),
    ...document.querySelectorAll(".card"),
    ...document.querySelectorAll(".tag"),
    ...document.querySelectorAll(".reason"),
  ];

  revealElements.forEach((el) => el.classList.add("reveal"));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
    }
  );

  revealElements.forEach((el) => observer.observe(el));

  // -------------------------
  // Portfolio preview modal
  // -------------------------
  const modal = document.getElementById("preview-modal");
  const modalIframe = modal.querySelector(".preview-frame-wrap iframe");
  const closeBtn = modal.querySelector(".preview-close");
  const backdrop = modal.querySelector(".preview-backdrop");

  function openPreview(src, title) {
    // lazy load iframe src only when opening
    modalIframe.src = src;
    modalIframe.title = title || "Vista previa";
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    // focus close button for accessibility
    closeBtn.focus();
  }

  function closePreview() {
    modal.setAttribute("aria-hidden", "true");
    // stop the iframe to free resources by clearing src
    modalIframe.src = "about:blank";
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  closeBtn.addEventListener("click", closePreview);
  backdrop.addEventListener("click", closePreview);

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.getAttribute("aria-hidden") === "false") {
      closePreview();
    }
  });

  // enable clicking on small portfolio preview to open modal
  document.querySelectorAll(".portfolio-image").forEach((wrap) => {
    const iframeThumb = wrap.querySelector("iframe");
    // if existing iframes were previously loading src, keep them blank; show thumbnail via same URL in modal
    const src = wrap.getAttribute("data-src") || iframeThumb.getAttribute("data-src") || iframeThumb.src;
    // set the small thumbnail iframe to load the target page as a visual preview (non-interactive)
    // use lazy loading and keep pointer-events disabled in CSS so it's just a preview image
    iframeThumb.loading = "lazy";
    iframeThumb.src = src;
    // try to set a simple background image from the domain's root as fallback preview (non-blocking)
    wrap.addEventListener("click", (e) => {
      openPreview(src, wrap.querySelector("iframe")?.title || "Vista previa del proyecto");
    });

    // add optional long-press behavior: press >= 350ms opens preview
    let pressTimer = null;
    wrap.addEventListener("pointerdown", (ev) => {
      pressTimer = setTimeout(() => openPreview(src, wrap.querySelector("iframe")?.title || "Vista previa del proyecto"), 350);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((evt) => {
      wrap.addEventListener(evt, () => {
        clearTimeout(pressTimer);
        pressTimer = null;
      });
    });
  });

  // -------------------------
  // Ambient background audio handling
  // -------------------------
  (function handleAmbientAudio() {
    const audio = document.getElementById("ambient-audio");
    const btn = document.getElementById("audio-unmute-btn");
    if (!audio) return;

    // set very low default volume for subtle background
    audio.volume = 0.06;

    // try autoplaying; modern browsers may block audible autoplay
    const tryPlay = async () => {
      try {
        await audio.play();
        // if play succeeded, ensure button stays hidden
        btn.hidden = true;
      } catch (err) {
        // autoplay blocked: show unobtrusive unmute button for user to enable sound
        btn.hidden = false;
      }
    };

    // attempt to play after small delay to allow page to stabilize
    setTimeout(tryPlay, 300);

    // if user interacts anywhere on page, attempt to play once (common workaround)
    const interactionPlay = () => {
      if (audio.paused) {
        audio.play().then(() => {
          btn.hidden = true;
        }).catch(() => {
          btn.hidden = false;
        });
      }
    };
    ["pointerdown", "keydown", "touchstart"].forEach((ev) => {
      window.addEventListener(ev, interactionPlay, { once: true, passive: true });
    });

    // clicking the button will unmute / play the audio
    btn.addEventListener("click", async () => {
      try {
        audio.volume = 0.06;
        await audio.play();
        btn.hidden = true;
      } catch (e) {
        // keep button visible if still blocked
        btn.hidden = false;
      }
    });

    // if audio ends / errors, hide button and reset src as fallback (shouldn't happen due to loop)
    audio.addEventListener("error", () => {
      btn.hidden = true;
    });
  })();

  // -------------------------
  // Subtle UI sound effects (hover on desktop, tap on mobile)
  // -------------------------
  (function setupSFX() {
    const sfxHover = document.getElementById("sfx-hover");
    if (!sfxHover) return; // require hover sfx; tap sfx will not be used on touch devices

    // keep hover SFX very low and short; do not enable tap SFX for mobile
    sfxHover.volume = 0.08;
    // tap SFX element removed; mobile tap sounds are intentionally disabled

    // utility to play a sound non-intrusively (reset currentTime to allow rapid retrigger)
    function playSound(el) {
      try {
        el.currentTime = 0;
        const playPromise = el.play();
        if (playPromise && playPromise.catch) playPromise.catch(() => {});
      } catch (e) {}
    }

    // determine if device supports hover (desktop) — only then use pointer hover events
    // treat as hover-capable only when the media query matches AND the device reports no touch input
    const hasHoverMedia = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    const canHover = hasHoverMedia && !hasTouch;

    // target interactive elements that have visible animations / transitions
    // NOTE: removed ".tag" and ".reason" so hovering those items does not play SFX
    const hoverTargetsSelector = [
      ".btn",
      ".card",
      ".portfolio-image",
      ".preview-close",
      ".hero-accent"
    ].join(",");

    // find elements
    const targets = Array.from(document.querySelectorAll(hoverTargetsSelector));

    if (canHover) {
      // desktop: play soft sound on pointerenter (not on pointermove) to avoid spam
      targets.forEach((t) => {
        // use pointerenter to avoid nested repeated events
        t.addEventListener("pointerenter", (e) => {
          // ignore non-primary pointers
          if (e.isPrimary === false) return;
          playSound(sfxHover);
        }, { passive: true });
      });
    } else {
      // mobile: do NOT play the tap SFX; require explicit audio enable for any additional feedback
      const tapTargetsSelector = [
        ".btn",
        ".portfolio-image",
        ".preview-close",
        ".card"
      ].join(",");

      const tapTargets = Array.from(document.querySelectorAll(tapTargetsSelector));

      // helper: check if element is likely to animate (has transition/animation durations > 0)
      function hasAnimations(el) {
        if (!el) return false;
        try {
          const cs = getComputedStyle(el);
          const parseDur = (v) => {
            if (!v) return 0;
            // values can be comma-separated, take the max
            return Math.max(...v.split(",").map(s => {
              s = s.trim();
              if (s.endsWith("ms")) return parseFloat(s);
              if (s.endsWith("s")) return parseFloat(s) * 1000;
              return 0;
            }));
          };
          const tDur = parseDur(cs.transitionDuration);
          const aDur = parseDur(cs.animationDuration);
          if (tDur > 0 || aDur > 0) return true;
          // also check computed transform changes by looking for transform in transition-property
          const tProp = (cs.transitionProperty || "").toLowerCase();
          if (tProp && (tProp.includes("transform") || tProp.includes("opacity") || tProp.includes("all"))) return true;
        } catch (e) {}
        // fallback: check children for animations
        for (let i = 0; i < el.children.length; i++) {
          if (hasAnimations(el.children[i])) return true;
        }
        return false;
      }

      tapTargets.forEach((t) => {
        // prefer pointerdown for immediate feedback, but DO NOT play the tap SFX here
        t.addEventListener("pointerdown", (ev) => {
          // only respond to primary touches/fingers
          if (ev.isPrimary === false) return;
          // do not play sfxTap on mobile per request; keep behavior silent unless user explicitly enables audio
        }, { passive: true });
      });

      // additionally, if user explicitly enables audio via ambient unmute button, allow hover-like feedback on next interactions
      const unmuteBtn = document.getElementById("audio-unmute-btn");
      if (unmuteBtn) {
        unmuteBtn.addEventListener("click", () => {
          // after user explicitly interacts, allow playing hover SFX on next pointerenter as well
          targets.forEach((t) => {
            t.addEventListener("pointerenter", (e) => {
              if (e.isPrimary === false) return;
              playSound(sfxHover);
            }, { passive: true });
          });
        }, { once: true });
      }
    }

    // NEW: ensure every .btn plays the hover SFX on press (pointerdown) across devices
    // This makes buttons produce the same subtle chime when pressed, while other elements keep previous behavior
    const allButtons = Array.from(document.querySelectorAll(".btn"));
    allButtons.forEach((btn) => {
      btn.addEventListener("pointerdown", (ev) => {
        if (ev.isPrimary === false) return;
        playSound(sfxHover);
      }, { passive: true });
    });

    // Accessibility: avoid playing SFX when focus moves via keyboard unless on desktop (reduce noise)
    if (canHover) {
      document.addEventListener("focusin", (e) => {
        const el = e.target;
        if (el && (el.matches && el.matches(hoverTargetsSelector))) {
          playSound(sfxHover);
        }
      });
    }
  })();
});