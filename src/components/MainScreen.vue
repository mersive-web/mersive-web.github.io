<script setup lang="ts">
import { fileOpen, type FileWithHandle } from 'browser-fs-access'
import { ref } from 'vue'
import { useExperienceDesignerStore } from '@/stores/experienceDesigner'

const experienceDesignerStore = useExperienceDesignerStore()

const emit = defineEmits<{
    createNewExperienceButtonClicked: []
    editExistingExperienceButtonClicked: [FileWithHandle]
    playExistingExperienceButtonClicked: [FileWithHandle]
}>()

function performMainScreenExitAnimation(onExitAnimationPerformed: () => void): void {
    isMainScreenWrapperExitAnimationApplied.value = true

    setTimeout(() => {
        onExitAnimationPerformed()
    }, mainScreenWrapperExitAnimationDurationSeconds * 1000)
}

function openExperienceFile(onFileOpenSuccess: (fileWithHandle: FileWithHandle) => void): void {
    fileOpen({
        description: 'Mersive Experience',
        extensions: ['.mersive'],
    })
        .then((fileWithHandle) => {
            onFileOpenSuccess(fileWithHandle)
        })
        .catch((reason) => {
            console.log(reason)
        })
}

function handleCreateNewExperienceButtonClick(): void {
    performMainScreenExitAnimation(() => {
        emit('createNewExperienceButtonClicked')
    })
}

function handleEditExistingExperienceButtonClick(): void {
    openExperienceFile((fileWithHandle) => {
        performMainScreenExitAnimation(() => {
            emit('editExistingExperienceButtonClicked', fileWithHandle)
        })
    })
}

function handlePlayExistingExperienceButtonClick(): void {
    openExperienceFile((fileWithHandle) => {
        performMainScreenExitAnimation(() => {
            emit('playExistingExperienceButtonClicked', fileWithHandle)
        })
    })
}

const isMainScreenWrapperExitAnimationApplied = ref(false)
const mainScreenWrapperExitAnimationDurationSeconds = 0.4
</script>

<template>
    <div class="mersive-main-screen">
        <div
            class="mersive-main-screen__wrapper"
            :class="{
                'mersive-main-screen__wrapper--exit-animation-applied':
                    isMainScreenWrapperExitAnimationApplied,
            }"
        >
            <img
                class="mersive-main-screen__wrapper__logo-image mersive-main-screen__wrapper__logo-image--color-scheme-light"
                src="/src/assets/images/mersive-logo.svg"
                alt="Mersive"
            />
            <img
                class="mersive-main-screen__wrapper__logo-image mersive-main-screen__wrapper__logo-image--color-scheme-dark"
                src="/src/assets/images/mersive-logo-white.svg"
                alt="Mersive"
            />
            <h1 class="mersive-main-screen__wrapper__headline">
                Create and play immersive 3D experiences in your Browser.
            </h1>
            <div
                class="mersive-main-screen__wrapper__buttons-wrapper mersive-main-screen__wrapper__buttons-wrapper--create-and-edit-experience-buttons"
            >
                <button
                    class="mersive-main-screen__wrapper__buttons-wrapper__button mersive-main-screen__wrapper__buttons-wrapper__button--create-new-experience-button"
                    tabindex="-1"
                    @click="handleCreateNewExperienceButtonClick"
                >
                    <svg
                        class="mersive-main-screen__wrapper__buttons-wrapper__button__icon"
                        xmlns="http://www.w3.org/2000/svg"
                        height="24px"
                        viewBox="0 -960 960 960"
                        width="24px"
                        fill="#fff"
                    >
                        <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" />
                    </svg>
                    <span class="mersive-main-screen__wrapper__buttons-wrapper__button__text"
                        >Create a new experience</span
                    >
                </button>
                <button
                    class="mersive-main-screen__wrapper__buttons-wrapper__button mersive-main-screen__wrapper__buttons-wrapper__button--edit-existing-experience-button"
                    tabindex="-1"
                    @click="handleEditExistingExperienceButtonClick"
                >
                    <svg
                        class="mersive-main-screen__wrapper__buttons-wrapper__button__icon"
                        xmlns="http://www.w3.org/2000/svg"
                        height="24px"
                        viewBox="0 -960 960 960"
                        width="24px"
                        fill="#fff"
                    >
                        <path
                            d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"
                        />
                    </svg>
                    <span class="mersive-main-screen__wrapper__buttons-wrapper__button__text"
                        >Edit an existing experience</span
                    >
                </button>
            </div>
            <div class="mersive-main-screen__wrapper__use-desktop-or-laptop-device-text">
                <p>Use a desktop or a laptop device to create and edit experiences.</p>
            </div>
            <div class="mersive-main-screen__wrapper__or-divider-wrapper">
                <hr class="mersive-main-screen__wrapper__or-divider-wrapper__divider-line" />
                <span class="mersive-main-screen__wrapper__or-divider-wrapper__divider-text"
                    >OR</span
                >
                <hr class="mersive-main-screen__wrapper__or-divider-wrapper__divider-line" />
            </div>
            <div class="mersive-main-screen__wrapper__buttons-wrapper">
                <button
                    class="mersive-main-screen__wrapper__buttons-wrapper__button mersive-main-screen__wrapper__buttons-wrapper__button--play-existing-experience-button"
                    tabindex="-1"
                    @click="handlePlayExistingExperienceButtonClick"
                >
                    <svg
                        class="mersive-main-screen__wrapper__buttons-wrapper__button__icon"
                        xmlns="http://www.w3.org/2000/svg"
                        height="24px"
                        viewBox="0 -960 960 960"
                        width="24px"
                        fill="#fff"
                    >
                        <path d="M320-200v-560l440 280-440 280Z" />
                    </svg>
                    <span class="mersive-main-screen__wrapper__buttons-wrapper__button__text"
                        >Play an existing experience</span
                    >
                </button>
            </div>
        </div>
        <span class="mersive-main-screen__version-label"
            >v. {{ experienceDesignerStore.mersiveVersion }}</span
        >
    </div>
