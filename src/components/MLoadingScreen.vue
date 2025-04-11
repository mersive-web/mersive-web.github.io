<script setup lang="ts">
import eventBus from '@/eventBus'
import { onMounted, ref } from 'vue'

const props = defineProps({
    loadingScreenName: {
        type: String,
        required: true,
    },
})

const isLoadingScreenShown = ref(false)
const loadingBackgroundColor = ref('#000000')
const loadingText = ref('Loading...')

onMounted(() => {
    eventBus.on((props.loadingScreenName + 'Shown') as 'loadingScreenShown', (data) => {
        loadingBackgroundColor.value = data.loadingScreenData.loadingBackgroundColor
        loadingText.value = data.loadingScreenData.loadingText

        isLoadingScreenShown.value = true
    })

    eventBus.on((props.loadingScreenName + 'Hidden') as 'loadingScreenHidden', () => {
        isLoadingScreenShown.value = false
    })
})
</script>

<template>
    <Transition>
        <div
            v-show="isLoadingScreenShown"
            class="experience-scene-loading-screen"
            :style="{ backgroundColor: loadingBackgroundColor }"
        >
            <img
                class="experience-scene-loading-screen__logo-image"
                src="/src/assets/images/logo-m-only-white-squared.svg"
                alt=""
            />
            <!-- Thanks to https://www.babylonjs.com/ for the spinner tail -->
            <img
                class="experience-scene-loading-screen__loading-spinner"
                src="/src/assets/images/babylonjs_spinner_tail.svg"
                alt=""
            />
            <span class="experience-scene-loading-screen__loading-text">{{ loadingText }}</span>
        </div>
    </Transition>
</template>

<style scoped>
.experience-scene-loading-screen {
    position: absolute;
    top: 0px;
    left: 0px;

    width: 100%;
    height: 100%;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    /* background-color: set via inline style */

    opacity: 1;

    user-select: none;
    z-index: 9999;
    transition: opacity 0.4s ease-in;
}

.experience-scene-loading-screen.v-leave-to {
    opacity: 0;
}

.experience-scene-loading-screen__logo-image {
    width: 200px;
    height: 200px;
}

.experience-scene-loading-screen__loading-spinner {
    position: absolute;

    width: 300px;
    height: 300px;

    animation-name: spin-animation;
    animation-duration: 0.8s;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
    animation-play-state: running;
}

.experience-scene-loading-screen__loading-text {
    position: absolute;

    transform: translate(0px, 200px);

    color: var(--mersive-c-white);
    font-size: 1.5em;
}

@keyframes spin-animation {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

@media screen and (max-height: 750px) {
    .experience-scene-loading-screen__logo-image {
        width: 100px;
        height: 100px;
    }

    .experience-scene-loading-screen__loading-spinner {
        width: 200px;
        height: 200px;
    }

    .experience-scene-loading-screen__loading-text {
        transform: translate(0px, 150px);

        font-size: 1em;
    }
}

@media screen and (max-height: 450px) {
    .experience-scene-loading-screen__logo-image {
        width: 50px;
        height: 50px;
    }

    .experience-scene-loading-screen__loading-spinner {
        width: 100px;
        height: 100px;
    }

    .experience-scene-loading-screen__loading-text {
        transform: translate(0px, 100px);

        font-size: 0.8em;
    }
}
</style>
