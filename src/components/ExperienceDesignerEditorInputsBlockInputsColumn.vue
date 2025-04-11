<script setup lang="ts"></script>

<template>
    <div class="experience-designer-editor-inputs-block-inputs-column">
        <slot></slot>
    </div>
</template>

<style scoped>
.experience-designer-editor-inputs-block-inputs-column {
    width: 100%;

    display: flex;
    flex-direction: column;
    align-items: flex-start;

    gap: 2px 0;
}
</style>