</template>

<style scoped>
.mersive-main-screen {
    position: absolute;

    width: 100%;
    height: 100%;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    background-color: white;
}

.mersive-main-screen__wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    margin: 0 5em;

    font-size: clamp(0.6em, 1vw, 0.9em);
    line-height: 1.4;

    animation-name: entrance-animation;
    animation-duration: 0.4s;
    animation-delay: 0.5s;
    animation-timing-function: ease-in;
    animation-fill-mode: forwards;
    animation-play-state: running;

    filter: opacity(0);
    pointer-events: none;
}

.mersive-main-screen__wrapper--exit-animation-applied {
    pointer-events: none;

    animation-name: exit-animation;
    animation-duration: v-bind('`${mainScreenWrapperExitAnimationDurationSeconds}s`');
    animation-delay: 0s;
    animation-timing-function: ease-in;
    animation-fill-mode: forwards;
    animation-play-state: running;
}

@keyframes entrance-animation {
    0% {
        filter: opacity(0);
        pointer-events: none;
    }

    100% {
        filter: opacity(1);
        pointer-events: all;
    }
}

@keyframes exit-animation {
    0% {
        filter: opacity(1);
        transform: scale(1);
    }

    100% {
        transform: scale(1.3);
        filter: opacity(0);
    }
}

.mersive-main-screen__wrapper__logo-image {
    width: clamp(300px, 30vw, 477px);

    user-select: none;
}

.mersive-main-screen__wrapper__logo-image--color-scheme-light {
    display: block;
}

.mersive-main-screen__wrapper__logo-image--color-scheme-dark {
    display: none;
}

.mersive-main-screen__wrapper__headline {
    font-family: 'Quando', serif;
    font-size: 2em;
    text-align: center;
    color: black;

    margin: 1em 0;
}

.mersive-main-screen__wrapper__buttons-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0 2em;
}

.mersive-main-screen__wrapper__buttons-wrapper__button {
    display: flex;
    align-items: center;
    justify-content: center;

    border: 2px solid transparent;
    border-radius: 12px;
    outline: none;

    padding-top: calc(1em - 2px);
    padding-right: calc(1em - 2px + 8px);
    padding-bottom: calc(1em - 2px);
    padding-left: calc(1em - 2px);

    gap: 0 0.5em;

    cursor: pointer;

    transition-property: background-color, border-color;
    transition-duration: 0.1s;
    transition-timing-function: ease-in;
}

.mersive-main-screen__wrapper__buttons-wrapper__button__icon {
    width: 24px;
    height: 24px;

    transition: fill 0.1s ease-in;
}

.mersive-main-screen__wrapper__buttons-wrapper__button__text {
    font-weight: 500;
    font-size: 1.25em;

    transition: color 0.1s ease-in;
}

.mersive-main-screen__wrapper__buttons-wrapper__button--create-new-experience-button {
    background-color: var(--mersive-c-black);
}

.mersive-main-screen__wrapper__buttons-wrapper__button--create-new-experience-button
    .mersive-main-screen__wrapper__buttons-wrapper__button__icon {
    fill: white;
}

.mersive-main-screen__wrapper__buttons-wrapper__button--create-new-experience-button
    .mersive-main-screen__wrapper__buttons-wrapper__button__text {
    color: white;
}

.mersive-main-screen__wrapper__buttons-wrapper__button--create-new-experience-button:hover {
    background-color: black;
}

.mersive-main-screen__wrapper__buttons-wrapper__button--edit-existing-experience-button {
    background-color: transparent;
    border-color: var(--mersive-c-black);
}

.mersive-main-screen__wrapper__buttons-wrapper__button--edit-existing-experience-button
    .mersive-main-screen__wrapper__buttons-wrapper__button__icon {
    fill: var(--mersive-c-black);
}

.mersive-main-screen__wrapper__buttons-wrapper__button--edit-existing-experience-button
    .mersive-main-screen__wrapper__buttons-wrapper__button__text {
    color: var(--mersive-c-black);
}

