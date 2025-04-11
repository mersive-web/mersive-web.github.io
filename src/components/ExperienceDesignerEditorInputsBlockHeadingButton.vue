<script setup lang="ts">
defineProps({
    isEnabled: {
        type: Boolean,
        required: false,
        default: false,
    },
    tooltipText: {
        type: String,
        required: false,
        default: '',
    },
    iconPath: {
        type: String,
        required: true,
    },
})

const emit = defineEmits(['click'])
</script>

<template>
    <button
        class="experience-designer-editor-inputs-block-heading-button"
        :class="{
            'experience-designer-editor-inputs-block-heading-button--enabled': isEnabled,
        }"
        tabindex="-1"
        :title="tooltipText"
        @click="emit('click')"
    >
        <img :src="iconPath" alt="" />
    </button>
</template>

<style scoped>
.experience-designer-editor-inputs-block-heading-button {
    width: 32px;
    height: 24px;

    display: flex;
    align-items: center;
    justify-content: center;

    background-color: var(--mersive-c-grey);
    border-radius: 6px;

    transition: background-color 0.1s ease-in;

    cursor: pointer;
}

.experience-designer-editor-inputs-block-heading-button:hover {
    background-color: var(--mersive-c-grey-dark);
}

.experience-designer-editor-inputs-block-heading-button--enabled,
.experience-designer-editor-inputs-block-heading-button--enabled:hover {
    background-color: var(--mersive-c-blue);
}

.experience-designer-editor-inputs-block-heading-button img {
    width: 20px;
    height: 20px;
}
</style>
