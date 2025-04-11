<script setup lang="ts">
import eventBus from '@/eventBus'
import MSearchBar from './MSearchBar.vue'
import ExperienceDesignerElementsLibraryBreadcrumbs from './ExperienceDesignerElementsLibraryBreadcrumbs.vue'
import ExperienceDesignerElementsLibraryCategoryButton from './ExperienceDesignerElementsLibraryCategoryButton.vue'
import { provide, ref } from 'vue'
import ExperienceDesignerElementsLibraryBuiltInElementButton from './ExperienceDesignerElementsLibraryBuiltInElementButton.vue'

import boxIcon from '@/assets/icons/box_400.svg'
import lightIcon from '@/assets/icons/light_400.svg'
import { experienceDesignerElementsLibrarySearchQueryIK } from '@/injectionKeys'
import type { ElementsLibraryCategory } from '@/types'
import basicMeshesIcon from '@/assets/icons/box_400.svg'
import lightsIcon from '@/assets/icons/light_400.svg'
import architectureIcon from '@/assets/icons/architecture_400.svg'
import furnituresIcon from '@/assets/icons/furniture_400.svg'
import decorationsIcon from '@/assets/icons/star_400.svg'
import natureIcon from '@/assets/icons/tree_400.svg'

const activeCategoryName = ref<ElementsLibraryCategory>('All categories')
const categoriesBreadcrumbsLevels = ref([activeCategoryName.value])
const elementsLibrarySearchQuery = ref('')

function updateCategoriesBreadcrumbsLevel(level: ElementsLibraryCategory) {
    const levelIndex = categoriesBreadcrumbsLevels.value.indexOf(level)
    if (levelIndex === -1) {
        categoriesBreadcrumbsLevels.value.push(level)
    } else {
        categoriesBreadcrumbsLevels.value = categoriesBreadcrumbsLevels.value.slice(
            0,
            levelIndex + 1,
        )
    }
}

function setElementsLibrarySearchQuery(searchQuery: string) {
    elementsLibrarySearchQuery.value = searchQuery
}

eventBus.on('elementsLibraryCategoryChanged', (data) => {
    updateCategoriesBreadcrumbsLevel(data.newCategory)
    activeCategoryName.value = data.newCategory
})

provide(experienceDesignerElementsLibrarySearchQueryIK, elementsLibrarySearchQuery)
</script>

