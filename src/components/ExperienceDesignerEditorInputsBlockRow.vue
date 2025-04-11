<script setup lang="ts"></script>

<template>
    <div class="experience-designer-editor-inputs-block-row">
        <template v-if="$slots['description']">
            <span class="experience-designer-editor-inputs-block-row__description">
                <slot name="description"></slot>
            </span>
        </template>
        <slot></slot>
    </div>
</template>

<style scoped>
.experience-designer-editor-inputs-block-row {
    width: 100%;

    display: flex;
    align-items: center;
    gap: 0 1em;
}

.experience-designer-editor-inputs-block-row__description {
    width: 100%;

    color: var(--mersive-c-white-softer);
    font-size: 0.8em;
    line-height: 1.4;
}
</style>
