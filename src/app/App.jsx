import { useEffect, useState } from "react";
import { LangProvider, useLang, useSetLang, LANG_CHOSEN_KEY } from "../i18n";
import AppRouter from "./Router.jsx";
import LangPicker from "../components/LangPicker.jsx";

// Keep <html lang> in sync with the chosen UI language: assistive tech and
// crawlers read it, and it must not stay "en" after switching to Chinese.
function useDocumentLang(lang) {
  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);
}

function AppShell() {
  const lang = useLang();
  const setLang = useSetLang();
  useDocumentLang(lang);
  const [asking, setAsking] = useState(() => {
    try {
      return localStorage.getItem(LANG_CHOSEN_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const choose = (l) => {
    setLang(l);
    setAsking(false);
    try {
      localStorage.setItem(LANG_CHOSEN_KEY, "1");
    } catch {
      /* best-effort persistence */
    }
  };
  return (
    <>
      {asking && <LangPicker onChoose={choose} />}
      <AppRouter />
    </>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AppShell />
    </LangProvider>
  );
}