.mersive-main-screen__wrapper__buttons-wrapper__button--edit-existing-experience-button:hover {
    background-color: black;
    border-color: black;
}

.mersive-main-screen__wrapper__buttons-wrapper__button--edit-existing-experience-button:hover
    .mersive-main-screen__wrapper__buttons-wrapper__button__icon {
    fill: white;
}

.mersive-main-screen__wrapper__buttons-wrapper__button--edit-existing-experience-button:hover
    .mersive-main-screen__wrapper__buttons-wrapper__button__text {
    color: white;
}

.mersive-main-screen__wrapper__buttons-wrapper__button--play-existing-experience-button {
    background-color: var(--mersive-c-blue);
}

.mersive-main-screen__wrapper__buttons-wrapper__button--play-existing-experience-button
    .mersive-main-screen__wrapper__buttons-wrapper__button__icon {
    fill: white;
}

.mersive-main-screen__wrapper__buttons-wrapper__button--play-existing-experience-button
    .mersive-main-screen__wrapper__buttons-wrapper__button__text {
    color: white;
}

.mersive-main-screen__wrapper__buttons-wrapper__button--play-existing-experience-button:hover {
    background-color: var(--mersive-c-blue-darker);
}

.mersive-main-screen__wrapper__or-divider-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;

    margin: 3em 0 1.5em 0;
}

.mersive-main-screen__wrapper__or-divider-wrapper__divider-line {
    width: clamp(100px, 20vw, 140px);

    border: 1px solid var(--mersive-c-black);
}

.mersive-main-screen__wrapper__or-divider-wrapper__divider-text {
    font-size: 1.5em;
    margin: 0 1em;

    color: var(--mersive-c-black);
}

.mersive-main-screen__wrapper__use-desktop-or-laptop-device-text {
    display: none;

    font-size: 1.5em;
    text-align: center;
    color: var(--mersive-c-black);
}

.mersive-main-screen__version-label {
    position: absolute;
    left: 1em;
    bottom: 1em;

    font-size: 0.8em;
    color: var(--mersive-c-black);
}

@media (prefers-color-scheme: dark) {
    .mersive-main-screen {
        background-color: black;
        background-image: linear-gradient(to bottom, #212121, #000000);
    }

    .mersive-main-screen__wrapper__logo-image--color-scheme-dark {
        display: block;
    }

    .mersive-main-screen__wrapper__logo-image--color-scheme-light {
        display: none;
    }

    .mersive-main-screen__wrapper__headline {
        color: white;
    }

    .mersive-main-screen__wrapper__buttons-wrapper__button--create-new-experience-button {
        background-color: white;
    }

    .mersive-main-screen__wrapper__buttons-wrapper__button--create-new-experience-button
        .mersive-main-screen__wrapper__buttons-wrapper__button__icon {
        fill: var(--mersive-c-black);
    }

    .mersive-main-screen__wrapper__buttons-wrapper__button--create-new-experience-button
        .mersive-main-screen__wrapper__buttons-wrapper__button__text {
        color: var(--mersive-c-black);
    }

    .mersive-main-screen__wrapper__buttons-wrapper__button--create-new-experience-button:hover {
        background-color: var(--mersive-c-white-softer);
    }

    .mersive-main-screen__wrapper__buttons-wrapper__button--edit-existing-experience-button {
        border-color: white;
    }

    .mersive-main-screen__wrapper__buttons-wrapper__button--edit-existing-experience-button
        .mersive-main-screen__wrapper__buttons-wrapper__button__icon {
        fill: white;
    }

    .mersive-main-screen__wrapper__buttons-wrapper__button--edit-existing-experience-button
        .mersive-main-screen__wrapper__buttons-wrapper__button__text {
        color: white;
    }

    .mersive-main-screen__wrapper__buttons-wrapper__button--edit-existing-experience-button:hover {
        background-color: var(--mersive-c-white-softer);
        border-color: var(--mersive-c-white-softer);
    }

    .mersive-main-screen__wrapper__buttons-wrapper__button--edit-existing-experience-button:hover
        .mersive-main-screen__wrapper__buttons-wrapper__button__icon {
        fill: var(--mersive-c-black);
    }

    .mersive-main-screen__wrapper__buttons-wrapper__button--edit-existing-experience-button:hover
        .mersive-main-screen__wrapper__buttons-wrapper__button__text {
        color: var(--mersive-c-black);
    }

    .mersive-main-screen__wrapper__or-divider-wrapper__divider-line {
        border-color: white;
    }

    .mersive-main-screen__wrapper__or-divider-wrapper__divider-text {
        color: white;
    }

    .mersive-main-screen__wrapper__use-desktop-or-laptop-device-text {
        color: var(--mersive-c-white-soft);
    }

    .mersive-main-screen__version-label {
        color: var(--mersive-c-white);
    }
}

@media screen and (max-width: 1200px) {
    .mersive-main-screen__wrapper__buttons-wrapper--create-and-edit-experience-buttons {
        display: none;
    }

    .mersive-main-screen__wrapper__use-desktop-or-laptop-device-text {
        display: block;
    }
}
</style>
