<script setup lang="ts">
import { useExperienceDesignerStore } from '@/stores/experienceDesigner'
import eventBus from '@/eventBus'
import keyboardShortcuts from '@/keyboardShortcuts'

import ExperienceDesigner3DViewport from './ExperienceDesigner3DViewport.vue'
import ExperienceDesignerTopBar from './ExperienceDesignerTopBar.vue'
import ExperienceDesignerToolsPanel from './ExperienceDesignerToolsPanel.vue'
import ExperienceDesignerElementsLibrary from './ExperienceDesignerElementsLibrary.vue'
import ExperienceDesignerOutliner from './ExperienceDesignerOutliner.vue'
import ExperienceDesignerEditor from './ExperienceDesignerEditor.vue'
import ExperienceDesignerBottomBar from './ExperienceDesignerBottomBar.vue'
import { provide, ref } from 'vue'
import { experienceToPlayStringifiedSceneIK } from '@/injectionKeys'
import ExperiencePlayer from './ExperiencePlayer.vue'
import { useExperiencePlayerStore } from '@/stores/experiencePlayer'
import ExperienceDesignerAboutMersivePanel from './ExperienceDesignerAboutMersivePanel.vue'

const experienceDesignerStore = useExperienceDesignerStore()
const experiencePlayerStore = useExperiencePlayerStore()

const isAboutMersivePanelShown = ref(false)

function listenKeyboardShortcut(
    event: KeyboardEvent,
    shortcut: string,
    callback: (...args: unknown[]) => unknown,
) {
    if ((event.target as HTMLElement).tagName.toLowerCase() === 'input') {
        return
    }

    const shortcutKeys = shortcut.toLowerCase().split('+')

    const shortcutIncludesCtrl = shortcutKeys.includes('ctrl')
    const shortcutIncludesAlt = shortcutKeys.includes('alt')
    const shortcutIncludesShift = shortcutKeys.includes('shift')
    const shortcutLastKey = shortcutKeys[shortcutKeys.length - 1]

    if (
        event.ctrlKey == shortcutIncludesCtrl &&
        event.altKey == shortcutIncludesAlt &&
        event.shiftKey == shortcutIncludesShift &&
        event.key.toLowerCase() == shortcutLastKey
    ) {
        callback()
    }
}

function handlePlayExperienceSceneEvents(experienceToPlayStringifiedScene: string): void {
    experienceStringifiedScene.value = experienceToPlayStringifiedScene

    experienceDesignerStore.isPlayExperienceModeEnabled = true
}

window.addEventListener('keydown', (event) => {
    if (experienceDesignerStore.isExperienceDesignerExaminationScreenShown) {
        return
    }

    if (experiencePlayerStore.isExperiencePlayerExaminationScreenShown) {
        return
    }

    if (experienceDesignerStore.isPlayExperienceModeEnabled) {
        return
    }

    listenKeyboardShortcut(event, keyboardShortcuts.createNewExperience, () => {
        eventBus.emit('createNewExperienceCommandExecuted')
    })
    listenKeyboardShortcut(event, keyboardShortcuts.openExperience, () => {
        eventBus.emit('openExperienceCommandExecuted')
    })
    listenKeyboardShortcut(event, keyboardShortcuts.saveExperience, () => {
        eventBus.emit('saveExperienceCommandExecuted')
    })
    listenKeyboardShortcut(event, keyboardShortcuts.saveExperienceAs, () => {
        eventBus.emit('saveExperienceAsCommandExecuted')
    })
    listenKeyboardShortcut(event, keyboardShortcuts.import3DModel, () => {
        eventBus.emit('import3DModelCommandExecuted')
    })
    listenKeyboardShortcut(event, keyboardShortcuts.duplicateActiveElement, () => {
        eventBus.emit('duplicateActiveElementCommandExecuted')
    })
    listenKeyboardShortcut(event, keyboardShortcuts.copyActiveElement, () => {
        eventBus.emit('copyActiveElementCommandExecuted')
    })
    listenKeyboardShortcut(event, keyboardShortcuts.pasteElement, () => {
        eventBus.emit('pasteElementCommandExecuted')
    })
    listenKeyboardShortcut(event, keyboardShortcuts.toggleToolsPanel, () => {
        eventBus.emit('toggleToolsPanelCommandExecuted')
    })
    listenKeyboardShortcut(event, keyboardShortcuts.toggleElementsLibrary, () => {
        eventBus.emit('toggleElementsLibraryCommandExecuted')
    })
    listenKeyboardShortcut(event, keyboardShortcuts.toggleOutliner, () => {
        eventBus.emit('toggleOutlinerCommandExecuted')
    })
    listenKeyboardShortcut(event, keyboardShortcuts.toggleEditor, () => {
        eventBus.emit('toggleEditorCommandExecuted')
    })
    listenKeyboardShortcut(event, keyboardShortcuts.toggleBottomBar, () => {
        eventBus.emit('toggleBottomBarCommandExecuted')
    })
    listenKeyboardShortcut(event, keyboardShortcuts.toggleGrid, () => {
        eventBus.emit('toggleGridCommandExecuted')
    })
    listenKeyboardShortcut(event, keyboardShortcuts.select, () => {
        experienceDesignerStore.setActiveTool('select')
    })
    listenKeyboardShortcut(event, keyboardShortcuts.move, () => {
        experienceDesignerStore.setActiveTool('move')
    })
    listenKeyboardShortcut(event, keyboardShortcuts.rotate, () => {
        experienceDesignerStore.setActiveTool('rotate')
    })
    listenKeyboardShortcut(event, keyboardShortcuts.scale, () => {
        experienceDesignerStore.setActiveTool('scale')
    })
    listenKeyboardShortcut(event, keyboardShortcuts.playExperience, () => {
        eventBus.emit('playExperienceCommandExecuted')
    })
})

