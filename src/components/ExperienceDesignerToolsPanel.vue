<script setup lang="ts">
import ExperienceDesignerToolsPanelItem from './ExperienceDesignerToolsPanelItem.vue'
import selectIcon from '@/assets/icons/select.svg'
import moveIcon from '@/assets/icons/move_300.svg'
import rotateIcon from '@/assets/icons/rotate_300.svg'
import scaleIcon from '@/assets/icons/scale.svg'
</script>

<template>
    <div class="tools-panel">
        <ExperienceDesignerToolsPanelItem name="select" :icon-path="selectIcon" />
        <ExperienceDesignerToolsPanelItem name="move" :icon-path="moveIcon" />
        <ExperienceDesignerToolsPanelItem name="rotate" :icon-path="rotateIcon" />
        <ExperienceDesignerToolsPanelItem name="scale" :icon-path="scaleIcon" />
    </div>
</template>

<style scoped>
.tools-panel {
    position: absolute;
    top: 60px;
    left: 24px;

    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0 8px;

    user-select: none;
}
</style>
