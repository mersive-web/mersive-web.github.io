<script setup lang="ts">
import {
    AppendSceneAsync,
    Engine,
    Matrix,
    Node,
    Scene,
    SceneSerializer,
    UniversalCamera,
} from '@babylonjs/core'
import MLoadingScreen from './MLoadingScreen.vue'
import MersiveSceneLoadingScreen from '@/babylonjs/mersiveSceneLoadingScreen'
import { inject, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import eventBus from '@/eventBus'
import MersiveExperiencePlayerCamera, {
    experiencePlayerCameraName,
} from '@/babylonjs/mersiveExperiencePlayerCamera'
import {
    experienceToEditOrPlayFileWithHandleIK,
    experienceToPlayStringifiedSceneIK,
} from '@/injectionKeys'
import type { FileWithHandle } from 'browser-fs-access'
import type { MeshMetadata } from '@/types'
import { useExperienceDesignerStore } from '@/stores/experienceDesigner'
import { useExperiencePlayerStore } from '@/stores/experiencePlayer'
import ExperiencePlayerExaminationScreen from './ExperiencePlayerExaminationScreen.vue'

const experienceDesignerStore = useExperienceDesignerStore()
const experiencePlayerStore = useExperiencePlayerStore()

let engine: Engine
let scene: Scene
let experiencePlayerCamera: MersiveExperiencePlayerCamera

const loadingScreenName = 'experiencePlayerLoadingScreen'
const canvas = useTemplateRef<HTMLCanvasElement>('__3d-viewport-canvas')

const doesTheDeviceHaveATouchScreen = ref(window.matchMedia('(pointer: coarse)').matches)

const interactionLabelPromptText = doesTheDeviceHaveATouchScreen.value
    ? 'Tap to examine'
    : 'Click to examine'
const isInteractionLabelOverlayShown = ref(false)
const elementUnderCursorName = ref('')

async function loadExperience(
    experienceSource: FileWithHandle | string,
    experienceSourceType: 'fileWithHandle' | 'stringifiedScene',
    onLoadSuccess?: () => void,
): Promise<void> {
    let stringifiedScene: string | undefined = undefined
    if (experienceSourceType == 'fileWithHandle') {
        const experienceFileWithHandle = experienceSource as FileWithHandle

        stringifiedScene = await experienceFileWithHandle.text()
    } else if (experienceSourceType == 'stringifiedScene') {
        stringifiedScene = experienceSource as string
    }

    AppendSceneAsync(`data:${stringifiedScene}`, scene)
        .then(() => {
            if (canvas.value === null) {
                throw new Error('Unable to find the canvas HTML element.')
            }

            const sourceExperiencePlayerCamera = scene.getCameraByName(
                experiencePlayerCameraName,
            ) as UniversalCamera | null

            if (sourceExperiencePlayerCamera === null) {
                throw new Error('Unable to find the experience player camera.')
            }

            experiencePlayerCamera = new MersiveExperiencePlayerCamera(
                sourceExperiencePlayerCamera,
                canvas.value,
                scene,
            )

            sourceExperiencePlayerCamera.dispose()
            scene.switchActiveCamera(experiencePlayerCamera)

            if (onLoadSuccess !== undefined) {
                onLoadSuccess()
            }
        })
        .catch((error) => {
            console.log(error)
        })
}

function onResize(): void {
    engine.resize()
}

function handleWindowResizeEvents(): void {
    // Resize the viewport if the browser window size changes
    window.addEventListener('resize', onResize)
}

function onClick(clickEvent: MouseEvent): void {
    if (experiencePlayerStore.isExperiencePlayerExaminationScreenShown) {
        return
    }

    if (
        window.matchMedia('(pointer: coarse)').matches === false &&
        document.pointerLockElement === null &&
        canvas.value?.requestPointerLock
    ) {
        canvas.value?.focus()
        experiencePlayerCamera.requestPointerLock()
        return
    }

    let pickingRayOriginX
    let pickingRayOriginY
    if (document.pointerLockElement === null) {
        pickingRayOriginX = clickEvent.clientX
        pickingRayOriginY = clickEvent.clientY
    } else {
        pickingRayOriginX = window.innerWidth / 2
        pickingRayOriginY = window.innerHeight / 2
    }

    const pickingRay = scene.createPickingRay(
        pickingRayOriginX,
        pickingRayOriginY,
        Matrix.Identity(),
        experiencePlayerCamera,
    )

    const pickingRayPickingInfo = scene.pickWithRay(pickingRay)

    if (pickingRayPickingInfo === null) {
        return
    }

    if (pickingRayPickingInfo.pickedMesh === null) {
        return
    }

    if (pickingRayPickingInfo.distance > 20) {
        return
    }

    let pickedMeshRootNode: Node | null = null
    if (pickingRayPickingInfo.pickedMesh.parent === null) {
        pickedMeshRootNode = pickingRayPickingInfo.pickedMesh
    } else {
        pickedMeshRootNode = pickingRayPickingInfo.pickedMesh.parent
        while (pickedMeshRootNode.parent !== null) {
            pickedMeshRootNode = pickedMeshRootNode.parent
        }
    }

    const pickedMeshRootNodeMetadata = pickedMeshRootNode.metadata as MeshMetadata
    if (pickedMeshRootNodeMetadata?.isExaminationScreenEnabled !== true) {
        return
    }

    if (document.exitPointerLock === null || document.exitPointerLock === undefined) {
        return
    }

    document.exitPointerLock()

    canvas.value!.blur()
    experiencePlayerStore.isExperiencePlayerExaminationScreenShown = true
    eventBus.emit(
        'experiencePlayerElementExaminationScreenOpened' as 'elementExaminationScreenOpened',
    )

    // SerializeMesh is a synchronous operation, so the examination screen fade/blur-in
    // animation won't show until it finishes. To fix this, add a small delay before
    // serializing the active node: in this way, the animation will play first.
    setTimeout(() => {
        SceneSerializer.ClearCache()
        const serializedMeshStringified = JSON.stringify(
            SceneSerializer.SerializeMesh(pickedMeshRootNode, false, true),
        )

        eventBus.emit(
            'experiencePlayerElementExaminationScreenSerializeMeshFinished' as 'elementExaminationScreenSerializeMeshFinished',
            {
                serializedMeshStringified: serializedMeshStringified,
            },
        )
    }, 100)
}

function handleWindowClickEvents(): void {
    // For touch devices, this only captures touches without a dragging movement (taps)
    // We must use this to interact with the scene, since the virtual joysticks canvas
    // disables interactions for it.
    window.addEventListener('click', onClick)
}

function handleRequestExitTheExperienceCommand() {
    const exitFromTheExperienceConfirmed = confirm('Do you want to exit the experience?')
    if (exitFromTheExperienceConfirmed === false) {
        return
    }

    if (experienceDesignerStore.isPlayExperienceModeEnabled) {
        experienceDesignerStore.isPlayExperienceModeEnabled = false
    } else {
        window.location.reload()
    }
}

function handleToggleFullscreenIconClick() {
    if (document.fullscreenElement === null) {
        document.body
            .requestFullscreen()
            .then(() => {
                canvas.value!.focus()
            })
            .catch((reason) => {
                console.log(reason)
            })
    } else {
        void document.exitFullscreen()
    }
}

function onKeyDown(keyboardEvent: KeyboardEvent) {
    if (experiencePlayerStore.isExperiencePlayerExaminationScreenShown) {
        return
    }

    if (keyboardEvent.key.toLowerCase() == 'escape') {
        handleRequestExitTheExperienceCommand()
    }
}

function handleKeyDownEvents(): void {
    window.addEventListener('keydown', onKeyDown)
}

function handleElementExaminationScreenClosedEvents(): void {
    eventBus.on(
        'experiencePlayerElementExaminationScreenClosed' as 'elementExaminationScreenClosed',
        () => {
            canvas.value?.focus()
            experiencePlayerCamera.requestPointerLock()
        },
    )
}

function setupEventHandlers(): void {
    handleWindowResizeEvents()
    handleWindowClickEvents()
    handleKeyDownEvents()
    handleElementExaminationScreenClosedEvents()
}

onMounted(() => {
    if (canvas.value) {
        /**
         * Enable antialiasing to fix some tearing issues
         *
         * Setting forceSRGBBufferSupportState to false seems to fix an issue which washes out
         * textures colors of meshes created using serialized versions of imported GLB 3D Models.
         *
         * @see https://forum.babylonjs.com/t/any-recent-changes-to-materials-and-gammaspace/55818/3
         */
        engine = new Engine(canvas.value, true, {
            forceSRGBBufferSupportState: false,
            adaptToDeviceRatio: true,
        })
        const mersiveSceneLoadingScreen = new MersiveSceneLoadingScreen(
            loadingScreenName,
            'Loading...',
            '#000000',
        )
        engine.loadingScreen = mersiveSceneLoadingScreen
        engine.displayLoadingUI()

        scene = new Scene(engine)

        eventBus.on((loadingScreenName + 'Hidden') as 'loadingScreenHidden', () => {
            if (canvas.value === null) {
                return
            }

            canvas.value.focus()
        })

        setupEventHandlers()

        setInterval(() => {
            const pickingRay = scene.createPickingRay(
                window.innerWidth / 2,
                window.innerHeight / 2,
                Matrix.Identity(),
                experiencePlayerCamera,
            )

            const pickingRayPickingInfo = scene.pickWithRay(pickingRay)

            if (pickingRayPickingInfo === null) {
                isInteractionLabelOverlayShown.value = false
                return
            }

            if (pickingRayPickingInfo.pickedMesh === null) {
                isInteractionLabelOverlayShown.value = false
                return
            }

            if (pickingRayPickingInfo.distance > 20) {
                isInteractionLabelOverlayShown.value = false
                return
            }

            let pickedMeshRootNode: Node | null = null
            if (pickingRayPickingInfo.pickedMesh.parent === null) {
                pickedMeshRootNode = pickingRayPickingInfo.pickedMesh
            } else {
                pickedMeshRootNode = pickingRayPickingInfo.pickedMesh.parent
                while (pickedMeshRootNode.parent !== null) {
                    pickedMeshRootNode = pickedMeshRootNode.parent
                }
            }

            const pickedMeshRootNodeMetadata = pickedMeshRootNode.metadata as MeshMetadata
            if (pickedMeshRootNodeMetadata?.isExaminationScreenEnabled !== true) {
                isInteractionLabelOverlayShown.value = false
                return
            }

            elementUnderCursorName.value = pickedMeshRootNode.name
            isInteractionLabelOverlayShown.value = true
        }, 100)

        const experienceToPlayFileWithHandle = inject(
            experienceToEditOrPlayFileWithHandleIK,
            undefined,
        )

        const experienceToPlayStringifiedScene = inject(
            experienceToPlayStringifiedSceneIK,
            undefined,
        )

        let experienceToPlaySource: FileWithHandle | string
        let experienceToPlaySourceType: 'fileWithHandle' | 'stringifiedScene'

        // Give precedence to the stringified scene source, otherwise the following
        // error will happen when playing the experience from the Experience Designer:
        // Uncaught (in promise) NotReadableError: The requested file could not be read,
        // typically due to permission problems that have occurred after a reference to a
        // file was acquired.
        if (experienceToPlayStringifiedScene?.value !== undefined) {
            experienceToPlaySource = experienceToPlayStringifiedScene.value
            experienceToPlaySourceType = 'stringifiedScene'
        } else if (experienceToPlayFileWithHandle?.value !== undefined) {
            experienceToPlaySource = experienceToPlayFileWithHandle.value
            experienceToPlaySourceType = 'fileWithHandle'
        } else {
            throw new Error('Unable to find experience file handle or the stringified scene.')
        }

        void loadExperience(experienceToPlaySource, experienceToPlaySourceType, () => {
            scene.gravity.set(0, -0.1, 0)

            engine.runRenderLoop(() => {
                if (isExperiencePlayerCameraDisposed === false) {
                    scene.render()
                }
            })
        })
    }
})

let isExperiencePlayerCameraDisposed = false
onUnmounted(() => {
    eventBus.off((loadingScreenName + 'Hidden') as 'loadingScreenHidden')
    eventBus.off(
        'experiencePlayerElementExaminationScreenClosed' as 'elementExaminationScreenClosed',
    )
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('click', onClick)

    /**
     *  Dispose the camera to dispose the canvas used by virtual joysticks.
     *
     * @see https://doc.babylonjs.com/features/featuresDeepDive/cameras/camera_introduction#virtual-joysticks-camera
     */
    experiencePlayerCamera.dispose()
    isExperiencePlayerCameraDisposed = true
})
</script>

<template>
    <div style="width: 100%; height: 100%">
        <canvas ref="__3d-viewport-canvas" class="__3d-viewport-canvas"></canvas>
        <ExperiencePlayerExaminationScreen />
        <MLoadingScreen :loading-screen-name />
    </div>
    <div class="__3d-viewport-overlay-container">
        <div class="__3d-viewport-overlay-container__cursor"></div>
        <div
            class="__3d-viewport-overlay-container__interaction-label-container"
            :class="{
                '__3d-viewport-overlay-container__interaction-label-container--shown':
                    isInteractionLabelOverlayShown,
            }"
        >
            <span
                class="__3d-viewport-overlay-container__interaction-label-container__interaction-label"
                >{{ interactionLabelPromptText }}
                <i
                    class="__3d-viewport-overlay-container__interaction-label-container__interaction-label__element-under-cursor-name"
                    >{{ elementUnderCursorName }}</i
                ></span
            >
        </div>
        <img
            class="__3d-viewport-overlay-container__exit-experience-icon"
            src="/src/assets/icons/exit_400.svg"
            alt="Exit the experience"
            @click.stop="handleRequestExitTheExperienceCommand"
        />
        <img
            v-if="doesTheDeviceHaveATouchScreen"
            class="__3d-viewport-overlay-container__toggle-fullscreen-icon"
            src="/src/assets/icons/fullscreen_400.svg"
            alt="Toggle fullscreen"
            @click.stop="handleToggleFullscreenIconClick"
        />
    </div>
