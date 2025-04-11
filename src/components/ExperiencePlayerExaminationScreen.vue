<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue'

import {
    AbstractMesh,
    AppendSceneAsync,
    ArcRotateCamera,
    Engine,
    GPUPicker,
    HemisphericLight,
    Mesh,
    PointerEventTypes,
    Scene,
    StandardMaterial,
    Vector3,
} from '@babylonjs/core'

import type { MeshMetadata, POIMetadata } from '@/types'
import {
    buildMeshHierarchyBoundingInfo,
    createMeshMetadataWithNoTransformations,
    degreesToRadians,
    getMeshMaxDimension,
    isNodeAPointOfInterest,
} from '@/functions'
import eventBus from '@/eventBus'
import { useExperiencePlayerStore } from '@/stores/experiencePlayer'
import MLoadingScreen from './MLoadingScreen.vue'
import MersiveSceneLoadingScreen from '@/babylonjs/mersiveSceneLoadingScreen'

const experiencePlayerStore = useExperiencePlayerStore()
const canvas = useTemplateRef<HTMLCanvasElement>(
    'examination-screen__panel__content__3d-viewport-canvas-container__3d-canvas',
)
let engine: Engine
let scene: Scene
let camera: ArcRotateCamera
let currentElement: AbstractMesh | null = null
let activePOI: Mesh | null = null
let hemisphericLight: HemisphericLight
const gpuPicker = new GPUPicker()
const GPUPickerPickingList: AbstractMesh[] = []

let cameraInitialAlpha: number
let cameraInitialBeta: number
let cameraInitialRadius: number

const isAPOIActive = ref(false)

const defaultSceneClearColorHEXInputValue = '#000000'
const defaultHemisphericLightIntensityInputValue = 1
const defaultHemisphericLightDiffuseColorHEXInputValue = '#ffffff'
const defaultHemisphericLightGroundColorHEXInputValue = '#4d4d4d'
const defaultCameraFOVDegreesInputValue = 46

const examinationScreenDetailScreenTitle = ref('')
const examinationScreenOverviewTitle = ref('')
const examinationScreenOverviewDescription = ref('')
const examinationScreenDetailName = ref('')
const examinationScreenDetailDescription = ref('')

const loadingScreenName = 'experiencePlayerExaminationScreenLoadingScreen'

function setupScene(): void {
    scene = new Scene(engine)

    hemisphericLight = new HemisphericLight('HemiLight', new Vector3(0, 1, 0), scene)
}

function setupCamera(): void {
    camera = new ArcRotateCamera(
        'EXPERIENCE_DESIGNER_EXAMINATION_SCREEN_CAMERA',
        0,
        0,
        0,
        new Vector3(0, 0, 0),
        scene,
    )

    camera.attachControl(canvas.value, true)

    // Disable panning
    camera.panningSensibility = 0

    // Allow infinite longitudinal (horizontal) rotation
    camera.lowerAlphaLimit = -Infinity
    camera.upperAlphaLimit = Infinity

    // Limit the latitudinal (vertical) rotation to prevent placing the camera upside down
    camera.lowerBetaLimit = -Math.PI
    camera.upperBetaLimit = Math.PI

    // Adjust zoom-in and zoom-out speed
    camera.wheelPrecision = 30
}

function setupEventHandlers(): void {
    handleWindowResizeEvents()
    handleElementExaminationScreenOpenedEvents()
    handleElementExaminationScreenSerializeMeshFinishedEvents()
    handleNewMeshAddedToSceneEvents()
    handlePointerEvents()
}

function onResize(): void {
    engine.resize()
}

function handleWindowResizeEvents(): void {
    // Resize the viewport if the browser window size changes
    window.addEventListener('resize', onResize)
}

function handleElementExaminationScreenOpenedEvents(): void {
    eventBus.on(
        'experiencePlayerElementExaminationScreenOpened' as 'elementExaminationScreenOpened',
        () => {
            engine.displayLoadingUI()
        },
    )
}

function handleElementExaminationScreenSerializeMeshFinishedEvents(): void {
    eventBus.on(
        'experiencePlayerElementExaminationScreenSerializeMeshFinished' as 'elementExaminationScreenSerializeMeshFinished',
        (data) => {
            AppendSceneAsync(`data:${data.serializedMeshStringified}`, scene)
                .then(() => {
                    // Resize the engine after the mesh has been loaded.
                    // Without this, the scene would be blurry and out of scale.
                    // This is due to the fact that canvas of this component is initially hidden.
                    engine.resize()
                })
                .catch((reason) => {
                    console.log(reason)
                })
        },
    )
}

