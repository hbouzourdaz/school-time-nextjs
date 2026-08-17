module.exports = {
  plugins: [
    require("@tailwindcss/postcss"),
    require("./postcss-strip-bom.cjs"),
  ],
};
