import { createI18n } from "vue-i18n";

import en from "../locale/messages/en.json";
import ru from "../locale/messages/ru.json";
import uz from "../locale/messages/uz.json";

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem("lang") || "uz",
  fallbackLocale: "uz",
  messages: { en, ru, uz},
});

export default i18n;
