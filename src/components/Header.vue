<template>
  <div>
    <h1>Header View</h1>
    <div
      class="h-24 p-[10px] grid items-center text-center hover:text-red-700"
    >
      <label for="lang"
        ><i class="bx bx-globe text-[28px] cursor-pointer"></i
      ></label>
      <select
        id="lang"
        v-model="selectedLang"
        @change="changeLanguage(selectedLang)"
        class="text-lg xl:text-base cursor-pointer bg-white text-gray-900 dark:bg-gray-800 dark:text-white dark:border-gray-600 outline-none border-none"
      >
        <option value="en" class="hover:text-red-700 text-[14px]">EN</option>
        <option value="ru" class="hover:text-red-700 text-[14px]">RU</option>
        <option value="uz" class="hover:text-red-700 text-[14px]">UZ</option>
        <option value="tr" class="hover:text-red-700 text-[14px]">TR</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
const { t, locale } = useI18n();
const selectedLang = ref(locale.value);
const changeLanguage = (lang: string) => {
  locale.value = lang;
  localStorage.setItem("lang", lang);
};
</script>

<style scoped></style>
