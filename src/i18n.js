// Minimal UI localization. Only framework copy is translated; brand names,
// software names, stylized strings and article content stay as authored.
import { createContext, createElement, useCallback, useContext, useMemo, useState } from "react";

export const LANGS = ["en", "zh"];
export const LANG_KEY = "lang";
export const LANG_CHOSEN_KEY = "langChosen";

export const translations = {
  en: {
    home: "HOME",
    blog: "BLOG",
    photo: "PHOTO",
    uses: "USES",
    edition: "digital presence",
    editionSub: "2026 edition",
    aboutMe: "About me",
    funFacts: "Fun facts",
    localTime: "local time",
    presence: "presence",
    connect: "Connect",
    notLinked: "not linked",
    sidebarNote: "One identity, four views.",
    sidebarNote2:
      "Home is the live surface; Blog, Photo and Uses reuse the same fixed identity rail.",
    status: "Status",
    weather: "Weather",
    softwareToday: "Software / today",
    foreground: "foreground",
    keys: "keys",
    mapUnavailable: "Map unavailable",
    mapLoading: "Loading map...",
    loading: "loading...",
    unavailable: "unavailable",
    currentWeather: "Current weather",
    feels: "feels",
    wind: "wind",
    musicStatus: "Music Status",
    musicNever: "Music not linked yet",
    musicNeverDetail: "Waiting for the first local sync",
    nowPlaying: "Now playing",
    paused: "Paused",
    lastPlayed: "Last played",
    music: "Music",
    photo2: "Photo",
    latestFrame: "latest frame",
    openArchive: "open archive",
    noPhotos: "No photos yet",
    fitness: "Fitness",
    stepsToday: "steps - today",
    notSynced: "not synced",
    devices: "Devices",
    daily: "daily",
    play: "play",
    homePageTitle1: "Places, moments,",
    homePageTitle2: "and fragments.",
    photoIntro:
      "A visual archive. Mixed portrait and landscape images are laid out by React Photo Album rather than forced into one crop ratio.",
    loadingArchive: "Loading archive...",
    photoCount: "frames",
    closeViewer: "Close",
    previousPhoto: "Previous photo",
    nextPhoto: "Next photo",
    blogEyebrow: "BLOG / NOTES",
    blogTitle1: "Things worth",
    blogTitle2: "writing down.",
    blogIntro:
      "Longer notes on software, security, VR, experiments and whatever is occupying my attention.",
    noPosts: "No published posts yet.",
    noPostsDetail:
      "The blog structure is live and Markdown-ready. Drafts stay invisible until they are marked published.",
    loadingArticle: "Loading article...",
    usesEyebrow: "USES / SOFTWARE",
    usesTitle1: "The tools behind",
    usesTitle2: "my screen time.",
    usesIntro:
      "A personal software shelf, not a recommendation list. The live today percentages stay on Home; this page is the slower, more permanent inventory.",
    usesFoot1: "Hardware stays on Home for now.",
    usesFoot2: "Software icons - self-hosted",
    softwareNotLinked: "Software aggregate not linked",
    softwareNotLinkedDetail:
      "Run bridge/whatpulse_presence.py to publish today's foreground application time.",
    keyboardNotLinked: "Keyboard aggregate not linked",
    keyboardNotLinkedDetail:
      "No privacy-filtered keyboard aggregate yet for this device; no live keystrokes or key order leave the computer.",
    mapAvatarAlt: "Map avatar",
    space: "space",
    about: "A student learning computer science and engineering.",
    softwareList: "softwareList",
    groups: { Development: "Development", AI: "AI", VR: "VR", Daily: "Daily" },
    groupNotes: {
      "things I build with": "things I build with",
      "thinking + coding": "thinking + coding",
      "social + PCVR": "social + PCVR",
      "notes + utilities": "notes + utilities",
    },
    funFactsItems: [
      "19 years old",
      "MBTI: INTJ-A",
      "amateur VRChat dancer, mostly chatting on desktop",
      "learning Japanese",
    ],
    phoneOnline: "Online",
    phoneFocus: "Focus",
    phoneSleep: "Sleep",
    phoneNotSynced: "not synced",
    phoneNotLinked: "not linked",
    discordOnline: "online",
    discordIdle: "idle",
    discordDnd: "do not disturb",
    discordOffline: "offline",
    weatherCodes: {
      0: "Clear",
      1: "Mostly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      51: "Drizzle",
      61: "Rain",
      63: "Rain",
      65: "Heavy rain",
      80: "Showers",
      95: "Thunderstorm",
    },
    langPickerTitle: "Choose your language",
    langPickerBody: "You can switch anytime from the top-right.",
    langEn: "English",
    langZh: "Chinese",
    notFoundTitle: "Page not found.",
    notFoundBody: "That URL does not match anything on this site.",
    backHome: "Back to Home",
  },
  zh: {
    home: "HOME",
    blog: "BLOG",
    photo: "PHOTO",
    uses: "USES",
    edition: "digital presence",
    editionSub: "2026 edition",
    aboutMe: "关于我",
    funFacts: "趣事",
    localTime: "本地时间",
    presence: "在线状态",
    connect: "联系我",
    notLinked: "未链接",
    sidebarNote: "一个身份，四个视角。",
    sidebarNote2: "Home 是实时页面；Blog、Photo 和 Uses 复用同一条固定的身份侧栏。",
    status: "状态",
    weather: "天气",
    softwareToday: "软件 / 今日",
    foreground: "前台",
    keys: "次按键",
    mapUnavailable: "地图不可用",
    mapLoading: "地图加载中...",
    loading: "加载中...",
    unavailable: "不可用",
    currentWeather: "当前天气",
    feels: "体感",
    wind: "风速",
    musicStatus: "音乐状态",
    musicNever: "音乐尚未链接",
    musicNeverDetail: "等待首次本地同步",
    nowPlaying: "正在播放",
    paused: "已暂停",
    lastPlayed: "最近播放",
    music: "音乐",
    photo2: "照片",
    latestFrame: "最新一帧",
    openArchive: "打开相册",
    noPhotos: "暂无照片",
    fitness: "健康",
    stepsToday: "步数 - 今日",
    notSynced: "未同步",
    devices: "设备",
    daily: "日常",
    play: "娱乐",
    homePageTitle1: "地方、瞬间，",
    homePageTitle2: "与碎片。",
    photoIntro:
      "一个视觉档案。竖屏与横屏图片由 React Photo Album 自适应排版，而非强行统一裁切比例。",
    loadingArchive: "正在加载相册...",
    photoCount: "张",
    closeViewer: "关闭",
    previousPhoto: "上一张",
    nextPhoto: "下一张",
    blogEyebrow: "BLOG / NOTES",
    blogTitle1: "值得记下",
    blogTitle2: "的东西。",
    blogIntro: "关于软件、安全、VR、实验，以及任何占据我注意力的事情，的长篇笔记。",
    noPosts: "暂无已发布的文章。",
    noPostsDetail: "日志结构已就绪并支持 Markdown。草稿在标记为已发布前不会显示。",
    loadingArticle: "正在加载文章...",
    usesEyebrow: "USES / SOFTWARE",
    usesTitle1: "支撑我",
    usesTitle2: "屏幕时间的工具。",
    usesIntro:
      "一个个人软件架，而非推荐清单。实时的今日占比留在 Home；这个页面是更慢、更长久的清单。",
    usesFoot1: "硬件目前仍在 Home 上展示。",
    usesFoot2: "软件图标 - 自托管",
    softwareNotLinked: "软件聚合数据未链接",
    softwareNotLinkedDetail: "运行 bridge/whatpulse_presence.py 以发布今日的前台应用时长。",
    keyboardNotLinked: "键盘聚合数据未链接",
    keyboardNotLinkedDetail:
      "此设备暂无经过隐私过滤的键盘聚合数据；任何实时按键或按键顺序都不会离开这台电脑。",
    mapAvatarAlt: "地图头像",
    space: "空格",
    about: "一名学习计算机科学与工程的学生。",
    softwareList: "软件列表",
    groups: { Development: "开发", AI: "AI", VR: "VR", Daily: "日常" },
    groupNotes: {
      "things I build with": "我的开发工具",
      "thinking + coding": "思考 + 编码",
      "social + PCVR": "社交 + PCVR",
      "notes + utilities": "笔记 + 工具",
    },
    funFactsItems: [
      "19 岁",
      "MBTI：INTJ-A",
      "业余 VRChat 舞者，大多数时间在桌面端聊天",
      "正在学习日语",
    ],
    phoneOnline: "在线",
    phoneFocus: "专注",
    phoneSleep: "睡眠",
    phoneNotSynced: "未同步",
    phoneNotLinked: "未链接",
    discordOnline: "在线",
    discordIdle: "空闲",
    discordDnd: "勿扰",
    discordOffline: "离线",
    weatherCodes: {
      0: "晴",
      1: "多云",
      2: "少云",
      3: "阴",
      45: "雾",
      51: "毛毛雨",
      61: "小雨",
      63: "中雨",
      65: "大雨",
      80: "阵雨",
      95: "雷阵雨",
    },
    langPickerTitle: "选择语言",
    langPickerBody: "你随时可以在右上角切换。",
    langEn: "English",
    langZh: "中文",
    notFoundTitle: "找不到页面。",
    notFoundBody: "这个网址在本站并没有对应的内容。",
    backHome: "返回首页",
  },
};
export function detectInitialLang() {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (LANGS.includes(stored)) return stored;
  } catch {
    /* localStorage can be unavailable (private mode); fall through to English. */
  }
  return "en";
}

