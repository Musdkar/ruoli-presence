import { useState } from "react";
import { config } from "../config";
import { useLang, setLang, LangContext, LANG_CHOSEN_KEY } from "../i18n";
import { SiteRouter, LanyardApp } from "./Router.jsx";
import LangPicker from "../components/LangPicker.jsx";

export default function App() {
  const lang = useLang();
  const [asking, setAsking] = useState(() => {
    try {
      return localStorage.getItem(LANG_CHOSEN_KEY) !== "1";
    } catch (e) {
      return true;
    }
  });
  const choose = (l) => {
    setLang(l);
    setAsking(false);
    try {
      localStorage.setItem(LANG_CHOSEN_KEY, "1");
    } catch (e) {}
  };
  const content = config.discordId ? <LanyardApp /> : <SiteRouter presence={null} />;
  return (
    <LangContext.Provider value={lang}>
      {asking && <LangPicker onChoose={choose} />}
      {content}
    </LangContext.Provider>
  );
}
