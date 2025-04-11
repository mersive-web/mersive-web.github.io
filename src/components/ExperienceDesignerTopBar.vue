<script setup lang="ts">
import { useExperienceDesignerStore } from '@/stores/experienceDesigner'
import ExperienceDesignerTopBarMenuBar from './ExperienceDesignerTopBarMenuBar.vue'
import eventBus from '@/eventBus'
import keyboardShortcuts from '@/keyboardShortcuts'
import { computed } from 'vue'

const experienceDesignerStore = useExperienceDesignerStore()
const experienceNameWithAsteriskSuffixIfNeeded = computed(() => {
    if (
        experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave ||
        experienceDesignerStore.wasTheExperienceFileSavedAtLeastOnce === false
    ) {
        return `${experienceDesignerStore.experienceName}*`
    } else {
        return experienceDesignerStore.experienceName
    }
})
</script>

<template>
    <div class="top-bar">
        <img
            class="top-bar__logo-image"
            src="/src/assets/images/mersive-logo-m-only-white.svg"
            alt="Mersive"
        />
        <ExperienceDesignerTopBarMenuBar />
        <button
            class="top-bar__play-experience-button"
            @click="eventBus.emit('playExperienceCommandExecuted')"
        >
            <img src="./../assets/icons/play_400.svg" alt="" />
            Play Experience ({{ keyboardShortcuts.playExperience }})
        </button>
        <span class="top-bar__experience-name-and-app-version"
            >{{ experienceNameWithAsteriskSuffixIfNeeded }} - Mersive
            {{ experienceDesignerStore.mersiveVersion }}</span
        >
    </div>
</template>

<style scoped>
.top-bar {
    width: 100%;
    height: 40px;

    position: absolute;
    top: 0px;

    display: flex;
    align-items: center;

    padding: 0 24px;

    background-color: var(--color-background);
    color: var(--mersive-c-white-soft);

    font-size: 0.9em;

    user-select: none;
}

.top-bar__logo-image {
    height: 18px;

    margin: 0 24px 0 0;
}

.top-bar__play-experience-button {
    display: flex;
    align-items: center;

    margin: 0 2em 0 auto;
    font-size: 0.9em;

    color: var(--mersive-c-white);
    background-color: var(--mersive-c-grey);

    border-radius: 6px;
    padding: 0.3em 0.6em;

    cursor: pointer;
    transition: background-color 0.1s linear;
}

.top-bar__play-experience-button:hover {
    background-color: var(--mersive-c-blue);
}

.top-bar__play-experience-button img {
    width: 20px;
    height: 20px;

    margin-right: 0.5em;
}
</style>
