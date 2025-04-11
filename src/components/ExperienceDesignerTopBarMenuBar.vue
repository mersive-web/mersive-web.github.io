<script setup lang="ts">
import { useExperienceDesignerStore } from '@/stores/experienceDesigner'

import keyboardShortcuts from '@/keyboardShortcuts'
import ExperienceDesignerTopBarMenuBarMenu from './ExperienceDesignerTopBarMenuBarMenu.vue'
import ExperienceDesignerTopBarMenuBarMenuDivider from './ExperienceDesignerTopBarMenuBarMenuDivider.vue'
import ExperienceDesignerTopBarMenuBarMenuItem from './ExperienceDesignerTopBarMenuBarMenuItem.vue'

const experienceDesignerStore = useExperienceDesignerStore()

window.addEventListener('click', (event) => {
    if (
        experienceDesignerStore.topBarMenuBarData.showMenuItems &&
        !(event.target as Element).className.includes('menu__title')
    ) {
        experienceDesignerStore.topBarMenuBarData.showMenuItems = false
    }
})
</script>

<template>
    <div class="top-bar__menu-bar">
        <ExperienceDesignerTopBarMenuBarMenu name="file" display-text="File">
            <ExperienceDesignerTopBarMenuBarMenuItem
                :keyboard-shortcut="keyboardShortcuts.createNewExperience"
                action="createNewExperience"
                >New Experience</ExperienceDesignerTopBarMenuBarMenuItem
            >
            <ExperienceDesignerTopBarMenuBarMenuItem
                :keyboard-shortcut="keyboardShortcuts.openExperience"
                action="openExperience"
                >Open Experience...</ExperienceDesignerTopBarMenuBarMenuItem
            >
            <ExperienceDesignerTopBarMenuBarMenuDivider />
            <ExperienceDesignerTopBarMenuBarMenuItem
                :keyboard-shortcut="keyboardShortcuts.saveExperience"
                action="saveExperience"
                >Save Experience</ExperienceDesignerTopBarMenuBarMenuItem
            >
            <ExperienceDesignerTopBarMenuBarMenuItem
                :keyboard-shortcut="keyboardShortcuts.saveExperienceAs"
                action="saveExperienceAs"
                >Save Experience As...</ExperienceDesignerTopBarMenuBarMenuItem
            >
            <ExperienceDesignerTopBarMenuBarMenuDivider />
            <ExperienceDesignerTopBarMenuBarMenuItem
                :keyboard-shortcut="keyboardShortcuts.import3DModel"
                action="import3DModel"
                >Import 3D Model...</ExperienceDesignerTopBarMenuBarMenuItem
            >
        </ExperienceDesignerTopBarMenuBarMenu>
        <ExperienceDesignerTopBarMenuBarMenu name="edit" display-text="Edit">
            <ExperienceDesignerTopBarMenuBarMenuItem
                :keyboard-shortcut="keyboardShortcuts.duplicateActiveElement"
                action="duplicateActiveElement"
                :disabled="!experienceDesignerStore.duplicateEnabled"
                >Duplicate element</ExperienceDesignerTopBarMenuBarMenuItem
            >
            <ExperienceDesignerTopBarMenuBarMenuItem
                :keyboard-shortcut="keyboardShortcuts.copyActiveElement"
                action="copyActiveElement"
                :disabled="!experienceDesignerStore.copyEnabled"
                >Copy element</ExperienceDesignerTopBarMenuBarMenuItem
            >
            <ExperienceDesignerTopBarMenuBarMenuItem
                :keyboard-shortcut="keyboardShortcuts.pasteElement"
                action="pasteElement"
                :disabled="!experienceDesignerStore.isPasteEnabled"
                >Paste element</ExperienceDesignerTopBarMenuBarMenuItem
            >
        </ExperienceDesignerTopBarMenuBarMenu>
        <ExperienceDesignerTopBarMenuBarMenu name="view" display-text="View">
            <ExperienceDesignerTopBarMenuBarMenuItem
                :keyboard-shortcut="keyboardShortcuts.toggleToolsPanel"
                :checkbox-enabled="experienceDesignerStore.options.showToolsPanel"
                action="toggleToolsPanel"
                >Tools Panel</ExperienceDesignerTopBarMenuBarMenuItem
            >
            <ExperienceDesignerTopBarMenuBarMenuItem
                :keyboard-shortcut="keyboardShortcuts.toggleElementsLibrary"
                :checkbox-enabled="experienceDesignerStore.options.showElementsLibrary"
                action="toggleElementsLibrary"
                >Elements Library</ExperienceDesignerTopBarMenuBarMenuItem
            >
            <ExperienceDesignerTopBarMenuBarMenuItem
                :keyboard-shortcut="keyboardShortcuts.toggleOutliner"
                :checkbox-enabled="experienceDesignerStore.options.showOutliner"
                action="toggleOutliner"
                >Outliner</ExperienceDesignerTopBarMenuBarMenuItem
            >
            <ExperienceDesignerTopBarMenuBarMenuItem
                :keyboard-shortcut="keyboardShortcuts.toggleEditor"
                :checkbox-enabled="experienceDesignerStore.options.showEditor"
                action="toggleEditor"
                >Editor</ExperienceDesignerTopBarMenuBarMenuItem
            >
            <ExperienceDesignerTopBarMenuBarMenuItem
                :keyboard-shortcut="keyboardShortcuts.toggleBottomBar"
                :checkbox-enabled="experienceDesignerStore.options.showBottomBar"
                action="toggleBottomBar"
                >Bottom bar</ExperienceDesignerTopBarMenuBarMenuItem
            >
            <ExperienceDesignerTopBarMenuBarMenuDivider />
            <ExperienceDesignerTopBarMenuBarMenuItem
                :keyboard-shortcut="keyboardShortcuts.toggleGrid"
                action="toggleGrid"
                :checkbox-enabled="experienceDesignerStore.options.showGrid"
                >Grid</ExperienceDesignerTopBarMenuBarMenuItem
            >
        </ExperienceDesignerTopBarMenuBarMenu>
        <ExperienceDesignerTopBarMenuBarMenu name="help" display-text="Help">
            <ExperienceDesignerTopBarMenuBarMenuItem action="showAboutMersive"
                >About Mersive</ExperienceDesignerTopBarMenuBarMenuItem
            >
            <ExperienceDesignerTopBarMenuBarMenuItem action="showCredits"
                >Credits</ExperienceDesignerTopBarMenuBarMenuItem
            >
        </ExperienceDesignerTopBarMenuBarMenu>
    </div>
</template>

<style scoped>
.top-bar__menu-bar {
    display: flex;
    align-items: center;
    z-index: 1;
}
</style>
