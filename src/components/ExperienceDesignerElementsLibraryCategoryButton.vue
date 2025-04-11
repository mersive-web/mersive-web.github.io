<script setup lang="ts">
import eventBus from '@/eventBus'
import type { ElementsLibraryCategory } from '@/types'

const { categoryIconPath, categoryName } = defineProps<{
    categoryIconPath: string
    categoryName: ElementsLibraryCategory
}>()
</script>

<template>
    <button
        class="elements-library__category-button"
        tabindex="-1"
        @click="eventBus.emit('elementsLibraryCategoryChanged', { newCategory: categoryName })"
    >
        <img :src="categoryIconPath" alt="" />
        {{ categoryName }}
    </button>
</template>

<style scoped>
.elements-library__category-button {
    width: 150px;

    display: flex;
    align-items: center;

    font-size: 0.8em;
    text-align: left;

    padding: 1em;
    /* background-color: rgb(26 26 26 / 80%); */
    /* background-color: rgb(52 52 52 / 80%); */
    background-color: var(--mersive-c-grey);
    color: var(--mersive-c-white);
    backdrop-filter: blur(4px);

    border-radius: 6px;

    cursor: pointer;
    transition: background-color 0.1s linear;
}

.elements-library__category-button:hover {
    /* background-color: #1d1d1f; */
    background-color: var(--mersive-c-grey-dark);
}

.elements-library__category-button img {
    width: 24px;
    height: 24px;

    margin: 0 1em 0 0;
}
</style>
