const { DateTime } = require("luxon");
const { createHash } = require("node:crypto");
const { readFileSync, existsSync } = require("node:fs");
const pluginRss = require("@11ty/eleventy-plugin-rss").default;
const pluginNavigation = require("@11ty/eleventy-navigation");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const sitemap = require("@quasibit/eleventy-plugin-sitemap");

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
};
const assetPaths = {
  stylesheet: `/assets/css/index.${contentHash(assetFiles.stylesheet)}.css`,
};

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(pluginNavigation);
  eleventyConfig.addPlugin(sitemap, {
    sitemap: {
      // GitHub Pages concept URL; switch to the client's domain at launch.
      hostname: "https://sebastiansells13-bot.github.io/3-brothers-shop",
    },
  });

  eleventyConfig.setUseGitIgnore(false);
  eleventyConfig.ignores.add("**/.DS_Store");
  eleventyConfig.watchIgnores.add("**/.DS_Store");
  eleventyConfig.setDataDeepMerge(true);
  eleventyConfig.addGlobalData("assetPaths", assetPaths);

  eleventyConfig.addLayoutAlias("page", "layouts/page.njk");
  eleventyConfig.addLayoutAlias("post", "layouts/post.njk");

  eleventyConfig.addFilter("telHref", (phone) => `tel:+1${String(phone).replace(/\D/g, "").slice(-10)}`);
  eleventyConfig.addFilter("mapQuery", (address) => encodeURIComponent(address));
  eleventyConfig.addFilter("compactValues", (obj) => Object.values(obj || {}).filter(Boolean));

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
