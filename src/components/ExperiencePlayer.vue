<script setup lang="ts">
import ExperiencePlayer3DViewport from './ExperiencePlayer3DViewport.vue'
</script>

<template>
    <div class="experience-player">
        <ExperiencePlayer3DViewport />
        <div class="experience-player__orientation-portrait-overlay">
            <p class="experience-player__orientation-portrait-overlay__notice-text">
                Rotate your device horizontally to&nbsp;play&nbsp;the&nbsp;experience.<br /><br />Make
                sure the rotation lock is turned off.
            </p>
            <img
                class="experience-player__orientation-portrait-overlay__rotate-screen-image"
                src="/src/assets/icons/screen_rotation_400.svg"
                alt=""
            />
        </div>
    </div>
</template>

<style scoped>
.experience-player {
    width: 100%;
    height: 100%;
    overflow: hidden;
}

.experience-player__orientation-portrait-overlay {
    display: none;
}

.experience-player__orientation-portrait-overlay__notice-text {
    font-size: 1em;
    text-align: center;
    line-height: 1.4;

    color: var(--mersive-c-white);
}

.experience-player__orientation-portrait-overlay__rotate-screen-image {
    width: 36px;
    height: 36px;
}

@media (orientation: portrait) and (pointer: coarse) {
    .experience-player__orientation-portrait-overlay {
        position: absolute;
        top: 0px;
        left: 0px;

        width: 100%;
        height: 100%;

        background-color: black;

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1em;

        padding: 2em;

        z-index: 10;
    }
}
</style>
