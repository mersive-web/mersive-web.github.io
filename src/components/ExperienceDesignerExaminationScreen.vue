<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'

import {
    AbstractMesh,
    AppendSceneAsync,
    ArcRotateCamera,
    CreateDisc,
    Engine,
    GizmoManager,
    GPUPicker,
    HemisphericLight,
    Matrix,
    Mesh,
    PointerEventTypes,
    PointerInfo,
    Scene,
    SceneSerializer,
    StandardMaterial,
    UtilityLayerRenderer,
    Vector3,
} from '@babylonjs/core'

import type { MeshMetadata, POIMetadata } from '@/types'
import {
    buildMeshHierarchyBoundingInfo,
    createMeshMetadataWithNoTransformations,
    degreesToRadians,
    getMeshMaxDimension,
    isNodeAPointOfInterest,
    radiansToDegrees,
    roundNumber,
} from '@/functions'
import eventBus from '@/eventBus'
import MNumericInputField from './MNumericInputField.vue'
import { useExperienceDesignerStore } from '@/stores/experienceDesigner'
import MLoadingScreen from './MLoadingScreen.vue'
import MersiveSceneLoadingScreen from '@/babylonjs/mersiveSceneLoadingScreen'

const experienceDesignerStore = useExperienceDesignerStore()
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
let utilityLayer: UtilityLayerRenderer | null = null
let gizmoManager: GizmoManager | null = null

let cameraInitialAlpha: number
let cameraInitialBeta: number
let cameraInitialRadius: number
let currentElementInverseWorldMatrix: Matrix = new Matrix()
let currentElementMaxScaling = 1

const isAddPOIModeEnabled = ref(false)
const isSettingsPanelShown = ref(false)
const isAPOIActive = ref(false)

const examinationScreenDetailScreenTitle = ref('')
const examinationScreenOverviewTitle = ref('')
const examinationScreenOverviewDescription = ref('')
const examinationScreenDetailName = ref('')
const examinationScreenDetailDescription = ref('')

const defaultSceneClearColorHEXInputValue = '#000000'
const sceneClearColorHEXInputValue = ref(defaultSceneClearColorHEXInputValue)

const defaultHemisphericLightIntensityInputValue = 1
const hemisphericLightIntensityInputValue = ref(defaultHemisphericLightIntensityInputValue)

const defaultHemisphericLightDiffuseColorHEXInputValue = '#ffffff'
const hemisphericLightDiffuseColorInputValue = ref(defaultHemisphericLightDiffuseColorHEXInputValue)

const defaultHemisphericLightGroundColorHEXInputValue = '#4d4d4d'
const hemisphericLightGroundColorInputValue = ref(defaultHemisphericLightGroundColorHEXInputValue)

const defaultCameraFOVDegreesInputValue = 46
const cameraFOVDegreesInputValue = ref(defaultCameraFOVDegreesInputValue)

const initialSetCameraInitialPositionToCurrentPositionButtonText = 'Set to current position'
const setCameraInitialPositionToCurrentPositionButtonText = ref(
    initialSetCameraInitialPositionToCurrentPositionButtonText,
)

const defaultPOIColorHEXWhenActiveInputValue = '#ffffff'
const activePOIColorHEXWhenActiveInputValue = ref(defaultPOIColorHEXWhenActiveInputValue)

const defaultPOIOpacityPercentageWhenActiveInputValue = 75
const activePOIOpacityPercentageWhenActiveInputValue = ref(
    defaultPOIOpacityPercentageWhenActiveInputValue,
)

const defaultPOIColorHEXWhenNotActiveInputValue = '#ffffff'
const activePOIColorHEXWhenNotActiveInputValue = ref(defaultPOIColorHEXWhenNotActiveInputValue)

const defaultPOIOpacityPercentageWhenNotActiveInputValue = 30
const activePOIOpacityPercentageWhenNotActiveInputValue = ref(
    defaultPOIOpacityPercentageWhenNotActiveInputValue,
)

const defaultPOIDiameterInputValue = ref(1)
const defaultPOIMaxDiameterInputValue = ref(1)
const defaultPOIMinDiameterInputValue = ref(0.1)
const activePOIDiameterInputValue = ref(1)

const isMoveToolEnabled = ref(false)
const isRotateToolEnabled = ref(false)

const loadingScreenName = 'experienceDesignerExaminationScreenLoadingScreen'

/**
 * TODO:
 * Add a mode to make all the POIs appear in front of everything, in case the user
 * moves a POI inside the current element and then switches to another POI:
 * if this happens, the POI cannot be selected anymore.
 */

function setupScene(): void {
    scene = new Scene(engine)

    hemisphericLight = new HemisphericLight('HemiLight', new Vector3(0, 1, 0), scene)
    utilityLayer = new UtilityLayerRenderer(scene)
    gizmoManager = new GizmoManager(scene, 2, utilityLayer, utilityLayer)

    // Make the gizmos appear on front of everything, even if they are inside a mesh.
    // The stencil option of the engine is on by default.
    utilityLayer.utilityLayerScene.autoClearDepthAndStencil = true

    gizmoManager.usePointerToAttachGizmos = false
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
    // handleKeyDownEvents()
    handleElementExaminationScreenOpenedEvents()
    handleElementExaminationScreenSerializeMeshFinishedEvents()
    handleNewMeshAddedToSceneEvents()
    handlePointerEvents()
}

