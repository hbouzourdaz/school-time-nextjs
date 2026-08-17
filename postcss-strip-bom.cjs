/**
 * PostCSS plugin: strip UTF-8 BOM (U+FEFF) that Tailwind CSS v4
 * injects into its generated output on Windows.
 * Turbopack's Lightning CSS parser treats the BOM as an invalid
 * selector combinator, causing "Parsing CSS source code failed".
 */
module.exports = () => ({
  postcssPlugin: "strip-bom",
  OnceExit(root) {
    const strip = (s) => (typeof s === "string" ? s.replace(/^\uFEFF/, "") : s);
    // Strip BOM from root raws
    if (root.raws) {
      for (const k of Object.keys(root.raws)) {
        if (typeof root.raws[k] === "string") root.raws[k] = strip(root.raws[k]);
      }
    }
    // Strip BOM from every node in the tree
    root.walk((node) => {
      if (node.raws) {
        for (const k of Object.keys(node.raws)) {
          if (typeof node.raws[k] === "string") node.raws[k] = strip(node.raws[k]);
        }
      }
    });
  },
});
module.exports.postcss = true;
