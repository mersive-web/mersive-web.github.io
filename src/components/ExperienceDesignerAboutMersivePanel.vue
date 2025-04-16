<script setup lang="ts">
import { useExperienceDesignerStore } from '@/stores/experienceDesigner'

const experienceDesignerStore = useExperienceDesignerStore()

function handleSeeAllCreditsButtonClick() {
    window.open('CREDITS.txt', '_blank')
}

function handleSeeGitHubRepoButtonClick() {
    window.open('https://github.com/mersive-web/mersive-web.github.io', '_blank')
}

const emit = defineEmits(['closeButtonClicked'])
</script>

<template>
    <div class="about-mersive-panel-container">
        <div class="about-mersive-panel-container__panel">
            <img
                class="about-mersive-panel-container__panel__logo"
                src="/src/assets/images/mersive-logo-white.svg"
                alt="Mersive"
            />
            <p class="about-mersive-panel-container__panel__author">
                Developed by Francesco Sardaro
            </p>
            <p class="about-mersive-panel-container__panel__version">
                v. {{ experienceDesignerStore.mersiveVersion }}
            </p>
            <button
                class="about-mersive-panel-container__panel__button"
                tabindex="-1"
                @click="emit('closeButtonClicked')"
            >
                Close this panel
            </button>
            <button
                class="about-mersive-panel-container__panel__button"
                tabindex="-1"
                @click="handleSeeAllCreditsButtonClick"
            >
                See all credits
            </button>
            <button
                class="about-mersive-panel-container__panel__button"
                tabindex="-1"
                @click="handleSeeGitHubRepoButtonClick"
            >
                See GitHub repo
            </button>
        </div>
    </div>
</template>

<style scoped>
.about-mersive-panel-container {
    position: absolute;
    top: 0px;
    left: 0px;

    width: 100%;
    height: 100%;

    display: flex;
    align-items: center;
    justify-content: center;

    backdrop-filter: blur(4px) brightness(0.4);

    z-index: 2;
}

.about-mersive-panel-container__panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    border-radius: 12px;
    padding: 2em 4em;
    box-shadow: rgba(0, 0, 0, 0.8) 0px 14px 29px 0px;

    color: var(--mersive-c-white);
    background-color: var(--mersive-c-black);

    user-select: none;
}

.about-mersive-panel-container__panel__logo {
    width: 300px;
}

.about-mersive-panel-container__panel__author {
    margin: 1em 0;

    font-size: 0.8em;
}

.about-mersive-panel-container__panel__version {
    margin: 0 0 1em 0;

    font-weight: 700;
}

.about-mersive-panel-container__panel__button {
    min-width: 180px;

    margin: 0.3em 0;
    padding: 0.5em 1em;

    font-size: 0.9em;

    color: var(--mersive-c-white);

    background-color: var(--mersive-c-grey);
    border: none;
    border-radius: 6px;

    cursor: pointer;

    transition: background-color 0.1s ease-in;
}

.about-mersive-panel-container__panel__button:hover {
    background-color: var(--mersive-c-blue);
}
</style>