function handleNewMeshAddedToSceneEvents(): void {
    scene.onNewMeshAddedObservable.add((newMesh) => {
        if (newMesh.parent !== null) {
            return
        }

        if (isNodeAPointOfInterest(newMesh)) {
            return
        }

        currentElement = newMesh

        createMeshMetadataWithNoTransformations(currentElement)
        buildMeshHierarchyBoundingInfo(currentElement)
        const meshMaxDimension = getMeshMaxDimension(currentElement as Mesh)

        currentElement.position = Vector3.Zero()

        currentElement.rotationQuaternion = null
        currentElement.rotation = Vector3.Zero()

        currentElement.computeWorldMatrix(true)

        // We can set the target to the origin, since the mesh pivot coincides with
        // the mesh center, and the mesh is placed in the origin.
        camera.setTarget(Vector3.Zero())

        const currentElementMetadata = currentElement.metadata as MeshMetadata

        if (currentElementMetadata?.examinationScreenData) {
            scene.clearColor.fromHexString(
                currentElementMetadata.examinationScreenData.sceneClearColorHEX,
            )

            camera.fov = currentElementMetadata.examinationScreenData.cameraFOVRadians

            hemisphericLight.intensity = currentElementMetadata.examinationScreenData.lightIntensity

            hemisphericLight.diffuse.fromHexString(
                currentElementMetadata.examinationScreenData.topLightColorHEX,
            )

            hemisphericLight.groundColor.fromHexString(
                currentElementMetadata.examinationScreenData.bottomLightColorHEX,
            )

            examinationScreenDetailScreenTitle.value =
                currentElementMetadata.examinationScreenData.screenTitle

            examinationScreenOverviewTitle.value =
                currentElementMetadata.examinationScreenData.overviewTitle

            examinationScreenOverviewDescription.value =
                currentElementMetadata.examinationScreenData.overviewDescription
        } else {
            scene.clearColor.fromHexString(defaultSceneClearColorHEXInputValue)

            camera.fov = degreesToRadians(defaultCameraFOVDegreesInputValue)

            hemisphericLight.intensity = defaultHemisphericLightIntensityInputValue

            hemisphericLight.diffuse.fromHexString(defaultHemisphericLightDiffuseColorHEXInputValue)

            hemisphericLight.groundColor.fromHexString(
                defaultHemisphericLightGroundColorHEXInputValue,
            )

            examinationScreenDetailScreenTitle.value = 'No title provided'
            examinationScreenOverviewTitle.value = 'No overview title provided'
            examinationScreenOverviewDescription.value = 'No overview description provided'
        }

        if (currentElementMetadata?.examinationScreenData?.cameraInitialPosition) {
            cameraInitialAlpha =
                currentElementMetadata.examinationScreenData.cameraInitialPosition.alpha
            cameraInitialBeta =
                currentElementMetadata.examinationScreenData.cameraInitialPosition.beta
            cameraInitialRadius =
                currentElementMetadata.examinationScreenData.cameraInitialPosition.radius
        } else {
            // Initial alpha and beta to place the camera in front of the element
            cameraInitialAlpha = -Math.PI / 2
            cameraInitialBeta = Math.PI / 2
            cameraInitialRadius = meshMaxDimension * 2
        }

        camera.alpha = cameraInitialAlpha
        camera.beta = cameraInitialBeta
        camera.radius = cameraInitialRadius

        camera.lowerRadiusLimit = meshMaxDimension * 1
        camera.upperRadiusLimit = meshMaxDimension * 6

        GPUPickerPickingList.push(currentElement)
        for (const mesh of currentElement.getChildMeshes()) {
            GPUPickerPickingList.push(mesh)
        }

        const currentElementPOIs = currentElement.getChildMeshes(true, (mesh) => {
            return isNodeAPointOfInterest(mesh)
        })
        for (const POI of currentElementPOIs) {
            POI.setEnabled(true)
            GPUPickerPickingList.push(POI)
        }

        gpuPicker.setPickingList([...GPUPickerPickingList])
    })
}

