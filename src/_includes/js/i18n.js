// English/Spanish toggle, inlined at the end of base.njk. Same markup
// contract as julia-ketsaa-remax's toggle, trimmed to what this site uses.
// Client-side only (no /es/ URLs); the choice persists per visitor.
//
//   data-i18n="key"                → text content from the #i18n-data dictionary
//   data-i18n-attr="alt:key;title:key2" → each listed attribute from the dictionary
//   data-i18n-vars='{"phone":"…"}' → {name} substitutions for the keys above
//                                    (build it in Nunjucks with `| dump`, not `| safe`)
//   data-i18n-lang="en"|"es"       → shown only in that language; macros/bilingual.njk
//                                    renders CMS text and its optional *Es sibling this way
//   data-alt-es="…"                → Spanish alt text written in the CMS (gallery photos)
//   data-i18n-date                 → a <time datetime> re-formatted in the current language
//   data-i18n-title / -title-es    → on <title>, swaps the part before " · "
//
// English always comes from what the template rendered (cached on first
// switch), so the dictionary's "en" values are only a reference.
(function () {
  let dict = {};
  try {
    dict = JSON.parse(document.getElementById("i18n-data").textContent);
  } catch (err) {
    dict = {};
  }

  function currentLang() {
    try {
      return localStorage.getItem("lang") === "es" ? "es" : "en";
    } catch (err) {
      return "en";
    }
  }

  function t(key, vars) {
    const entry = dict[key];
    let text = entry ? entry.es || entry.en || key : key;
    Object.keys(vars || {}).forEach(function (name) {
      text = text.split("{" + name + "}").join(vars[name]);
    });
    return text;
  }

  function varsOf(el) {
    try {
      return el.dataset.i18nVars ? JSON.parse(el.dataset.i18nVars) : undefined;
    } catch (err) {
      return undefined;
    }
  }

  function cache(el, name, value) {
    if (el.dataset[name] === undefined) el.dataset[name] = value;
    return el.dataset[name];
  }

  function formatDate(el) {
    const date = new Date(el.getAttribute("datetime"));
    if (isNaN(date)) return el.dataset.i18nEnText;
    return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  }

  function apply(lang) {
    const es = lang === "es";
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      const en = cache(el, "i18nEnText", el.textContent);
      el.textContent = es ? t(el.dataset.i18n, varsOf(el)) : en;
    });

    document.querySelectorAll("[data-i18n-date]").forEach(function (el) {
      const en = cache(el, "i18nEnText", el.textContent);
      el.textContent = es ? formatDate(el) : en;
    });

    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.dataset.i18nAttr.split(";").forEach(function (pair) {
        const parts = pair.split(":");
        const attr = (parts[0] || "").trim();
        const key = (parts[1] || "").trim();
        if (!attr || !key) return;
        const en = cache(el, "i18nEnAttr" + attr.replace(/[^a-z]/gi, ""), el.getAttribute(attr) || "");
        el.setAttribute(attr, es ? t(key, varsOf(el)) : en);
      });
    });

    document.querySelectorAll("[data-alt-es]").forEach(function (el) {
      const en = cache(el, "i18nEnAlt", el.getAttribute("alt") || "");
      el.setAttribute("alt", es && el.dataset.altEs ? el.dataset.altEs : en);
    });

    document.querySelectorAll("title[data-i18n-title], title[data-i18n-title-es]").forEach(function (el) {
      const en = cache(el, "i18nEnText", el.textContent);
      const sep = en.indexOf(" · ");
      const suffix = sep === -1 ? "" : en.slice(sep);
      el.textContent = es ? (el.dataset.i18nTitleEs || t(el.dataset.i18nTitle)) + suffix : en;
    });

    document.querySelectorAll("[data-i18n-lang]").forEach(function (el) {
      el.hidden = el.dataset.i18nLang !== lang;
    });

    document.querySelectorAll("[data-lang-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.dataset.langToggle === lang));
    });

    document.documentElement.classList.remove("i18n-pending");
  }

  document.querySelectorAll("[data-lang-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      try {
        localStorage.setItem("lang", btn.dataset.langToggle);
      } catch (err) {
        // Storage blocked (private browsing): still switch this page view.
      }
      apply(btn.dataset.langToggle);
    });
  });

  apply(currentLang());
})();
