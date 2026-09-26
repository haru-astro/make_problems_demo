/**
 * 端末（OS）のダークモード設定に合わせて配色を切り替えるスクリプト。
 * 画面から手動で切り替える機能は持たないため、OSの設定だけを見る。
 */
export const themeScript = `(function(){try{document.documentElement.classList.toggle("dark",window.matchMedia("(prefers-color-scheme: dark)").matches);}catch(e){}})();`;
