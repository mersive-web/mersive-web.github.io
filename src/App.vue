<script setup lang="ts">
import { onMounted, provide, ref } from 'vue'
import MainScreen from './components/MainScreen.vue'
import ExperienceDesigner from './components/ExperienceDesigner.vue'
import type { FileWithHandle } from 'browser-fs-access'
import { experienceToEditOrPlayFileWithHandleIK } from './injectionKeys'
import ExperiencePlayer from './components/ExperiencePlayer.vue'

function handleCreateNewExperienceButtonClickedEvents(): void {
    activeView.value = 'ExperienceDesigner'
}

function handleEditExistingExperienceButtonClickedEvents(fileWithHandle: FileWithHandle): void {
    experienceFileWithHandle.value = fileWithHandle
    activeView.value = 'ExperienceDesigner'
}

function handlePlayExistingExperienceButtonClickedEvents(fileWithHandle: FileWithHandle): void {
    experienceFileWithHandle.value = fileWithHandle
    activeView.value = 'ExperiencePlayer'
}

type viewsNames = 'MainScreen' | 'ExperienceDesigner' | 'ExperiencePlayer'
const activeView = ref<viewsNames>('MainScreen')

const experienceFileWithHandle = ref<FileWithHandle>()
provide(experienceToEditOrPlayFileWithHandleIK, experienceFileWithHandle)

// console.log('App.vue', Date.now())

onMounted(() => {
    // console.log('App.vue mounted', Date.now())
})
</script>

<template>
    <div style="width: 100%; height: 100%">
        <Transition mode="in-out">
            <MainScreen
                v-if="activeView == 'MainScreen'"
                @create-new-experience-button-clicked="handleCreateNewExperienceButtonClickedEvents"
                @edit-existing-experience-button-clicked="
                    handleEditExistingExperienceButtonClickedEvents
                "
                @play-existing-experience-button-clicked="
                    handlePlayExistingExperienceButtonClickedEvents
                "
            />
            <ExperienceDesigner v-else-if="activeView == 'ExperienceDesigner'" />
            <ExperiencePlayer v-else-if="activeView == 'ExperiencePlayer'" />
        </Transition>
    </div>
</template>

<style scoped>
.v-enter-active,
.v-leave-active {
    transition: opacity 0.2s ease-in;
}

.v-enter-from,
.v-leave-to {
    opacity: 0;
}
</style>
