// Applies the saved theme before first paint to avoid a flash.
export function ThemeScript({ theme, fontScale }: { theme: "light" | "dark" | "system"; fontScale: number }) {
  const code = `(function(){try{var t=localStorage.getItem('cb-theme')||${JSON.stringify(theme)};var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);var f=parseFloat(localStorage.getItem('cb-font')||'${fontScale}');if(f&&f>0.5&&f<2){document.documentElement.style.setProperty('--font-scale',String(f));}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