function handlePointerEvents(): void {
    scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type === PointerEventTypes.POINTERTAP) {
            // Only consider left clicks
            if (pointerInfo.event.button !== 0) {
                return
            }

            // If no mesh is picked or if a mesh that is not a POI is picked
            if (
                pointerInfo.pickInfo?.pickedMesh === null ||
                (pointerInfo.pickInfo?.pickedMesh &&
                    isNodeAPointOfInterest(pointerInfo.pickInfo.pickedMesh) === false)
            ) {
                if (activePOI !== null) {
                    resetActivePointOfInterest()

                    return
                }
            }

            // If a POI is picked
            if (
                pointerInfo.pickInfo?.pickedMesh &&
                isNodeAPointOfInterest(pointerInfo.pickInfo.pickedMesh)
            ) {
                const pickedPOI = scene.getMeshById(pointerInfo.pickInfo.pickedMesh.id) as Mesh
                setPointOfInterestAsActive(pickedPOI)

                return
            }
        } else if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
            if (gpuPicker.pickingInProgress) {
                return
            }
            gpuPicker
                .pickAsync(scene.pointerX, scene.pointerY, false)
                .then((pickingInfo) => {
                    if (pickingInfo) {
                        if (isNodeAPointOfInterest(pickingInfo.mesh)) {
                            scene.defaultCursor = 'pointer'
                        } else {
                            scene.defaultCursor = ''
                        }
                    }
                })
                .catch((reason) => {
                    console.log(reason)
                })
        }
    })
}

function handleExaminationScreenCloseButtonClickEvents(): void {
    if (activePOI !== null) {
        resetActivePointOfInterest()
    }

    currentElement?.dispose(false, true)
    currentElement = null
    gpuPicker.setPickingList(null)

    isAPOIActive.value = false

    experiencePlayerStore.isExperiencePlayerExaminationScreenShown = false

    eventBus.emit(
        'experiencePlayerElementExaminationScreenClosed' as 'elementExaminationScreenClosed',
        {},
    )
}

function resetActivePointOfInterest(): void {
    if (activePOI!.isDisposed() === false) {
        const activePOIMaterial = activePOI!.material as StandardMaterial
        const activePOIMetadata = activePOI!.metadata as POIMetadata

        activePOIMaterial.emissiveColor.fromHexString(
            activePOIMetadata.settings.colorHEXWhenNotActive,
        )
        activePOIMaterial.diffuseColor.fromHexString(
            activePOIMetadata.settings.colorHEXWhenNotActive,
        )
        activePOIMaterial.alpha = activePOIMetadata.settings.opacityPercentageWhenNotActive / 100
    }

    activePOI = null
    isAPOIActive.value = false
}

function setPointOfInterestAsActive(pointOfInterest: Mesh): void {
    if (activePOI !== null) {
        resetActivePointOfInterest()
    }

    activePOI = pointOfInterest
    isAPOIActive.value = true

    const activePOIMetadata = activePOI.metadata as POIMetadata

    examinationScreenDetailName.value = activePOIMetadata.detailName
    examinationScreenDetailDescription.value = activePOIMetadata.detailDescription

    const activePOIMaterial = activePOI.material as StandardMaterial
    activePOIMaterial.emissiveColor.fromHexString(activePOIMetadata.settings.colorHEXWhenActive)
    activePOIMaterial.diffuseColor.fromHexString(activePOIMetadata.settings.colorHEXWhenActive)
    activePOIMaterial.alpha = activePOIMetadata.settings.opacityPercentageWhenActive / 100
}

