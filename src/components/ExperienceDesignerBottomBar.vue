<script setup lang="ts">
import { useExperienceDesignerStore } from '@/stores/experienceDesigner'

const experienceDesignerStore = useExperienceDesignerStore()
</script>

<template>
    <div class="bottom-bar">
        <span class="bottom-bar__experience-designer-status">{{
            experienceDesignerStore.status
        }}</span>
        <div class="bottom-bar__scene-infos">
            <span>FPS: {{ experienceDesignerStore.statistics.fps }}</span>
            <span v-if="experienceDesignerStore.statistics.memoryUsedMB == -1"
                >Memory used: Not available
                <span
                    title="This information is not available because your Browser doesn't support the Performance Memory API."
                    class="bottom-bar__scene-infos__memory-not-available-why"
                    >(Why?)</span
                ></span
            >
            <span v-else
                >Memory used:
                {{
                    experienceDesignerStore.statistics.memoryUsedMB.toLocaleString('us-US')
                }}
                MB</span
            >
            <span
                >Vertices:
                {{
                    experienceDesignerStore.statistics.numberOfVertices.toLocaleString('us-US')
                }}</span
            >
            <span
                >Faces:
                {{ experienceDesignerStore.statistics.numberOfFaces.toLocaleString('us-US') }}</span
            >
            <span
                >Meshes:
                {{
                    experienceDesignerStore.statistics.numberOfMeshes.toLocaleString('us-US')
                }}</span
            >
            <span
                >Elements:
                {{
                    experienceDesignerStore.statistics.numberOfElements.toLocaleString('us-US')
                }}</span
            >
        </div>
    </div>
</template>

<style scoped>
.bottom-bar {
    width: 100%;
    height: 30px;

    position: absolute;
    bottom: 0px;

    display: flex;
    align-items: center;

    padding: 8px 24px 7px 24px;

    background-color: var(--color-background);
    color: var(--mersive-c-white-mute);

    font-size: 0.75em;

    pointer-events: none;
    user-select: none;
}

.bottom-bar__experience-designer-status {
    margin: 0 auto 0 0;
}

.bottom-bar__scene-infos {
    display: flex;
}

.bottom-bar__scene-infos span:not(:last-of-type) {
    border-right: 1px solid var(--mersive-c-white-mute);
    padding: 0 4px 0 0;
    margin: 0 4px 0 0;
}

.bottom-bar__scene-infos__memory-not-available-why {
    pointer-events: all;
    user-select: none;
    cursor: help;
    text-decoration: dotted underline var(--mersive-c-white-mute) 1px;
}
</style>
