const { DateTime } = require("luxon");
const { createHash } = require("node:crypto");
const { readFileSync, existsSync } = require("node:fs");
const pluginRss = require("@11ty/eleventy-plugin-rss").default;
const pluginNavigation = require("@11ty/eleventy-navigation");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");

const isProduction = process.env.ELEVENTY_ENV === "production";
const outputDirectory = isProduction ? "docs" : "dev";

// Content-address an asset so production caching can be immutable and
// far-future without ever serving a stale file after a deploy.
function contentHash(filePath) {
  if (!existsSync(filePath)) return "dev";
  return createHash("sha256").update(readFileSync(filePath)).digest("hex").slice(0, 12);
}

const assetFiles = {
  stylesheet: "src/_includes/css/index.css",
  i18nScript: "src/_includes/js/i18n.js",
  navScript: "src/_includes/js/nav.js",
};
const assetPaths = {
  stylesheet: `/assets/css/index.${contentHash(assetFiles.stylesheet)}.css`,
  i18nScript: `/assets/js/i18n.${contentHash(assetFiles.i18nScript)}.js`,
  navScript: `/assets/js/nav.${contentHash(assetFiles.navScript)}.js`,
};

// The one inline script: it must run before first paint so a saved Spanish
// choice never flashes English. The Content-Security-Policy allows it by hash
// instead of 'unsafe-inline'; everything else loads from /assets/js/.
const i18nBootScript =
  'try{if(localStorage.getItem("lang")==="es")document.documentElement.classList.add("i18n-pending")}catch(e){}';
const i18nBootHash = `sha256-${createHash("sha256").update(i18nBootScript).digest("base64")}`;

