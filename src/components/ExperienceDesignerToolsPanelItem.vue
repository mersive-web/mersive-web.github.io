<script setup lang="ts">
import { useExperienceDesignerStore } from '@/stores/experienceDesigner'
import type { Tool } from '@/types'
import { computed } from 'vue'

const experienceDesignerStore = useExperienceDesignerStore()

const props = defineProps({
    name: {
        type: String,
        required: true,
    },
    iconPath: {
        type: String,
        required: true,
    },
})

function handleToolSelection() {
    if (!isDisabled.value) {
        experienceDesignerStore.setActiveTool(props.name as Tool)
    }
}

const isDisabled = computed(() => {
    return experienceDesignerStore.enabledTools.includes(props.name as Tool) ? false : true
})
</script>

<template>
    <button
        class="tools-panel__item"
        :class="{
            'tools-panel__item--active': experienceDesignerStore.activeTool == props.name,
            'tools-panel__item--disabled': isDisabled,
        }"
        tabindex="-1"
        @click="handleToolSelection"
    >
        <img :src="props.iconPath" alt="" />
    </button>
</template>

<style scoped>
.tools-panel__item {
    width: 40px;
    height: 40px;

    display: flex;
    align-items: center;
    justify-content: center;

    /* background-color: var(--color-background); */
    background-color: var(--mersive-c-black-op-80);
    backdrop-filter: blur(4px);
    border-radius: 6px;

    transition: background-color 0.1s linear;
    cursor: pointer;
    outline: none;
}

.tools-panel__item:not(.tools-panel__item--disabled):hover,
.tools-panel__item--active {
    background-color: var(--mersive-c-blue);
    /* background-color: var(--color-accent); */
}

.tools-panel__item--disabled {
    cursor: not-allowed;
}

.tools-panel__item img {
    width: 32px;
    height: 32px;
}
</style>