function handleWindowResizeEvents(): void {
    // Resize the viewport if the browser window size changes
    window.addEventListener('resize', () => {
        engine.resize()
    })
}

// TODO: remove this from production build
// function handleToggleBabylonJSDebuggerEvents(keyboardEvent: KeyboardEvent): void {
//     if (keyboardEvent.key.toLowerCase() == 'g') {
//         if (scene.debugLayer.isVisible()) {
//             scene.debugLayer.hide()
//         } else {
//             void scene.debugLayer.show()
//         }
//     }
// }

function handleElementExaminationScreenOpenedEvents(): void {
    eventBus.on('elementExaminationScreenOpened', () => {
        engine.displayLoadingUI()
    })
}

function handleElementExaminationScreenSerializeMeshFinishedEvents(): void {
    eventBus.on('elementExaminationScreenSerializeMeshFinished', (data) => {
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
    })
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
            sceneClearColorHEXInputValue.value =
                currentElementMetadata.examinationScreenData.sceneClearColorHEX

            camera.fov = currentElementMetadata.examinationScreenData.cameraFOVRadians
            cameraFOVDegreesInputValue.value = radiansToDegrees(
                currentElementMetadata.examinationScreenData.cameraFOVRadians,
            )

            hemisphericLight.intensity = currentElementMetadata.examinationScreenData.lightIntensity
            hemisphericLightIntensityInputValue.value =
                currentElementMetadata.examinationScreenData.lightIntensity

            hemisphericLight.diffuse.fromHexString(
                currentElementMetadata.examinationScreenData.topLightColorHEX,
            )
            hemisphericLightDiffuseColorInputValue.value =
                currentElementMetadata.examinationScreenData.topLightColorHEX

            hemisphericLight.groundColor.fromHexString(
                currentElementMetadata.examinationScreenData.bottomLightColorHEX,
            )
            hemisphericLightGroundColorInputValue.value =
                currentElementMetadata.examinationScreenData.bottomLightColorHEX

            examinationScreenDetailScreenTitle.value =
                currentElementMetadata.examinationScreenData.screenTitle

            examinationScreenOverviewTitle.value =
                currentElementMetadata.examinationScreenData.overviewTitle

            examinationScreenOverviewDescription.value =
                currentElementMetadata.examinationScreenData.overviewDescription
        } else {
            scene.clearColor.fromHexString(defaultSceneClearColorHEXInputValue)
            sceneClearColorHEXInputValue.value = defaultSceneClearColorHEXInputValue

            camera.fov = degreesToRadians(defaultCameraFOVDegreesInputValue)
            cameraFOVDegreesInputValue.value = defaultCameraFOVDegreesInputValue

            hemisphericLight.intensity = defaultHemisphericLightIntensityInputValue
            hemisphericLightIntensityInputValue.value = defaultHemisphericLightIntensityInputValue

            hemisphericLight.diffuse.fromHexString(defaultHemisphericLightDiffuseColorHEXInputValue)
            hemisphericLightDiffuseColorInputValue.value =
                defaultHemisphericLightDiffuseColorHEXInputValue

            hemisphericLight.groundColor.fromHexString(
                defaultHemisphericLightGroundColorHEXInputValue,
            )
            hemisphericLightGroundColorInputValue.value =
                defaultHemisphericLightGroundColorHEXInputValue

            examinationScreenDetailScreenTitle.value = ''
            examinationScreenOverviewTitle.value = ''
            examinationScreenOverviewDescription.value = ''
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

        // We need to store the inverse world matrix of the current element, since it will be used
        // for transforming the POIs world space position to the local space when setting their
        // parent to the current element.
        currentElementInverseWorldMatrix = currentElement.computeWorldMatrix(true).clone().invert()

        // We need to know the value of the max scaling component of the current element
        // to compute the local scaling of the POI.
        currentElementMaxScaling = Math.max(
            currentElement.scaling.x,
            currentElement.scaling.y,
            currentElement.scaling.z,
        )
        const currentElementMaxDimension = roundNumber(meshMaxDimension, 1)

        // The default POIs diameter is 10% of the current element max dimension.
        // The POIs min and max diameters are respectively 0.1 m and 20%
        // of the current element max dimension in meters.
        defaultPOIDiameterInputValue.value = roundNumber(currentElementMaxDimension * 0.1, 1)
        defaultPOIMaxDiameterInputValue.value = roundNumber(
            defaultPOIDiameterInputValue.value * 2,
            1,
        )
    })
}