// GitHub Pages can't send response headers, so the policy ships as a <meta>
// tag (which can't express frame-ancestors). Google Fonts and the Maps embed
// are the only third parties.
const contentSecurityPolicy = [
  "default-src 'none'",
  `script-src 'self' '${i18nBootHash}'`,
  "style-src 'self' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "frame-src https://www.google.com https://maps.google.com",
  "connect-src 'self'",
  "base-uri 'self'",
  "form-action 'none'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

// JSON for an inline <script> data block: escape the characters that could
// close the tag or start HTML, so CMS text can never break out of it.
const jsonForScript = (value, indent) =>
  JSON.stringify(value, null, indent)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(pluginNavigation);

  eleventyConfig.setUseGitIgnore(false);
  eleventyConfig.ignores.add("**/.DS_Store");
  eleventyConfig.watchIgnores.add("**/.DS_Store");
  eleventyConfig.setDataDeepMerge(true);
  eleventyConfig.addGlobalData("assetPaths", assetPaths);
  eleventyConfig.addGlobalData("isProduction", isProduction);
  eleventyConfig.addGlobalData("i18nBootScript", i18nBootScript);
  eleventyConfig.addGlobalData("contentSecurityPolicy", contentSecurityPolicy);
  eleventyConfig.addFilter("jsonScript", (value) => jsonForScript(value));

  // Only web, mail and phone links from the CMS make it into an href, so a
  // pasted javascript: or data: URL can't run script.
  eleventyConfig.addFilter("safeUrl", (url) => (/^(https?:|mailto:|tel:|\/)/i.test(String(url || "").trim()) ? url : "#"));

  eleventyConfig.addLayoutAlias("page", "layouts/page.njk");
  eleventyConfig.addLayoutAlias("post", "layouts/post.njk");

  eleventyConfig.addFilter("telHref", (phone) => `tel:+1${String(phone).replace(/\D/g, "").slice(-10)}`);
  eleventyConfig.addFilter("mapQuery", (address) => encodeURIComponent(address));
  eleventyConfig.addFilter("compactValues", (obj) => Object.values(obj || {}).filter(Boolean));

  // "130 S Main St, Las Cruces, NM 88001" → schema.org PostalAddress, so the
  // CMS keeps a single address field.
  const postalAddress = (address) => {
    const [street, city, regionZip = ""] = String(address).split(",").map((part) => part.trim());
    const [region, postalCode] = regionZip.split(/\s+/);
    return {
      "@type": "PostalAddress",
      streetAddress: street,
      addressLocality: city,
      addressRegion: region,
      postalCode,
      addressCountry: "US",
    };
  };

  // JSON-LD for every page: the store and website, plus a breadcrumb trail
  // and, on news posts, a BlogPosting. `data` holds the page's front matter.
  eleventyConfig.addFilter("structuredData", (page, business, metadata, data) => {
    const site = metadata.url;
    const storeId = `${site}/#store`;
    const graph = [
      {
        "@type": "HomeGoodsStore",
        "@id": storeId,
        name: business.name,
        alternateName: "3 Brothers Shop",
        description: business.tagline,
        url: `${site}/`,
        logo: `${site}/img/brand/logo.jpg`,
        image: [`${site}/img/brand/logo.jpg`, `${site}/img/brand/storefront-sign.jpg`],
        telephone: `+1-${String(business.phone).replace(/\D/g, "").slice(-10).replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")}`,
        ...(business.email && { email: business.email }),
        address: postalAddress(business.address),
        areaServed: { "@type": "City", name: "Las Cruces, NM" },
        hasMap: `https://www.google.com/maps?q=${encodeURIComponent(business.address)}`,
        founder: { "@type": "Person", name: business.owner },
        knowsLanguage: ["en", "es"],
        sameAs: Object.values(business.social || {}).filter((url) => /^https?:\/\//i.test(url || "")),
      },
      {
        "@type": "WebSite",
        "@id": `${site}/#website`,
        url: `${site}/`,
        name: business.name,
        inLanguage: ["en", "es"],
        publisher: { "@id": storeId },
      },
    ];

    const crumbs = [{ name: "Home", url: `${site}/` }];
    if (data.tags && data.tags.includes("posts")) crumbs.push({ name: "News", url: `${site}/news/` });
    if (page.url !== "/") crumbs.push({ name: data.title, url: `${site}${page.url}` });
    if (crumbs.length > 1) {
      graph.push({
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((crumb, i) => ({ "@type": "ListItem", position: i + 1, name: crumb.name, item: crumb.url })),
      });
    }

    if (data.tags && data.tags.includes("posts")) {
      graph.push({
        "@type": "BlogPosting",
        headline: data.title,
        description: data.description,
        datePublished: DateTime.fromJSDate(page.date, { zone: "utc" }).toISODate(),
        url: `${site}${page.url}`,
        mainEntityOfPage: `${site}${page.url}`,
        ...(data.image && { image: `${site}${data.image}` }),
        inLanguage: "en",
        author: { "@id": storeId },
        publisher: { "@id": storeId },
      });
    }

    return jsonForScript({ "@context": "https://schema.org", "@graph": graph }, 2);
  });

  eleventyConfig.addFilter("readableDate", (dateObj) =>
    DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("LLLL d, yyyy")
  );

  // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
  eleventyConfig.addFilter("htmlDateString", (dateObj) =>
    DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("yyyy-LL-dd")
  );

  eleventyConfig.addFilter("head", (array, n) => {
    if (n < 0) return array.slice(n);
    return array.slice(0, n);
  });

  eleventyConfig.addFilter("slugify", (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  });

  // During `npm start`, serve source images directly instead of copying
  // them into `dev/` on every rebuild. Production media is optimized by
  // the CI pipeline (scripts/optimize-media.mjs) after Eleventy runs.
  eleventyConfig.setServerPassthroughCopyBehavior("passthrough");
  eleventyConfig.addPassthroughCopy({ "src/_includes/img": "img" });
  eleventyConfig.addPassthroughCopy({
    [assetFiles.stylesheet]: assetPaths.stylesheet.slice(1),
  });
  eleventyConfig.addPassthroughCopy({
    [assetFiles.i18nScript]: assetPaths.i18nScript.slice(1),
    [assetFiles.navScript]: assetPaths.navScript.slice(1),
  });
  eleventyConfig.addPassthroughCopy({ "src/_includes/favicons": "favicons" });
  eleventyConfig.addPassthroughCopy(".nojekyll");

  let markdownLibrary = markdownIt({
    html: true,
    breaks: true,
    linkify: true,
  }).use(markdownItAnchor, {
    permalink: markdownItAnchor.permalink.headerLink({ class: "direct-link", symbol: "#" }),
  });
  eleventyConfig.setLibrary("md", markdownLibrary);
  // CMS rich-text and multi-paragraph strings in _data render through this.
  eleventyConfig.addFilter("markdown", (str) => markdownLibrary.render(str || ""));

  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

  return {
    templateFormats: ["md", "njk", "html", "liquid"],
    pathPrefix: "/3-brothers-shop/",
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: outputDirectory,
    },
  };
};
