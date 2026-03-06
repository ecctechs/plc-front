import { createApp } from "vue";
import App from "./App.vue";
import './style.css'
import VCalendar from "@peeraop21/v-calendar-buddhist";
import "@peeraop21/v-calendar-buddhist/style.css";

const app = createApp(App);

app.config.devtools = true;

app.use(VCalendar, {
  locale: "th-TH",
  firstDayOfWeek: 1,
});

app.mount("#app");

