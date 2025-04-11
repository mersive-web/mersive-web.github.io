<script setup lang="ts">
import { ref } from 'vue'

const searchQuery = ref('')

defineEmits<{
    searchBarInput: [searchQuery: string]
}>()
</script>

<template>
    <div class="search-bar-wrapper">
        <img
            class="search-bar-wrapper__search-icon"
            src="./../assets/icons/search_200.svg"
            alt=""
        />
        <input
            v-model="searchQuery"
            type="text"
            class="search-bar-wrapper__search-bar"
            placeholder="Search"
            @input="$emit('searchBarInput', searchQuery)"
        />
    </div>
</template>

<style scoped>
.search-bar-wrapper {
    position: relative;

    display: flex;
    align-items: center;
}

.search-bar-wrapper__search-icon {
    position: absolute;
    left: 10px;

    width: 24px;
    height: 24px;
}

.search-bar-wrapper__search-bar {
    width: 250px;

    background-color: var(--mersive-c-grey);
    color: var(--mersive-c-white-soft);
    font-size: 0.9em;

    padding: 0.4em 1em 0.4em 2.6em;
    border: none;
    border-radius: 80px;
    outline: none;
}
</style>
