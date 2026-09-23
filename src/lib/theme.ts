export const THEME_STORAGE_KEY = "jao-theme";

/** 初期描画時のちらつきを防ぐためのインラインスクリプト */
export const themeScript = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
