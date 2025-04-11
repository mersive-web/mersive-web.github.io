<script setup lang="ts">
import eventBus from '@/eventBus'
import type { ElementsLibraryCategory } from '@/types'

defineProps({
    categoriesBreadcrumbsLevels: {
        type: Array<ElementsLibraryCategory>,
        required: true,
    },
})
</script>

<template>
    <div class="elements-library__breadcrumbs">
        <template v-for="(level, index) in categoriesBreadcrumbsLevels" :key="level">
            <span
                class="elements-library__breadcrumbs__level"
                @click="eventBus.emit('elementsLibraryCategoryChanged', { newCategory: level })"
                >{{ level }}</span
            >
            <img
                v-if="index !== categoriesBreadcrumbsLevels.length - 1"
                class="elements-library__breadcrumbs__arrow"
                src="./../assets/icons/chevron_right_400.svg"
                alt=""
            />
        </template>
    </div>
</template>

<style scoped>
.elements-library__breadcrumbs {
    min-height: 16px;

    display: flex;
    align-items: center;

    font-size: 0.8em;
    margin: 0 0 1.2em 0;
}

.elements-library__breadcrumbs__level:hover {
    text-decoration: underline;
    cursor: pointer;
}

.elements-library__breadcrumbs__arrow {
    width: 16px;
    height: 16px;

    margin: 0 2px;
}
</style>
