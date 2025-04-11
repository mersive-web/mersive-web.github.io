<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import eventBus from '@/eventBus'
import { useExperienceDesignerStore } from '@/stores/experienceDesigner'
import { isAMeshType, isALightType } from '@/functions'

const experienceDesignerStore = useExperienceDesignerStore()

const props = defineProps({
    index: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    id: {
        type: String,
        required: true,
    },
    isVisible: {
        type: Boolean,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    hierarchyLevel: {
        type: Number,
        required: false,
        default: 2,
    },
})

const isNodeVisible = computed(() => {
    return props.isVisible
})
const paddingLeft = props.hierarchyLevel * 1.5
const isIndexEven = computed(() => {
    return props.index % 2 == 0 ? true : false
})

const nodeName = ref(props.name)
watch(
    () => props.name,
    () => {
        nodeName.value = props.name
    },
)

const nodeNameBeforeRenaming = ref('')
const isNodeRenamingModeEnabled = ref(false)
const isNodeRenamingOperationCanceled = ref(false)

function toggleNodeVisibility() {
    eventBus.emit('nodeVisibilityChanged', {
        nodeVisibilityData: {
            id: props.id,
            isVisible: !isNodeVisible.value,
        },
    })
}

function handleNodeSelection() {
    eventBus.emit('outlinerNodeSelected', { selectedNodeId: props.id })
}

function enableNodeRenamingMode() {
    nodeNameBeforeRenaming.value = nodeName.value
    isNodeRenamingModeEnabled.value = true
}

function disableNodeRenamingMode() {
    // Reset isNodeRenamingOperationCanceled.
    // If we don't do so, when the user enables the node renaming mode for a node, then presses Esc,
    // then re-enables the node renaming mode for the same node and then presses Enter or clicks
    // away from the input (triggering the focusout event), isNodeRenamingOperationCanceled
    // would always be true and the node renaming operation would alway be canceled.
    isNodeRenamingOperationCanceled.value = false

    nodeNameBeforeRenaming.value = ''
    isNodeRenamingModeEnabled.value = false
}

function handleNodeNameInputEscape() {
    isNodeRenamingOperationCanceled.value = true
    outlinerNodeNameInput.value!.blur()
}

function handleNodeNameInputEnter() {
    outlinerNodeNameInput.value!.blur()
}

function confirmNodeRenamingOperation() {
    if (nodeName.value === '') {
        cancelNodeRenamingOperation()
        return
    }

    eventBus.emit('outlinerNodeRenamed', {
        renamedNodeData: {
            nodeToRenameId: props.id,
            newName: nodeName.value,
        },
    })
}

function cancelNodeRenamingOperation() {
    nodeName.value = nodeNameBeforeRenaming.value
}

function handleNodeNameInputFocusOut() {
    if (isNodeRenamingOperationCanceled.value) {
        cancelNodeRenamingOperation()
    } else {
        confirmNodeRenamingOperation()
    }

    disableNodeRenamingMode()
}

function onActiveNodeUpdated(data: { newActiveNodeId: string }) {
    if (outlinerNode.value) {
        if (data.newActiveNodeId === props.id) {
            outlinerNode.value.scrollIntoView({ block: 'nearest' })
        }
    }
}

function handleSceneSelection() {
    eventBus.emit('outlinerSceneSelected')
    experienceDesignerStore.isSceneSelected = true
}

const outlinerNode = useTemplateRef<HTMLElement>('outliner-node')
const outlinerNodeNameInput = useTemplateRef<HTMLInputElement>('outliner-node-name-input')

watch(outlinerNodeNameInput, () => {
    if (outlinerNodeNameInput.value) {
        outlinerNodeNameInput.value.focus()
    }
})

onMounted(() => {
    if (outlinerNode.value) {
        if (experienceDesignerStore.activeNodeId === props.id) {
            outlinerNode.value.scrollIntoView({ block: 'nearest' })
        }
    }

    eventBus.on('activeNodeUpdated', onActiveNodeUpdated)
})

onUnmounted(() => {
    eventBus.off('activeNodeUpdated', onActiveNodeUpdated)
})
</script>

<template>
    <template v-if="type === 'scene'">
        <div
            class="outliner__node outliner__node--type-scene"
            :class="{
                'outliner__node--active': experienceDesignerStore.isSceneSelected,
            }"
            @click="handleSceneSelection"
        >
            <img
                class="outliner__node__scene-icon"
                src="./../assets/icons/landscape_200.svg"
                alt=""
            />
            <span class="outliner__node__name outliner__node__name--type-scene"><slot></slot></span>
        </div>
    </template>
    <template v-else>
        <div
            ref="outliner-node"
            class="outliner__node"
            :style="`padding-left: ${paddingLeft}em`"
            :class="{
                'outliner__node--alt-background': isIndexEven,
                'outliner__node--active': props.id === experienceDesignerStore.activeNodeId,
            }"
            @click="handleNodeSelection"
        >
            <button
                class="outliner__node__toggle-visibility-button"
                tabindex="-1"
                @click.stop="toggleNodeVisibility"
            >
                <img
                    v-if="isNodeVisible"
                    class="outliner__node__toggle-visibility-button__icon"
                    src="./../assets/icons/visibility_200.svg"
                    alt=""
                />
                <img
                    v-else
                    class="outliner__node__toggle-visibility-button__icon"
                    src="./../assets/icons/visibility_off_200.svg"
                    alt=""
                />
            </button>
            <img
                v-if="isAMeshType(type)"
                class="outliner__node__node-type-icon"
                src="./../assets/icons/box_filled_200.svg"
                alt=""
            />
            <img
                v-if="isALightType(type)"
                class="outliner__node__node-type-icon"
                src="./../assets/icons/light_filled_200.svg"
                alt=""
            />
            <template v-if="isNodeRenamingModeEnabled">
                <input
                    ref="outliner-node-name-input"
                    v-model.trim="nodeName"
                    class="outliner__node__name outliner__node__name--input"
                    type="text"
                    placeholder="Type a name"
                    tabindex="-1"
                    @keydown.esc="handleNodeNameInputEscape"
                    @focusout="handleNodeNameInputFocusOut"
                    @keydown.enter="handleNodeNameInputEnter"
                />
            </template>
            <template v-else>
                <span
                    class="outliner__node__name outliner__node__name--text"
                    @dblclick="enableNodeRenamingMode"
                    >{{ nodeName }}</span
                >
            </template>
        </div>
    </template>