<template>
    <div class="elements-library">
        <span class="elements-library__heading">Elements Library</span>
        <MSearchBar
            class="elements-library__search-bar-wrapper"
            @search-bar-input="setElementsLibrarySearchQuery"
        />
        <ExperienceDesignerElementsLibraryBreadcrumbs :categories-breadcrumbs-levels />
        <div class="elements-library__body">
            <template
                v-if="activeCategoryName == 'All categories' && elementsLibrarySearchQuery == ''"
            >
                <ExperienceDesignerElementsLibraryCategoryButton
                    :category-icon-path="basicMeshesIcon"
                    category-name="Basic meshes"
                />
                <ExperienceDesignerElementsLibraryCategoryButton
                    :category-icon-path="lightsIcon"
                    category-name="Lights"
                />
                <ExperienceDesignerElementsLibraryCategoryButton
                    :category-icon-path="architectureIcon"
                    category-name="Architecture"
                />
                <ExperienceDesignerElementsLibraryCategoryButton
                    :category-icon-path="furnituresIcon"
                    category-name="Furnitures"
                />
                <ExperienceDesignerElementsLibraryCategoryButton
                    :category-icon-path="decorationsIcon"
                    category-name="Decorations"
                />
                <ExperienceDesignerElementsLibraryCategoryButton
                    :category-icon-path="natureIcon"
                    category-name="Nature"
                />
            </template>
            <template
                v-if="
                    activeCategoryName == 'Basic meshes' ||
                    (activeCategoryName == 'All categories' && elementsLibrarySearchQuery != '')
                "
            >
                <ExperienceDesignerElementsLibraryBuiltInElementButton
                    :icon-path="boxIcon"
                    element-name="Plane"
                    @click="
                        eventBus.emit('elementsLibraryBuiltInElementButtonClicked', {
                            elementType: 'plane',
                        })
                    "
                />
                <ExperienceDesignerElementsLibraryBuiltInElementButton
                    :icon-path="boxIcon"
                    element-name="Cube"
                    @click="
                        eventBus.emit('elementsLibraryBuiltInElementButtonClicked', {
                            elementType: 'cube',
                        })
                    "
                />
                <ExperienceDesignerElementsLibraryBuiltInElementButton
                    :icon-path="boxIcon"
                    element-name="Disc"
                    @click="
                        eventBus.emit('elementsLibraryBuiltInElementButtonClicked', {
                            elementType: 'disc',
                        })
                    "
                />
                <ExperienceDesignerElementsLibraryBuiltInElementButton
                    :icon-path="boxIcon"
                    element-name="Sphere"
                    @click="
                        eventBus.emit('elementsLibraryBuiltInElementButtonClicked', {
                            elementType: 'sphere',
                        })
                    "
                />
                <ExperienceDesignerElementsLibraryBuiltInElementButton
                    :icon-path="boxIcon"
                    element-name="Cylinder"
                    @click="
                        eventBus.emit('elementsLibraryBuiltInElementButtonClicked', {
                            elementType: 'cylinder',
                        })
                    "
                />
                <ExperienceDesignerElementsLibraryBuiltInElementButton
                    :icon-path="boxIcon"
                    element-name="Torus"
                    @click="
                        eventBus.emit('elementsLibraryBuiltInElementButtonClicked', {
                            elementType: 'torus',
                        })
                    "
                />
            </template>
            <template
                v-if="
                    activeCategoryName == 'Lights' ||
                    (activeCategoryName == 'All categories' && elementsLibrarySearchQuery != '')
                "
            >
                <ExperienceDesignerElementsLibraryBuiltInElementButton
                    :icon-path="lightIcon"
                    element-name="Point light"
                    @click="
                        eventBus.emit('elementsLibraryBuiltInElementButtonClicked', {
                            elementType: 'pointLight',
                        })
                    "
                />
                <ExperienceDesignerElementsLibraryBuiltInElementButton
                    :icon-path="lightIcon"
                    element-name="Directional light"
                    @click="
                        eventBus.emit('elementsLibraryBuiltInElementButtonClicked', {
                            elementType: 'directionalLight',
                        })
                    "
                />
                <ExperienceDesignerElementsLibraryBuiltInElementButton
                    :icon-path="lightIcon"
                    element-name="Spot light"
                    @click="
                        eventBus.emit('elementsLibraryBuiltInElementButtonClicked', {
                            elementType: 'spotLight',
                        })
                    "
                />
                <ExperienceDesignerElementsLibraryBuiltInElementButton
                    :icon-path="lightIcon"
                    element-name="Hemispheric light"
                    @click="
                        eventBus.emit('elementsLibraryBuiltInElementButtonClicked', {
                            elementType: 'hemisphericLight',
                        })
                    "
                />
            </template>
            <template v-if="activeCategoryName == 'Architecture'">
                <p style="font-size: 0.8em">Coming soon</p>
            </template>
            <template v-if="activeCategoryName == 'Furnitures'">
                <p style="font-size: 0.8em">Coming soon</p>
            </template>
            <template v-if="activeCategoryName == 'Decorations'">
                <p style="font-size: 0.8em">Coming soon</p>
            </template>
            <template v-if="activeCategoryName == 'Nature'">
                <p style="font-size: 0.8em">Coming soon</p>
            </template>
        </div>
    </div>
</template>

<style scoped>
.elements-library {
    position: absolute;
    top: 120px;
    left: 24px;

    min-width: 360px;
    min-height: 340px;

    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 24px;

    background-color: var(--mersive-c-black-op-80);
    color: var(--mersive-c-white);
    border-radius: 12px;

    backdrop-filter: blur(4px);
    user-select: none;
}

.elements-library__heading {
    font-size: 0.9em;
    font-weight: 700;
    margin: 0 0 1em 0;
}

.elements-library__search-bar-wrapper {
    margin: 0 0 1.5em 0;
}

.elements-library__body {
    max-height: 542px;
    overflow: auto;

    display: grid;
    grid-template-columns: auto auto;
    gap: 16px 8px;

    padding-right: 6px;
}

.elements-library__body::-webkit-scrollbar {
    width: 4px;
}

.elements-library__body::-webkit-scrollbar-track {
    background: var(--mersive-c-black);
    border-radius: 6px;
}

.elements-library__body::-webkit-scrollbar-thumb {
    background: white;
    border-radius: 6px;
}
</style>