function handlePointerEvents(): void {
    scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type === PointerEventTypes.POINTERTAP) {
            // Only consider left clicks
            if (pointerInfo.event.button !== 0) {
                return
            }

            // If a mesh is picked (it can be the current element or a POI)
            // (a point or a mesh is picked when the user clicks a mouse button)
            if (pointerInfo.pickInfo?.pickedMesh !== null) {
                if (isAddPOIModeEnabled.value) {
                    // Disallow adding a POI above other POIs
                    if (isNodeAPointOfInterest(pointerInfo.pickInfo!.pickedMesh)) {
                        return
                    }

                    // Update the active point of interest metadata
                    // (if there's one) before adding another point of interest.
                    if (activePOI !== null) {
                        updateActivePointOfInterestMetadata()
                    }

                    addPointOfInterest(pointerInfo)
                    isAddPOIModeEnabled.value = false

                    return
                }
            }

            // If no mesh is picked or if a mesh that is not a POI is picked
            if (
                pointerInfo.pickInfo?.pickedMesh === null ||
                (pointerInfo.pickInfo?.pickedMesh &&
                    isNodeAPointOfInterest(pointerInfo.pickInfo.pickedMesh) === false)
            ) {
                if (activePOI !== null) {
                    // Update the active point of interest metadata before resetting
                    // the active point of interest to then show the overview
                    // details of the current examined element.
                    updateActivePointOfInterestMetadata()
                    resetActivePointOfInterest()

                    return
                }
            }

            // If a POI is picked
            if (
                pointerInfo.pickInfo?.pickedMesh &&
                isNodeAPointOfInterest(pointerInfo.pickInfo.pickedMesh)
            ) {
                // Update the active point of interest metadata (if there's one)
                // before setting another point of interest as active.
                if (activePOI !== null) {
                    updateActivePointOfInterestMetadata()
                }

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

// function handleKeyDownEvents(): void {
//     window.addEventListener('keydown', (keyboardEvent) => {
//         // Ctrl+Alt+I
//         handleToggleBabylonJSDebuggerEvents(keyboardEvent)
//     })
// }

function handleExaminationScreenCloseButtonClickEvents(): void {
    // Update the active point of interest metadata (if there's one)
    // before closing the examination screen.
    // Also, reset the active point of interest.
    if (activePOI !== null) {
        updateActivePointOfInterestMetadata()
        resetActivePointOfInterest()
    }

    updateCurrentElementMetadata()

    const currentElementMetadata = currentElement!.metadata as MeshMetadata

    const currentElementPOIs = currentElement!.getChildMeshes(true, (mesh) => {
        return isNodeAPointOfInterest(mesh)
    })
    const currentElementPOIsSerializedStringified: string[] = []
    for (const POI of currentElementPOIs) {
        currentElementPOIsSerializedStringified.push(
            JSON.stringify(SceneSerializer.SerializeMesh(POI, false, false)),
        )
    }

    eventBus.emit('elementExaminationScreenClosed', {
        currentElementMetadata: currentElementMetadata,
        currentElementPOIsSerializedStringified: currentElementPOIsSerializedStringified,
    })

    currentElement?.dispose(false, true)
    currentElement = null
    gpuPicker.setPickingList(null)

    isAddPOIModeEnabled.value = false
    isSettingsPanelShown.value = false
    isAPOIActive.value = false

    experienceDesignerStore.isExperienceDesignerExaminationScreenShown = false
}

function handleSceneClearColorInputEvents(): void {
    scene.clearColor.fromHexString(sceneClearColorHEXInputValue.value)
}

function handleCameraFOVInputEvents(): void {
    camera.fov = degreesToRadians(cameraFOVDegreesInputValue.value)
}

function handleLightIntensityInputEvents(): void {
    hemisphericLight.intensity = hemisphericLightIntensityInputValue.value
}

function handleTopLightColorInputEvents(): void {
    hemisphericLight.diffuse.fromHexString(hemisphericLightDiffuseColorInputValue.value)
}

function handleBottomLightColorInputEvents(): void {
    hemisphericLight.groundColor.fromHexString(hemisphericLightGroundColorInputValue.value)
}

function handleSetCameraInitialPositionButtonClickEvents(): void {
    cameraInitialAlpha = camera.alpha
    cameraInitialBeta = camera.beta
    cameraInitialRadius = camera.radius

    setCameraInitialPositionToCurrentPositionButtonText.value = 'Initial position updated!'

    setTimeout(() => {
        setCameraInitialPositionToCurrentPositionButtonText.value =
            initialSetCameraInitialPositionToCurrentPositionButtonText
    }, 2000)
}

function handleActivePOIDiameterInputEvents(): void {
    const activePOILocalScaling = activePOIDiameterInputValue.value / currentElementMaxScaling
    activePOI!.scaling.set(activePOILocalScaling, 1, activePOILocalScaling)
}

function handleActivePOIColorWhenActiveInputEvents(): void {
    const activePOIMaterial = activePOI!.material as StandardMaterial
    activePOIMaterial.emissiveColor.fromHexString(activePOIColorHEXWhenActiveInputValue.value)
    activePOIMaterial.diffuseColor.fromHexString(activePOIColorHEXWhenActiveInputValue.value)
}

function handleActivePOIOpacityPercentageWhenActiveInputEvents(): void {
    const activePOIMaterial = activePOI!.material as StandardMaterial
    activePOIMaterial.alpha = activePOIOpacityPercentageWhenActiveInputValue.value / 100
}

function handleAddPointOfInterestButtonClickEvents(): void {
    isAddPOIModeEnabled.value = !isAddPOIModeEnabled.value
}

function handleToggleMoveToolButtonClick(): void {
    isMoveToolEnabled.value = !isMoveToolEnabled.value

    if (isMoveToolEnabled.value) {
        isRotateToolEnabled.value = false
        gizmoManager!.rotationGizmoEnabled = false

        gizmoManager!.positionGizmoEnabled = true
    } else {
        gizmoManager!.positionGizmoEnabled = false
    }
}

function handleToggleRotateToolButtonClick(): void {
    isRotateToolEnabled.value = !isRotateToolEnabled.value

    if (isRotateToolEnabled.value) {
        isMoveToolEnabled.value = false
        gizmoManager!.positionGizmoEnabled = false

        gizmoManager!.rotationGizmoEnabled = true
        gizmoManager!.gizmos.rotationGizmo!.updateGizmoRotationToMatchAttachedMesh = false
    } else {
        gizmoManager!.rotationGizmoEnabled = false
    }
}

function handleDeleteCurrentPOIButtonClickEvents(): void {
    const isDeleteCurrentPOIOperationConfirmed = confirm(
        'Do you really want to delete this point of interest? This operation cannot be undone.',
    )

    if (isDeleteCurrentPOIOperationConfirmed === false) {
        return
    }

    // Remove the active POI's mesh from GPUPickerPickingList
    const activePOIID = activePOI!.id
    const activePOIIndex = GPUPickerPickingList.findIndex((mesh) => mesh.id === activePOIID)

    if (activePOIIndex === -1) {
        throw new Error('The active POI index cannot be found in GPUPickerPickingList.')
    }

    GPUPickerPickingList.splice(activePOIIndex, 1)

    // Re-set the GPU Picker picking list after the active POI's mesh
    // has been removed from the picking list.
    gpuPicker.setPickingList([...GPUPickerPickingList])

    activePOI!.dispose()
    resetActivePointOfInterest()
}

function handleOpenSettingsButtonClickEvents(): void {
    isSettingsPanelShown.value = !isSettingsPanelShown.value
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

    gizmoManager!.attachToMesh(null)
    gizmoManager!.positionGizmoEnabled = false
    gizmoManager!.rotationGizmoEnabled = false
    isMoveToolEnabled.value = false
    isRotateToolEnabled.value = false
}

function setPointOfInterestAsActive(pointOfInterest: Mesh): void {
    if (activePOI !== null) {
        resetActivePointOfInterest()
    }

    activePOI = pointOfInterest
    isAPOIActive.value = true

    gizmoManager!.attachToMesh(activePOI)

    const activePOIMetadata = activePOI.metadata as POIMetadata

    examinationScreenDetailName.value = activePOIMetadata.detailName
    examinationScreenDetailDescription.value = activePOIMetadata.detailDescription

    const activePOIMaterial = activePOI.material as StandardMaterial
    activePOIMaterial.emissiveColor.fromHexString(activePOIMetadata.settings.colorHEXWhenActive)
    activePOIMaterial.diffuseColor.fromHexString(activePOIMetadata.settings.colorHEXWhenActive)
    activePOIMaterial.alpha = activePOIMetadata.settings.opacityPercentageWhenActive / 100

    // The active POI scaling its local to its parent (the current element).
    // So, we have to take into account its parent scaling when computing the effective diameter.
    // Since the POI is a disc, its scaling components have the same values, except the y which
    // is 1 (because the disc is a bi-dimensional mesh).
    // Hence, using the scaling x or z component is indifferent.
    activePOIDiameterInputValue.value = roundNumber(
        activePOI.scaling.x * currentElementMaxScaling,
        1,
    )

    activePOIColorHEXWhenActiveInputValue.value = activePOIMetadata.settings.colorHEXWhenActive
    activePOIOpacityPercentageWhenActiveInputValue.value =
        activePOIMetadata.settings.opacityPercentageWhenActive
    activePOIColorHEXWhenNotActiveInputValue.value =
        activePOIMetadata.settings.colorHEXWhenNotActive
    activePOIOpacityPercentageWhenNotActiveInputValue.value =
        activePOIMetadata.settings.opacityPercentageWhenNotActive
}

function addPointOfInterest(pointerInfo: PointerInfo): void {
    const pickedPoint = pointerInfo.pickInfo!.pickedPoint!

    const newPOI = CreateDisc(
        'POINT_OF_INTEREST',
        {
            radius: 0.5, // initial diameter = 1
            tessellation: 128,
            arc: 1,
            sideOrientation: Mesh.DOUBLESIDE,
        },
        scene,
    )
    newPOI.id = newPOI.uniqueId.toString()

    const newPOIMaterial = new StandardMaterial('POINT_OF_INTEREST_MATERIAL', scene)
    newPOIMaterial.id = newPOIMaterial.uniqueId.toString()
    newPOI.material = newPOIMaterial

    newPOI.metadata = {
        detailName: '',
        detailDescription: '',
        role: 'POINT_OF_INTEREST',
        settings: {
            colorHEXWhenActive: defaultPOIColorHEXWhenActiveInputValue,
            colorHEXWhenNotActive: defaultPOIColorHEXWhenNotActiveInputValue,
            opacityPercentageWhenActive: defaultPOIOpacityPercentageWhenActiveInputValue,
            opacityPercentageWhenNotActive: defaultPOIOpacityPercentageWhenNotActiveInputValue,
        },
    } as POIMetadata

    /**
     * @see https://www.babylonjs-playground.com/#2C8LVE#13
     */

    // Offset the y position to distance it from the element when attaching the new POI to it.
    // Then, align the POI on the horizontal plane by setting its rotation x component to 90 deg.
    // Finally, bake the current transformations of the POI, so its position and rotation
    // will be resetted to 0 but the applied transformations will be mantained.
    // In this way, when setting the new POI position to the picked (clicked) point position
    // of the element, it will already be distanced from the latter without doing extra steps.
    // Moreover, since the POI is now aligned on the horizontal plane but its rotation is 0, we
    // just have to take care of the rotation to apply to make it parallel to the face of the
    // picked point, or, equivalently, to make it orthogonal to the normal of the picked point,
    // without doing extra steps to make the POI's face to... face the camera.
    // (if we don't set the POI's rotation x component to 90 deg,
    // then the POI's border will face the camera, and not its face.)
    // NOTE: all this mechanism works if the current element rotation is 0.
    //       If its rotation is not 0, we have to take its rotation into account.
    newPOI.position.y = 0.05
    newPOI.rotation.x = Math.PI / 2
    newPOI.bakeCurrentTransformIntoVertices()
    newPOI.position = pickedPoint

    // Support vector used to build two orthogonal vectors (axis2 and axis3)
    // using the normal vector of the picked point (axis1).
    // This vector can be anything, except all zeros.
    const supportVector = new Vector3(1, 1, 1)

    // Both axis2 and axis3 will be orthogonal to axis1, and they will form
    // a left-handed system.
    const axis1 = pointerInfo.pickInfo!.getNormal(true, true)!
    const axis2 = supportVector.cross(axis1)
    const axis3 = axis2.cross(axis1)

    // Rotate the disc in a manner that its local y axis points towards the
    // normal vector of the picked point; axis2 and axis3 exist for the sole
    // purpose of being able to use this function.
    newPOI.rotation = Vector3.RotationFromAxis(axis2, axis1, axis3)

    // VERY IMPORTANT REMARK: the following parenting procedure which aims to keep the POI in
    // the same position and with the same rotation will only work if the current element
    // (the parent) has a uniform scaling. Otherwise, the POI will not be parallel to the
    // picked current element's face, infact its position and rotation would be messed up.
    newPOI.parent = currentElement

    // Transform the POI world space position to the local space,
    // after setting its parent to the current element.
    newPOI.position = Vector3.TransformCoordinates(
        newPOI.position.clone(),
        currentElementInverseWorldMatrix,
    )

    // The POI scaling now is local (relative) to its parent (the current element).
    // So, we must take into account the current element scaling.
    const newPOILocalScaling = defaultPOIDiameterInputValue.value / currentElementMaxScaling

    // The POI is a disc, which is a bi-dimensional mesh.
    // Setting its scaling y component has no sense, and can produce unexpected results.
    // Hence, we leave it to 1 (default).
    newPOI.scaling.set(newPOILocalScaling, 1, newPOILocalScaling)

    GPUPickerPickingList.push(newPOI)
    gpuPicker.setPickingList([...GPUPickerPickingList])
    setPointOfInterestAsActive(newPOI)
}

function updateActivePointOfInterestMetadata(): void {
    activePOI!.metadata = {
        detailName: examinationScreenDetailName.value,
        detailDescription: examinationScreenDetailDescription.value,
        role: 'POINT_OF_INTEREST',
        settings: {
            colorHEXWhenActive: activePOIColorHEXWhenActiveInputValue.value,
            colorHEXWhenNotActive: activePOIColorHEXWhenNotActiveInputValue.value,
            opacityPercentageWhenActive: activePOIOpacityPercentageWhenActiveInputValue.value,
            opacityPercentageWhenNotActive: activePOIOpacityPercentageWhenNotActiveInputValue.value,
        },
    } as POIMetadata
}

function updateCurrentElementMetadata(): void {
    currentElement!.metadata = {
        examinationScreenData: {
            screenTitle: examinationScreenDetailScreenTitle.value,
            overviewTitle: examinationScreenOverviewTitle.value,
            overviewDescription: examinationScreenOverviewDescription.value,
            sceneClearColorHEX: sceneClearColorHEXInputValue.value,
            cameraFOVRadians: camera.fov,
            lightIntensity: hemisphericLight.intensity,
            topLightColorHEX: hemisphericLight.diffuse.toHexString(),
            bottomLightColorHEX: hemisphericLight.groundColor.toHexString(),
            cameraInitialPosition: {
                alpha: cameraInitialAlpha,
                beta: cameraInitialBeta,
                radius: cameraInitialRadius,
            },
        },
    } as MeshMetadata
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
</script>

<template>
    <Transition>
        <div
            v-show="experienceDesignerStore.isExperienceDesignerExaminationScreenShown"
            class="examination-screen"
        >
            <div class="examination-screen__panel">
                <button
                    class="examination-screen__panel__close-button"
                    tabindex="-1"
                    @click="handleExaminationScreenCloseButtonClickEvents"
                >
                    <img src="/src/assets/icons/close_400.svg" alt="" />
                </button>
                <div class="examination-screen__panel__content">
                    <MLoadingScreen :loading-screen-name="loadingScreenName" />
                    <div class="examination-screen__panel__content__3d-viewport-canvas-container">
                        <canvas
                            ref="examination-screen__panel__content__3d-viewport-canvas-container__3d-canvas"
                            class="examination-screen__panel__content__3d-viewport-canvas-container__3d-canvas"
                            :class="{
                                'examination-screen__panel__content__3d-viewport-canvas-container__3d-canvas--cursor-crosshair':
                                    isAddPOIModeEnabled,
                            }"
                        ></canvas>
                        <div
                            class="examination-screen__panel__content__3d-viewport-canvas-container__buttons-overlay"
                        >
                            <button
                                tabindex="-1"
                                class="examination-screen__panel__content__3d-viewport-canvas-container__buttons-overlay__button"
                                :class="{
                                    'examination-screen__panel__content__3d-viewport-canvas-container__buttons-overlay__button--enabled':
                                        isAddPOIModeEnabled,
                                }"
                                title="Add a point of interest"
                                @click="handleAddPointOfInterestButtonClickEvents"
                            >
                                <img src="/src/assets/icons/add_400.svg" alt="" />
                            </button>
                            <button
                                v-show="isAPOIActive"
                                tabindex="-1"
                                class="examination-screen__panel__content__3d-viewport-canvas-container__buttons-overlay__button"
                                :class="{
                                    'examination-screen__panel__content__3d-viewport-canvas-container__buttons-overlay__button--enabled':
                                        isMoveToolEnabled,
                                }"
                                title="Enable or disable the move tool"
                                @click="handleToggleMoveToolButtonClick"
                            >
                                <img src="/src/assets/icons/move_400.svg" alt="" />
                            </button>
                            <button
                                v-show="isAPOIActive"
                                tabindex="-1"
                                class="examination-screen__panel__content__3d-viewport-canvas-container__buttons-overlay__button"
                                :class="{
                                    'examination-screen__panel__content__3d-viewport-canvas-container__buttons-overlay__button--enabled':
                                        isRotateToolEnabled,
                                }"
                                title="Enable or disable the rotate tool"
                                @click="handleToggleRotateToolButtonClick"
                            >
                                <img src="/src/assets/icons/rotate_400.svg" alt="" />
                            </button>
                            <button
                                v-show="isAPOIActive"
                                tabindex="-1"
                                class="examination-screen__panel__content__3d-viewport-canvas-container__buttons-overlay__button examination-screen__panel__content__3d-viewport-canvas-container__buttons-overlay__button--delete-current-poi-button"
                                title="Delete the current point of interest"
                                @click="handleDeleteCurrentPOIButtonClickEvents"
                            >
                                <img src="/src/assets/icons/delete_trash_x_filled_400.svg" alt="" />
                            </button>
                            <button
                                tabindex="-1"
                                class="examination-screen__panel__content__3d-viewport-canvas-container__buttons-overlay__button"
                                :class="{
                                    'examination-screen__panel__content__3d-viewport-canvas-container__buttons-overlay__button--enabled':
                                        isSettingsPanelShown,
                                }"
                                title="Open the settings panel"
                                @click="handleOpenSettingsButtonClickEvents"
                            >
                                <img src="/src/assets/icons/settings_filled_400.svg" alt="" />
                            </button>
                        </div>
                    </div>
                    <div
                        v-show="!isSettingsPanelShown"
                        class="examination-screen__panel__content__details-container"
                    >
                        <input
                            v-model="examinationScreenDetailScreenTitle"
                            placeholder="Type the screen title"
                            spellcheck="false"
                            class="examination-screen__panel__content__details-container__screen-title"
                        />
                        <input
                            v-show="!isAPOIActive"
                            v-model="examinationScreenOverviewTitle"
                            placeholder="Type an overview title"
                            spellcheck="false"
                            class="examination-screen__panel__content__details-container__detail-name"
                        />
                        <textarea
                            v-show="!isAPOIActive"
                            v-model="examinationScreenOverviewDescription"
                            placeholder="Type an overview description here.&#10;Then, add as many points of interest as you want."
                            autocorrect="off"
                            class="examination-screen__panel__content__details-container__detail-description"
                        ></textarea>
                        <input
                            v-show="isAPOIActive"
                            v-model="examinationScreenDetailName"
                            placeholder="Type the detail name"
                            spellcheck="false"
                            class="examination-screen__panel__content__details-container__detail-name"
                        />
                        <textarea
                            v-show="isAPOIActive"
                            v-model="examinationScreenDetailDescription"
                            placeholder="Type the detail description"
                            autocorrect="off"
                            class="examination-screen__panel__content__details-container__detail-description"
                        ></textarea>
                    </div>
                    <div
                        v-show="isSettingsPanelShown"
                        class="examination-screen__panel__content__settings-container"
                    >
                        <div
                            class="examination-screen__panel__content__settings-container__settings-group"
                        >
                            <h1
                                class="examination-screen__panel__content__settings-container__settings-group__heading"
                            >
                                Scene settings
                            </h1>
                            <div
                                class="examination-screen__panel__content__settings-container__settings-group__body"
                            >
                                <div
                                    class="examination-screen__panel__content__settings-container__settings-group__body__input-container"
                                >
                                    <span
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-name"
                                        >Scene color:</span
                                    >
                                    <input
                                        v-model="sceneClearColorHEXInputValue"
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-control--type-color"
                                        type="color"
                                        @input="handleSceneClearColorInputEvents"
                                    />
                                </div>
                                <div
                                    class="examination-screen__panel__content__settings-container__settings-group__body__input-container"
                                >
                                    <span
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-name"
                                        >Camera Field of View:</span
                                    >
                                    <MNumericInputField
                                        v-model.number="cameraFOVDegreesInputValue"
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-control--type-number"
                                        :min-value="6"
                                        :max-value="180"
                                        :step="0.1"
                                        :max-number-of-decimal-places="1"
                                        text-after-input="°"
                                        @input="handleCameraFOVInputEvents"
                                    />
                                    <input
                                        v-model.number="cameraFOVDegreesInputValue"
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-control--type-range"
                                        type="range"
                                        min="6"
                                        max="180"
                                        step="0.1"
                                        @input="handleCameraFOVInputEvents"
                                    />
                                </div>
                                <div
                                    class="examination-screen__panel__content__settings-container__settings-group__body__input-container"
                                >
                                    <span
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-name"
                                        >Light intensity:</span
                                    >
                                    <input
                                        v-model.number="hemisphericLightIntensityInputValue"
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-control--type-range"
                                        type="range"
                                        min="0"
                                        max="2"
                                        step="0.1"
                                        @input="handleLightIntensityInputEvents"
                                    />
                                </div>
                                <div
                                    class="examination-screen__panel__content__settings-container__settings-group__body__input-container"
                                >
                                    <span
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-name"
                                        >Top light color:</span
                                    >
                                    <input
                                        v-model="hemisphericLightDiffuseColorInputValue"
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-control--type-color"
                                        type="color"
                                        @input="handleTopLightColorInputEvents"
                                    />
                                </div>
                                <div
                                    class="examination-screen__panel__content__settings-container__settings-group__body__input-container"
                                >
                                    <span
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-name"
                                        >Bottom light color:</span
                                    >
                                    <input
                                        v-model="hemisphericLightGroundColorInputValue"
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-control--type-color"
                                        type="color"
                                        @input="handleBottomLightColorInputEvents"
                                    />
                                </div>
                                <div
                                    class="examination-screen__panel__content__settings-container__settings-group__body__input-container"
                                >
                                    <span
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-name"
                                        >Camera initial position:</span
                                    >
                                    <button
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-control--type-button"
                                        tabindex="-1"
                                        @click="handleSetCameraInitialPositionButtonClickEvents()"
                                    >
                                        {{ setCameraInitialPositionToCurrentPositionButtonText }}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div
                            class="examination-screen__panel__content__settings-container__settings-group"
                        >
                            <h1
                                class="examination-screen__panel__content__settings-container__settings-group__heading"
                            >
                                Point of interest settings
                            </h1>
                            <p
                                v-show="!isAPOIActive"
                                class="examination-screen__panel__content__settings-container__settings-group__body__paragraph"
                            >
                                Click on a point of interest to display and change its settings.
                            </p>
                            <div
                                v-show="isAPOIActive"
                                class="examination-screen__panel__content__settings-container__settings-group__body"
                            >
                                <div
                                    class="examination-screen__panel__content__settings-container__settings-group__body__input-container"
                                >
                                    <span
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-name"
                                        >Point diameter:</span
                                    >
                                    <MNumericInputField
                                        v-model.number="activePOIDiameterInputValue"
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-control--type-number"
                                        :min-value="defaultPOIMinDiameterInputValue"
                                        :max-value="defaultPOIMaxDiameterInputValue"
                                        :step="0.1"
                                        :max-number-of-decimal-places="1"
                                        text-after-input="m"
                                        @input="handleActivePOIDiameterInputEvents"
                                    />
                                    <input
                                        v-model.number="activePOIDiameterInputValue"
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-control--type-range"
                                        type="range"
                                        :min="defaultPOIMinDiameterInputValue"
                                        :max="defaultPOIMaxDiameterInputValue"
                                        step="0.1"
                                        @input="handleActivePOIDiameterInputEvents"
                                    />
                                </div>
                                <div
                                    class="examination-screen__panel__content__settings-container__settings-group__body__input-container"
                                >
                                    <span
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-name"
                                        >Point color when active:</span
                                    >
                                    <input
                                        v-model="activePOIColorHEXWhenActiveInputValue"
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-control--type-color"
                                        type="color"
                                        @input="handleActivePOIColorWhenActiveInputEvents"
                                    />
                                </div>
                                <div
                                    class="examination-screen__panel__content__settings-container__settings-group__body__input-container"
                                >
                                    <span
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-name"
                                        >Point opacity when active:</span
                                    >
                                    <MNumericInputField
                                        v-model.number="
                                            activePOIOpacityPercentageWhenActiveInputValue
                                        "
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-control--type-number"
                                        :min-value="2"
                                        :max-value="100"
                                        :step="1"
                                        :max-number-of-decimal-places="0"
                                        text-after-input="%"
                                        @input="
                                            handleActivePOIOpacityPercentageWhenActiveInputEvents
                                        "
                                    />
                                    <input
                                        v-model.number="
                                            activePOIOpacityPercentageWhenActiveInputValue
                                        "
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-control--type-range"
                                        type="range"
                                        min="2"
                                        max="100"
                                        step="1"
                                        @input="
                                            handleActivePOIOpacityPercentageWhenActiveInputEvents
                                        "
                                    />
                                </div>
                                <div
                                    class="examination-screen__panel__content__settings-container__settings-group__body__input-container"
                                >
                                    <span
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-name"
                                        >Point color when not active:</span
                                    >
                                    <input
                                        v-model="activePOIColorHEXWhenNotActiveInputValue"
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-control--type-color"
                                        type="color"
                                    />
                                </div>
                                <div
                                    class="examination-screen__panel__content__settings-container__settings-group__body__input-container"
                                >
                                    <span
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-name"
                                        >Point opacity when not active:</span
                                    >
                                    <MNumericInputField
                                        v-model.number="
                                            activePOIOpacityPercentageWhenNotActiveInputValue
                                        "
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-control--type-number"
                                        :min-value="2"
                                        :max-value="100"
                                        :step="1"
                                        :max-number-of-decimal-places="0"
                                        text-after-input="%"
                                    />
                                    <input
                                        v-model.number="
                                            activePOIOpacityPercentageWhenNotActiveInputValue
                                        "
                                        class="examination-screen__panel__content__settings-container__settings-group__body__input-container__input-control--type-range"
                                        type="range"
                                        min="2"
                                        max="100"
                                        step="1"
                                    />
                                </div>
                            </div>
                        </div>
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
    z-index: 3;

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
.examination-screen__panel__content__details-container,
.examination-screen__panel__content__settings-container {
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

.examination-screen__panel__content__3d-viewport-canvas-container__3d-canvas--cursor-crosshair {
    cursor: crosshair;
}

.examination-screen__panel__content__3d-viewport-canvas-container__buttons-overlay {
    position: absolute;
    top: 8px;
    right: 8px;

    display: flex;
    gap: 0 0.5em;

    background-color: transparent;
}

.examination-screen__panel__content__3d-viewport-canvas-container__buttons-overlay__button {
    display: flex;
    align-items: center;
    justify-content: center;

    background-color: var(--mersive-c-grey);

    border-radius: 6px;
    padding: 0.3em;

    transition: background-color 0.1s ease-in;
    cursor: pointer;

    user-select: none;
}

.examination-screen__panel__content__3d-viewport-canvas-container__buttons-overlay__button:hover {
    background-color: var(--mersive-c-grey-dark);
}

.examination-screen__panel__content__3d-viewport-canvas-container__buttons-overlay__button--delete-current-poi-button:hover {
    background-color: var(--mersive-c-red);
}

.examination-screen__panel__content__3d-viewport-canvas-container__buttons-overlay__button--enabled,
.examination-screen__panel__content__3d-viewport-canvas-container__buttons-overlay__button--enabled:hover {
    background-color: var(--mersive-c-blue);
}

.examination-screen__panel__content__3d-viewport-canvas-container__buttons-overlay__button img {
    width: 24px;
    height: 24px;
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
    resize: none;
}

.examination-screen__panel__content__details-container__detail-description::-webkit-scrollbar {
    width: 8px;
}

.examination-screen__panel__content__details-container__detail-description::-webkit-scrollbar-track {
    background: var(--mersive-c-black);
    border-radius: 6px;
}

.examination-screen__panel__content__details-container__detail-description::-webkit-scrollbar-thumb {
    background: white;
    border-radius: 6px;
}

.examination-screen__panel__content__settings-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;

    color: var(--mersive-c-white);
    background-color: transparent;

    gap: 2em 0;

    overflow-y: auto;
    overflow-x: hidden;
    user-select: none;
}