</template>

<style scoped>
.__3d-viewport-canvas {
    width: 100%;
    height: 100%;

    position: relative;

    outline: none;
}

.__3d-viewport-overlay-container {
    width: 100%;
    height: 100%;

    position: absolute;
    top: 0px;
    left: 0px;

    background-color: transparent;

    outline: none;

    pointer-events: none;

    /*
        The canvas used by the virtual joysticks have a z-index of 5.
        So, the overlay must have a higher z-index.
    */
    z-index: 6;
}

.__3d-viewport-overlay-container__cursor {
    width: 6px;
    height: 6px;

    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);

    background-color: white;
    border: 1px solid var(--mersive-c-black);
    border-radius: 100%;
}

.__3d-viewport-overlay-container__interaction-label-container {
    position: absolute;
    bottom: 10%;
    left: 50%;
    transform: translate(-50%, 0px);

    background-color: var(--mersive-c-black-op-40);
    backdrop-filter: blur(3px);
    box-shadow: rgba(0, 0, 0, 0.4) 0px 14px 29px 0px;

    border-radius: 12px;
    padding: 1em 2em;

    text-align: center;

    opacity: 0;

    transition: opacity 0.1s linear;
}

.__3d-viewport-overlay-container__interaction-label-container--shown {
    opacity: 1;
}

.__3d-viewport-overlay-container__interaction-label-container__interaction-label {
    display: block;

    font-size: 1em;
    color: var(--mersive-c-white);
}

.__3d-viewport-overlay-container__interaction-label-container__interaction-label__element-under-cursor-name {
    font-style: normal;
    font-weight: 700;
}

.__3d-viewport-overlay-container__exit-experience-icon {
    width: 24px;
    height: 24px;

    position: absolute;
    top: 8px;
    left: 16px;

    cursor: pointer;
    pointer-events: all;
}

.__3d-viewport-overlay-container__toggle-fullscreen-icon {
    width: 24px;
    height: 24px;

    position: absolute;
    top: 8px;
    left: 48px;

    cursor: pointer;
    pointer-events: all;
}
</style>
