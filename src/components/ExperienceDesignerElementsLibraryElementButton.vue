<script setup lang="ts">
import eventBus from '@/eventBus'
import { experienceDesignerElementsLibrarySearchQueryIK } from '@/injectionKeys'
import { computed, inject, ref } from 'vue'
import infoIcon from '@/assets/icons/info_filled_300_48.svg'

const props = defineProps({
    previewImageFilePath: {
        type: String,
        required: true,
    },
    elementName: {
        type: String,
        required: true,
    },
    modelFilePath: {
        type: String,
        required: true,
    },
    modelPageUrl: {
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

function handleElementButtonClick() {
    eventBus.emit('elementsLibraryElementButtonClicked', {
        elementName: props.elementName,
        elementPreviewImageFilePath: props.previewImageFilePath,
        element3DModelFilePath: props.modelFilePath,
    })
}

function handleInfoIconClick() {
    window.open(props.modelPageUrl, '_blank')
}
</script>

<template>
    <button
        v-show="showButton"
        class="elements-library__element-button"
        tabindex="-1"
        @click="handleElementButtonClick"
    >
        <img
            class="elements-library__element-button__info-icon"
            :src="infoIcon"
            alt=""
            title="Open credits page of this 3D model in another tab"
            @click.stop="handleInfoIconClick"
        />
        <img
            class="elements-library__element-button__preview-image"
            :src="previewImageFilePath"
            alt=""
        />
        <span class="elements-library__element-button__model-name">{{ props.elementName }}</span>
    </button>
</template>

<style scoped>
.elements-library__element-button {
    position: relative;

    width: 150px;

    display: flex;
    flex-direction: column;
    align-items: center;

    font-size: 0.8em;
    text-align: center;

    background-color: var(--mersive-c-grey-darker);
    color: var(--mersive-c-white);

    border-radius: 6px;

    cursor: pointer;
    transition: background-color 0.1s linear;
}

.elements-library__element-button:hover {
    background-color: var(--mersive-c-blue-dark);
}

.elements-library__element-button__info-icon {
    position: absolute;
    top: 4px;
    right: 4px;

    width: 24px;
    height: 24px;

    filter: drop-shadow(0px 2px 4px #00000090);
}

.elements-library__element-button__preview-image {
    width: 150px;
    height: 150px;
}

.elements-library__element-button__model-name {
    margin: 0.2em 0.4em;
}
</style>
