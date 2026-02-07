<template>
    <div>
        <Header/>
        <main>
          <RouterView />
        </main>
    </div>
</template>

<script setup lang="ts">
    import Header from "../../components/Header.vue";
    import { useRoute } from "vue-router";
    const route = useRoute();
</script>

<style scoped>

</style>