// The active language, its setter and the resolved translation table travel
// together through one React context. There is intentionally no module-level
// mutable state or subscriber registry: a single provider owns the value.
export const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(detectInitialLang);

  const setLang = useCallback((next) => {
    if (!LANGS.includes(next)) return;
    setLangState(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      /* Persisting the choice is best-effort. */
    }
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);

  // createElement keeps this a plain .js module (no JSX extension needed).
  return createElement(LangContext.Provider, { value }, children);
}

export function useLang() {
  const ctx = useContext(LangContext);
  return ctx ? ctx.lang : "en";
}

export function useSetLang() {
  const ctx = useContext(LangContext);
  return ctx ? ctx.setLang : () => {};
}

// Returns the translation table for the current language, layered over English
// so any missing key falls back to English instead of rendering undefined.
// A plain merged object is enough here — no Proxy — and it is built once per
// language change rather than on every render.
export function useT() {
  const ctx = useContext(LangContext);
  const lang = ctx ? ctx.lang : "en";
  return useMemo(
    () => (lang === "en" ? translations.en : { ...translations.en, ...translations[lang] }),
    [lang]
  );
}

// Non-React lookup for code paths that are not components (kept for parity with
// the old API); components should prefer useT().
export function t(key, lang) {
  const table = translations[lang] || translations.en;
  const value = table[key];
  return value === undefined ? translations.en[key] : value;
}