.examination-screen__panel__content__settings-container::-webkit-scrollbar {
    width: 8px;
}

.examination-screen__panel__content__settings-container::-webkit-scrollbar-track {
    background: var(--mersive-c-black);
    border-radius: 6px;
}

.examination-screen__panel__content__settings-container::-webkit-scrollbar-thumb {
    background: white;
    border-radius: 6px;
}

.examination-screen__panel__content__settings-container__settings-group__heading {
    font-size: 2em;
    font-weight: 500;

    margin: 0 0 0.5em 0;
}

.examination-screen__panel__content__settings-container__settings-group__body {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;

    gap: 1em 0;
}

.examination-screen__panel__content__settings-container__settings-group__body__paragraph {
    font-size: 0.9em;
    font-weight: 300;
    line-height: 1.4;

    margin: 0 0 1em 0;
}

.examination-screen__panel__content__settings-container__settings-group__body__input-container {
    min-height: 30px;

    display: flex;
    align-items: center;
    justify-content: flex-start;

    gap: 0 1em;
}

.examination-screen__panel__content__settings-container__settings-group__body__input-container__input-name {
    min-width: 210px;

    font-size: 0.9em;
    font-weight: 300;
}

.examination-screen__panel__content__settings-container__settings-group__body__input-container__input-control--type-button {
    padding: 0.5em 1em;

    font-size: 0.8em;

    color: var(--mersive-c-white);

    background-color: var(--mersive-c-grey-dark);
    border: none;
    border-radius: 6px;

    cursor: pointer;
    user-select: none;

    transition: background-color 0.1s ease-in;
}

.examination-screen__panel__content__settings-container__settings-group__body__input-container__input-control--type-button:hover {
    background-color: var(--mersive-c-grey-darker);
}

.examination-screen__panel__content__settings-container__settings-group__body__input-container__input-control--type-number {
    width: 80px;

    font-size: 1em;
}

.examination-screen__panel__content__settings-container__settings-group__body__input-container__input-control--type-range {
    width: 150px;
}

.examination-screen__panel__content__settings-container__settings-group__body__input-container__input-control--type-color {
    width: 60px;
    height: 30px;

    padding: 0.2em;

    background-color: var(--mersive-c-grey-dark);
    border: none;
    border-radius: 6px;

    cursor: pointer;
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
    .examination-screen__panel__content__details-container,
    .examination-screen__panel__content__settings-container {
        height: 100%;
    }
}
</style>