</template>

<style scoped>
.outliner__node {
    width: 100%;
    min-height: 28px;

    display: flex;
    align-items: center;
    gap: 0 0.3em;

    background-color: transparent;

    cursor: pointer;
}

.outliner__node:hover {
    background-color: var(--mersive-c-grey-dark);
}

.outliner__node--alt-background {
    background-color: var(--mersive-c-grey);
}

.outliner__node--type-scene {
    background-color: var(--mersive-c-grey);

    padding-left: 1.5em;
}

.outliner__node--active,
.outliner__node--active:hover {
    background-color: var(--mersive-c-blue-dark);
}

.outliner__node__scene-icon {
    width: 24px;
    height: 24px;
}

.outliner__node__toggle-visibility-button {
    display: flex;
    align-items: center;

    background-color: transparent;

    cursor: pointer;
}

.outliner__node__toggle-visibility-button__icon,
.outliner__node__node-type-icon {
    width: 24px;
    height: 24px;
}

.outliner__node__name {
    width: 170px;

    font-size: 0.8em;
    color: var(--mersive-c-white);
}

.outliner__node__name--input {
    background-color: transparent;
    border: none;
    cursor: text;
}

.outliner__node__name--input::selection {
    background-color: var(--mersive-c-black);
    color: var(--mersive-c-white);
}

.outliner__node__name--input::placeholder {
    color: var(--mersive-c-white-soft);
}

.outliner__node__name--text {
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    cursor: pointer;
}

.outliner__node__name--type-scene {
    font-weight: 500;
}
</style>
