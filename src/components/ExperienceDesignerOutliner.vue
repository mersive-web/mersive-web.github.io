<script setup lang="ts">
import { ref } from 'vue'
import eventBus from '@/eventBus'

import MSearchBar from './MSearchBar.vue'
import ExperienceDesignerOutlinerNode from './ExperienceDesignerOutlinerNode.vue'
import type { SceneNodeData } from '@/types'

const sceneNodesData = ref<SceneNodeData[]>()
const outlinerSearchQuery = ref('')

function setOutlinerSearchQuery(searchQuery: string) {
    outlinerSearchQuery.value = searchQuery
}

eventBus.on('sceneNodesDataUpdated', (data) => {
    sceneNodesData.value = data.sceneNodesData

    sceneNodesData.value.sort((a, b) => {
        if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return -1
        } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return 1
        }

        return 0
    })
})
</script>

<template>
    <div class="outliner">
        <span class="outliner__heading">Outliner</span>
        <MSearchBar
            class="outliner__search-bar-wrapper"
            @search-bar-input="setOutlinerSearchQuery"
        />
        <ExperienceDesignerOutlinerNode
            id="scene"
            :index="0"
            type="scene"
            name="Scene"
            :is-visible="true"
            >Scene</ExperienceDesignerOutlinerNode
        >
        <div class="outliner__nodes-wrapper" tabindex="-1">
            <ExperienceDesignerOutlinerNode
                v-for="(node, index) in sceneNodesData"
                v-show="
                    node.name?.toLowerCase().includes(outlinerSearchQuery.toLowerCase().trim()) ||
                    outlinerSearchQuery.trim() === ''
                "
                :id="node.id"
                :key="node.id"
                :index="index + 1"
                :name="node.name"
                :type="node.type"
                :is-visible="node.isVisible"
            />
        </div>
    </div>
</template>

<style scoped>
.outliner {
    position: absolute;
    top: 60px;
    right: 24px;

    width: 300px;
    height: 291px;

    display: flex;
    flex-direction: column;
    align-items: flex-start;

    background-color: var(--mersive-c-black-op-80);
    color: var(--mersive-c-white);
    border-radius: 12px;

    padding: 24px 0;

    backdrop-filter: blur(4px);
    user-select: none;
}

.outliner__heading {
    font-size: 0.9em;
    font-weight: 700;

    margin: 0 0 1em 24px;
}

.outliner__search-bar-wrapper {
    margin: 0 0 1em 24px;
}

.outliner__nodes-wrapper {
    width: 100%;
    max-height: 196px;

    overflow-y: auto;

    display: flex;
    flex-direction: column;

    outline: none;
}

.outliner__nodes-wrapper::-webkit-scrollbar {
    width: 4px;
}

.outliner__nodes-wrapper::-webkit-scrollbar-track {
    background: var(--mersive-c-black);
    border-radius: 6px;
}

.outliner__nodes-wrapper::-webkit-scrollbar-thumb {
    background: white;
    border-radius: 6px;
}
</style>
