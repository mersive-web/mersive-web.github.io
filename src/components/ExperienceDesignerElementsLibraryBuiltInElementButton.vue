<script setup lang="ts">
import { experienceDesignerElementsLibrarySearchQueryIK } from '@/injectionKeys'
import { computed, inject, ref } from 'vue'

const emit = defineEmits(['click'])

const props = defineProps({
    iconPath: {
        type: String,
        required: true,
    },
    elementName: {
        type: String,
        required: true,
    },
})

const experienceDesignerElementsLibrarySearchQuery = inject(
    experienceDesignerElementsLibrarySearchQueryIK,
    ref(''),
)

const showButton = computed(() => {
    if (experienceDesignerElementsLibrarySearchQuery.value != '') {
        return props.elementName
            .toLowerCase()
            .includes(experienceDesignerElementsLibrarySearchQuery.value.toLowerCase().trim())
    } else {
        return true
    }
})
</script>

<template>
    <button
        v-show="showButton"
        class="elements-library__built-in-element-button"
        tabindex="-1"
        @click="emit('click')"
    >
        <img class="elements-library__built-in-element-button__icon" :src="iconPath" alt="" />
        {{ elementName }}
    </button>
</template>

<style scoped>
.elements-library__built-in-element-button {
    width: 150px;

    display: flex;
    align-items: center;

    font-size: 0.8em;
    text-align: left;
    line-height: 1.4;

    padding: 1em;
    background-color: var(--mersive-c-grey);
    color: var(--mersive-c-white);
    backdrop-filter: blur(4px);

    border-radius: 6px;

    cursor: pointer;
    transition: background-color 0.1s linear;
}

.elements-library__built-in-element-button:hover {
    background-color: var(--mersive-c-grey-dark);
}

.elements-library__built-in-element-button__icon {
    width: 24px;
    height: 24px;

    margin: 0 1em 0 0;
}
</style>