onMounted(() => {
    if (canvas.value) {
        /**
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

        setupScene()
        setupCamera()
        setupEventHandlers()

        engine.runRenderLoop(() => {
            scene.render()
        })
    }
})

onUnmounted(() => {
    eventBus.off(
        'experiencePlayerElementExaminationScreenOpened' as 'elementExaminationScreenOpened',
    )
    eventBus.off(
        'experiencePlayerElementExaminationScreenSerializeMeshFinished' as 'elementExaminationScreenSerializeMeshFinished',
    )
    window.removeEventListener('resize', onResize)
})
</script>

<template>
    <Transition>
        <div
            v-show="experiencePlayerStore.isExperiencePlayerExaminationScreenShown"
            class="examination-screen"
        >
            <div class="examination-screen__panel">
                <button
                    class="examination-screen__panel__close-button"
                    tabindex="-1"
                    @click.stop="handleExaminationScreenCloseButtonClickEvents"
                >
                    <img src="/src/assets/icons/close_400.svg" alt="" />
                </button>
                <div class="examination-screen__panel__content">
                    <MLoadingScreen :loading-screen-name="loadingScreenName" />
                    <div class="examination-screen__panel__content__3d-viewport-canvas-container">
                        <canvas
                            ref="examination-screen__panel__content__3d-viewport-canvas-container__3d-canvas"
                            class="examination-screen__panel__content__3d-viewport-canvas-container__3d-canvas"
                        ></canvas>
                    </div>
                    <div class="examination-screen__panel__content__details-container">
                        <span
                            class="examination-screen__panel__content__details-container__screen-title"
                            >{{ examinationScreenDetailScreenTitle }}</span
                        >
                        <span
                            v-show="!isAPOIActive"
                            class="examination-screen__panel__content__details-container__detail-name"
                            >{{ examinationScreenOverviewTitle }}</span
                        >
                        <span
                            v-show="!isAPOIActive"
                            class="examination-screen__panel__content__details-container__detail-description"
                        >
                            {{ examinationScreenOverviewDescription }}
                        </span>
                        <span
                            v-show="isAPOIActive"
                            class="examination-screen__panel__content__details-container__detail-name"
                        >
                            {{ examinationScreenDetailName }}
                        </span>
                        <span
                            v-show="isAPOIActive"
                            class="examination-screen__panel__content__details-container__detail-description"
                            >{{ examinationScreenDetailDescription }}</span
                        >
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.examination-screen {
    position: absolute;
    top: 0px;
    left: 0px;

    width: 100vw;
    height: 100vh;

    display: flex;
    align-items: center;
    justify-content: center;

    background: #00000050;
    z-index: 8;

    opacity: 1;
    backdrop-filter: blur(6px);
}

.examination-screen.v-enter-active,
.examination-screen.v-leave-active {
    transition: opacity 0.2s ease-in-out;
}

.examination-screen.v-enter-from,
.examination-screen.v-leave-to {
    opacity: 0;
}

.examination-screen__panel {
    position: relative;

    width: 80%;
    height: 90%;

    display: flex;
    align-items: center;
    justify-content: center;

    background-color: black;
    border-radius: 10px;

    box-shadow: rgba(0, 0, 0, 0.2) 0px 7px 29px 0px;
}

.examination-screen__panel__close-button {
    position: absolute;
    top: 32px;
    right: 32px;

    width: 32px;
    height: 32px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 100%;
    background-color: var(--mersive-c-white-soft);

    cursor: pointer;
}

.examination-screen__panel__close-button img {
    width: 24px;
    height: 24px;
}

.examination-screen__panel__content {
    width: 85%;
    height: 80%;

    display: flex;
    align-items: center;
    justify-content: space-between;
}

.examination-screen__panel__content__3d-viewport-canvas-container,
.examination-screen__panel__content__details-container {
    aspect-ratio: 1 / 1;
    width: 47%;
    height: auto;
}

.examination-screen__panel__content__3d-viewport-canvas-container {
    position: relative;

    display: flex;
    align-items: center;
    justify-content: center;
}

.examination-screen__panel__content__3d-viewport-canvas-container__3d-canvas {
    width: 100%;
    height: 100%;

    outline: none;

    cursor: grab;
}

.examination-screen__panel__content__details-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;

    color: var(--mersive-c-white-soft);

    overflow-y: auto;
    overflow-x: hidden;
}

.examination-screen__panel__content__details-container::-webkit-scrollbar {
    width: 8px;
}

.examination-screen__panel__content__details-container::-webkit-scrollbar-track {
    background: var(--mersive-c-black);
    border-radius: 6px;
}

.examination-screen__panel__content__details-container::-webkit-scrollbar-thumb {
    background: white;
    border-radius: 6px;
}

.examination-screen__panel__content__details-container__screen-title,
.examination-screen__panel__content__details-container__detail-name,
.examination-screen__panel__content__details-container__detail-description {
    width: 100%;

    color: var(--mersive-c-white-soft);
    background-color: transparent;

    border: none;
    outline: none;
}

.examination-screen__panel__content__details-container__screen-title::placeholder,
.examination-screen__panel__content__details-container__detail-name::placeholder,
.examination-screen__panel__content__details-container__detail-description::placeholder {
    color: var(--mersive-c-white-soft);
}

.examination-screen__panel__content__details-container__screen-title {
    font-size: 4em;
    font-weight: 600;

    margin: 0 0 0.25em 0;
}

.examination-screen__panel__content__details-container__detail-name {
    font-size: 1.5em;
    font-weight: 500;
    letter-spacing: 3px;

    margin: 0 0 1em 0;
}

.examination-screen__panel__content__details-container__detail-description {
    height: 100%;

    font-size: 1em;
    font-weight: 300;
    text-align: left;

    color: var(--mersive-c-white-softer);
    line-height: 1.4;

    white-space: break-spaces;
}

@media screen and (max-width: 1600px) {
    .examination-screen {
        font-size: clamp(0.7em, 1vw, 1em);
    }

    .examination-screen__panel {
        width: 96%;
        height: 98%;
    }
}

@media screen and (max-width: 850px) {
    .examination-screen__panel__close-button {
        top: 16px;
        right: 16px;

        width: 20px;
        height: 20px;
    }

    .examination-screen__panel__close-button img {
        width: 20px;
        height: 20px;
    }
}

@media screen and (max-height: 400px) {
    .examination-screen__panel__content__3d-viewport-canvas-container,
    .examination-screen__panel__content__details-container {
        height: 100%;
    }
}
</style>