eventBus.on('toggleToolsPanelCommandExecuted', () => {
    experienceDesignerStore.toggleOption('showToolsPanel')
})
eventBus.on('toggleElementsLibraryCommandExecuted', () => {
    experienceDesignerStore.toggleOption('showElementsLibrary')
})
eventBus.on('toggleOutlinerCommandExecuted', () => {
    experienceDesignerStore.toggleOption('showOutliner')
})
eventBus.on('toggleEditorCommandExecuted', () => {
    experienceDesignerStore.toggleOption('showEditor')
})
eventBus.on('toggleBottomBarCommandExecuted', () => {
    experienceDesignerStore.toggleOption('showBottomBar')
})
eventBus.on('toggleGridCommandExecuted', () => {
    experienceDesignerStore.toggleOption('showGrid')
})
eventBus.on('showKeyboardShortcutsCommandExecuted', () => console.log('showKeyboardShortcuts'))
eventBus.on('showAboutMersiveCommandExecuted', () => {
    isAboutMersivePanelShown.value = true
})
eventBus.on('showCreditsCommandExecuted', () => {
    window.open('CREDITS.txt', '_blank')
})

const experienceStringifiedScene = ref('')
provide(experienceToPlayStringifiedSceneIK, experienceStringifiedScene)
</script>

<template>
    <div style="width: 100%; height: 100%">
        <div
            class="experience-designer"
            :class="{
                'experience-designer--hidden': experienceDesignerStore.isPlayExperienceModeEnabled,
            }"
        >
            <ExperienceDesigner3DViewport
                @play-experience-scene="handlePlayExperienceSceneEvents"
            />
            <ExperienceDesignerTopBar class="adapt-ui-to-height" />
            <ExperienceDesignerToolsPanel
                v-show="experienceDesignerStore.options.showToolsPanel"
                class="adapt-ui-to-height"
            />
            <ExperienceDesignerElementsLibrary
                v-show="experienceDesignerStore.options.showElementsLibrary"
                class="adapt-ui-to-height"
            />
            <ExperienceDesignerOutliner
                v-show="experienceDesignerStore.options.showOutliner"
                class="adapt-ui-to-height"
            />
            <ExperienceDesignerEditor
                v-show="experienceDesignerStore.options.showEditor"
                class="adapt-ui-to-height"
            />
            <ExperienceDesignerBottomBar
                v-show="experienceDesignerStore.options.showBottomBar"
                class="adapt-ui-to-height"
            />
        </div>
        <ExperiencePlayer v-if="experienceDesignerStore.isPlayExperienceModeEnabled === true" />
        <Transition>
            <ExperienceDesignerAboutMersivePanel
                v-if="isAboutMersivePanelShown"
                class="experience-designer-about-mersive-panel"
                @close-button-clicked="isAboutMersivePanelShown = false"
            />
        </Transition>
    </div>
</template>

<style scoped>
.experience-designer {
    width: 100%;
    height: 100%;
    overflow: hidden;

    opacity: 1;
    transition: opacity 0.2s ease-in;
}

.experience-designer--hidden {
    position: absolute;
    opacity: 0;
    pointer-events: none;
}

.experience-designer-about-mersive-panel.v-enter-active,
.experience-designer-about-mersive-panel.v-leave-active {
    transition: opacity 0.2s ease-in-out;
}

.experience-designer-about-mersive-panel.v-enter-from,
.experience-designer-about-mersive-panel.v-leave-to {
    opacity: 0;
}

@media screen and (max-height: 930px) {
    .adapt-ui-to-height {
        zoom: 90%;
    }
}

@media screen and (max-height: 830px) {
    .adapt-ui-to-height {
        zoom: 80%;
    }
}

@media screen and (max-height: 720px) {
    .adapt-ui-to-height {
        zoom: 70%;
    }
}

@media screen and (max-height: 640px) {
    .adapt-ui-to-height {
        zoom: 60%;
    }
}
</style>
