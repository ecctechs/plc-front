import { createApp, computed } from "vue";
import { createI18n } from "vue-i18n";
import App from "./App.vue";
import './style.css'
import VCalendar from "@peeraop21/v-calendar-buddhist";
import "@peeraop21/v-calendar-buddhist/style.css";
import th from "./locales/th.json";
import en from "./locales/en.json";

const app = createApp(App);

app.config.devtools = true;

app.use(VCalendar, {
  locale: "th-TH",
  firstDayOfWeek: 1,
});

const savedLocale = localStorage.getItem('locale') || 'th';

const i18n = createI18n({
  legacy: true,
  locale: savedLocale,
  fallbackLocale: "en",
  globalInjection: true,
  messages: {
    th,
    en,
  },
});

app.use(i18n);

const currentLocale = computed(() => i18n.global.locale);
const locale = {
  get current() {
    return currentLocale.value;
  },
  t(key) {
    return i18n.global.t(key);
  },
  toggle() {
    i18n.global.locale = i18n.global.locale === "th" ? "en" : "th";
    localStorage.setItem('locale', i18n.global.locale);
  }
};

app.provide('locale', locale);

app.mount("#app");

