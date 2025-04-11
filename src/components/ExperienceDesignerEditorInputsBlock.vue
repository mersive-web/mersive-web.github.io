<script setup lang="ts"></script>

<template>
    <div class="experience-designer-editor-inputs-block">
        <div class="experience-designer-editor-inputs-block__heading">
            <span class="experience-designer-editor-inputs-block__heading__text">
                <slot name="heading-text"></slot>
            </span>
            <template v-if="$slots['heading-buttons']">
                <slot name="heading-buttons"></slot>
            </template>
        </div>
        <div class="experience-designer-editor-inputs-block__body">
            <slot name="body"></slot>
        </div>
    </div>
</template>

<style scoped>
.experience-designer-editor-inputs-block {
    width: 100%;

    display: flex;
    flex-direction: column;
    align-items: flex-start;

    gap: 0.5em 0;
}

.experience-designer-editor-inputs-block__heading {
    font-size: 0.8em;
    color: var(--mersive-c-white);

    display: flex;
    align-items: center;

    gap: 0 0.5em;
}

.experience-designer-editor-inputs-block__body {
    width: 100%;

    display: flex;
    flex-direction: column;
    align-items: flex-start;

    gap: 0.5em 0;
}
</style>
