<script setup lang="ts">
import { onMounted, watch, useTemplateRef, ref, inject } from 'vue'
import { useExperienceDesignerStore } from '@/stores/experienceDesigner'
import {
    isNodeAMesh,
    isNodeALight,
    isNodeAMovableLight,
    isNodeMovable,
    isNodeADirectionableLight,
    buildMeshHierarchyBoundingInfo,
    createMeshMetadataWithNoTransformations,
    getCameraFramingHorizontalAxis,
    getMeshMaxDimension,
    scaleMeshUniformlyToReachDesiredMaxDimension,
    isNodeAPointOfInterest,
} from '@/functions'
import eventBus from '@/eventBus'

import { Engine } from '@babylonjs/core/Engines/engine'
import {
    AppendSceneAsync,
    AssetsManager,
    BackgroundMaterial,
    CameraGizmo,
    Color3,
    CreateBox,
    CreateCylinder,
    CreateDisc,
    CreatePlane,
    CreateSphere,
    CreateTorus,
    GizmoManager,
    GroundMesh,
    Light,
    LightGizmo,
    LoadAssetContainerAsync,
    Matrix,
    Mesh,
    Node,
    PhotoDome,
    PointerEventTypes,
    SceneSerializer,
    ShadowGenerator,
    StandardMaterial,
    Texture,
    UniversalCamera,
    UtilityLayerRenderer,
    Vector3,
    type IShadowLight,
} from '@babylonjs/core'
import { Scene } from '@babylonjs/core/scene'
import {
    AbstractMesh,
    CubeTexture,
    DirectionalLight,
    HemisphericLight,
    PointLight,
    SpotLight,
} from '@babylonjs/core'

// DEBUG
// import '@babylonjs/core/Debug/debugLayer'
// import '@babylonjs/inspector'

import MersiveExperienceDesignerCamera from '@/babylonjs/mersiveExperienceDesignerCamera'
import FloorGrid from '@/babylonjs/floorGrid'
import skyTextureUrl from '@/assets/textures/sky_texture.jpg?url'
import skyEnvironmentTextureUrl from '@/assets/environment_textures/sky_environment_texture.env?url'
import {
    degreesToRadians,
    getMemoryUsedMB,
    getMeshDimensionsVector,
    normalizeAngleFromRadiansInDegrees,
    radiansToDegrees,
    roundNumber,
} from '@/functions'
import type {
    DirectionalLightProperties,
    MeshMetadata,
    HemisphericLightProperties,
    MeshProperties,
    NodeData,
    PointLightProperties,
    SceneNodeData,
    SpotLightProperties,
    DirectionableLightMetadata,
    INodeProperties,
    SceneMetadata,
} from '@/types'

// REMARK: we can also use https://vueuse.org/core/useFileDialog/
import { fileOpen, fileSave, supported, type FileWithHandle } from 'browser-fs-access'
import ExperienceDesignerExaminationScreen from './ExperienceDesignerExaminationScreen.vue'
import MLoadingScreen from './MLoadingScreen.vue'
import MersiveSceneLoadingScreen from '@/babylonjs/mersiveSceneLoadingScreen'
import { experienceToEditOrPlayFileWithHandleIK } from '@/injectionKeys'
import { experiencePlayerCameraName } from '@/babylonjs/mersiveExperiencePlayerCamera'
import { useExperiencePlayerStore } from '@/stores/experiencePlayer'
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic'

registerBuiltInLoaders()

// TODO: prevent multiple activeNodeDataUpdated and sceneNodesDataUpdated events

// TODO: add materials/textures and env background (HDRIs) as categories

// TODO: set up vite dev server using https

// TODO: add an invisible ground to prevent falling in the void with gravity and collision enabled

// TODO: make transition values as vars in base.css

// TODO: inform the user to ensure the browser will use the dedicated GPU and not integrated one.
//       link a guide to check or to set the gpu for the browser.
//       we can show a notification if FPS are lower than screen refresh rate - 20%
//       (e.g. on 60 Hz screen, then if FPS < 48)

// TODO: experience file dimensions for the default scene is around 10 MB because of the PhotoDome.
//       instead of serializing it, we can just serialize the sky texture and then re-create
//       the PhotoDome on scene load and apply the serialized texture.

const experienceDesignerStore = useExperienceDesignerStore()
const experiencePlayerStore = useExperiencePlayerStore()

type PlaneCoordinate = 'x' | 'y' | 'z'

/**
 * @see isAMovableLightType
 */
type MovableLight = PointLight | DirectionalLight | SpotLight

/**
 * @see isADirectionableLightType
 */
type DirectionableLight = DirectionalLight | SpotLight | HemisphericLight

/**
 * @see isAMovableNodeType
 */
type MovableNode = Mesh | GroundMesh | MovableLight

let engine: Engine
let scene: Scene
let experienceDesignerCamera: MersiveExperienceDesignerCamera
let experiencePlayerCamera: UniversalCamera
let activeNode: Node | null = null

const skyBoxId = 'MERSIVE_SKYBOX'

let _3DViewportGrid: FloorGrid | null = null
const _3DViewportGridId = 'MERSIVE_3D_VIEWPORT_GRID'

// Lights don't have onAfterWorldMatrixUpdateObservable, so we must use a mesh (which has that
// observable) to listen to position/rotation/scaling (transformations) changes of the active
// node, by syncing that mesh with it.
// TransformNodes don't update the world matrix when moving them without a Gizmo.
// Meshes, instead, do so.
let transformationMesh: Mesh | null = null
const transformationMeshId = 'MERSIVE_TRANSFORMATION_MESH'
let transformationMeshGizmoManager: GizmoManager | null = null
const transformationMeshGizmoSnapDistancesVector = new Vector3(1, 1, 1)
const transformationMeshGizmoSnapSensitivitiesVector = new Vector3(1, 1, 1)
let transformationMeshPreviousScaling = new Vector3(1, 1, 1)

let lightGizmo: LightGizmo | null = null

let directionPointMesh: Mesh | null = null
const directionPointMeshId = 'MERSIVE_DIRECTION_POINT_MESH'
let directionPointMeshGizmoManager: GizmoManager | null = null

let experiencePlayerCameraGizmo: CameraGizmo | null = null

let copiedNode: Node | null = null

const systemMeshesIds = [
    `${skyBoxId}_mesh`,
    _3DViewportGridId,
    transformationMeshId,
    directionPointMeshId,
]

let shadowsGeneratorsBuffer: Record<string, ShadowGenerator> = {}

const defaultMaterialName = 'Default material'
const defaultMaterialId = 'MERSIVE_DEFAULT_MATERIAL'

const loadingScreenName = 'experienceDesignerLoadingScreen'

function handleCanvasDropEvents(): void {
    canvas.value!.addEventListener('drop', (e) => {
        if (experienceDesignerStore.areThereSavingOrOpeningOperationsInProgress) {
            return
        }

        const files: File[] = []
        if (e.dataTransfer!.items) {
            // Use DataTransferItemList interface to access the file(s)
            for (const item of [...e.dataTransfer!.items]) {
                // If dropped items aren't files, reject them
                if (item.kind === 'file') {
                    const file = item.getAsFile()!
                    files.push(file)
                }
            }
        } else {
            // Use DataTransfer interface to access the file(s)
            for (const file of [...e.dataTransfer!.files]) {
                files.push(file)
            }
        }

        void process3DModelsFiles(files)

        experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
    })
}

function setupEventHandlers(): void {
    handleWindowResizeEvents()
    handleMaterialAddedToSceneEvents()
    handleNodeAddedOrRemovedToSceneEvents()
    handleKeyboardEvents()
    handlePointerEvents()
    handleOutlinerNodeSelectedEvents()
    handleOutlinerSceneSelectedEvents()
    handleToggleNodeVisibilityEvents()
    handleEditorInputEvents()
    handleDuplicateNodeEvents()
    handleCopyActiveNodeEvents()
    handlePasteNodeEvents()
    handleOutlinerNodeRenamedEvents()
    handleImport3DModelCommandExecutedEvents()
    handleCanvasDropEvents()
    handleResetActiveElementRotationButtonClickEvents()
    handleResetActiveElementDimensionsButtonClickEvents()
    handleElementExaminationScreenClosedEvents()
    handleConfigureExaminationScreenButtonClickEvents()
    handleExperiencePlayerCameraPropertiesInputEvents()
    handleUploadNewSceneSkyTextureButtonClickEvents()
    handleUploadNewSceneEnvironmentTextureButtonClickEvents()
    handleToggleGridCommandExecutedEvents()
    handleActiveToolChangedEvents()
    handleLockAspectRadioModeEnabledChangedEvents()
    handleCreateNewExperienceCommandExecutedEvents()
    handleSaveExperienceCommandExecutedEvents()
    handleSaveExperienceAsCommandExecutedEvents()
    handleOpenExperienceCommandExecutedEvents()
    handleCloseOrReloadBrowserTabRequestedEvents()
    handlePlayExperienceCommandExecutedEvents()
    handleElementsLibraryBuiltInElementButtonClickedEvents()
    handleElementsLibraryElementButtonClickedEvents()
}

function placeMovableNodeAwayFromTheCamera(
    movableNode: MovableNode,
    distanceFromTheCamera: number,
): void {
    movableNode.position = Vector3.TransformCoordinates(
        new Vector3(0, 0, distanceFromTheCamera),
        experienceDesignerCamera.computeWorldMatrix().clone(),
    )
}

function handleElementsLibraryBuiltInElementButtonClickedEvents(): void {
    eventBus.on('elementsLibraryBuiltInElementButtonClicked', (data) => {
        const newMovableNodeDistanceFromTheCamera = 10
        const defaultMaterial = scene.getMaterialById(defaultMaterialId)!

        let newNode: Mesh | Light | null = null
        switch (data.elementType) {
            case 'plane':
                // For planes, we use boxes instead, since the first allow the camera
                // to go through them when colliding with the face opposite to the plane normals.
                newNode = CreateBox(
                    'Plane',
                    {
                        width: 2,
                        height: 2,
                        depth: 0.01,
                    },
                    scene,
                )
                break
            case 'cube':
                newNode = CreateBox(
                    'Cube',
                    {
                        size: 2,
                    },
                    scene,
                )
                break
            case 'disc':
                newNode = CreateDisc(
                    'Disc',
                    {
                        radius: 2,
                        tessellation: 64,
                        sideOrientation: Mesh.DOUBLESIDE,
                    },
                    scene,
                )
                break
            case 'sphere':
                newNode = CreateSphere(
                    'Sphere',
                    {
                        diameter: 2,
                        segments: 64,
                    },
                    scene,
                )
                break
            case 'cylinder':
                newNode = CreateCylinder(
                    'Cylinder',
                    {
                        diameter: 2,
                        height: 2,
                        tessellation: 48,
                    },
                    scene,
                )
                break
            case 'torus':
                newNode = CreateTorus(
                    'Torus',
                    {
                        diameter: 4,
                        thickness: 1,
                        tessellation: 32,
                    },
                    scene,
                )
                break
            case 'pointLight':
                newNode = new PointLight('Point light', Vector3.Zero(), scene)
                break
            case 'directionalLight':
                newNode = new DirectionalLight('Directional light', Vector3.Up(), scene)
                break
            case 'spotLight':
                newNode = new SpotLight(
                    'Spot light',
                    Vector3.Zero(),
                    Vector3.Up(),
                    degreesToRadians(30),
                    2,
                    scene,
                )
                break
            case 'hemisphericLight':
                newNode = new HemisphericLight('Hemispheric light', Vector3.Up(), scene)
                ;(newNode as HemisphericLight).groundColor = Color3.White()
                ;(newNode as HemisphericLight).diffuse = Color3.Black()
                break
        }

        if (newNode === null) {
            return
        }

        if (isNodeAMesh(newNode)) {
            ;(newNode as Mesh).material = defaultMaterial.clone(`${newNode.name} material`)
            ;(newNode as Mesh).checkCollisions = true
        }

        if (isNodeMovable(newNode)) {
            placeMovableNodeAwayFromTheCamera(
                newNode as MovableNode,
                newMovableNodeDistanceFromTheCamera,
            )
        }

        newNode.state = 'ELEMENT_ADDED_FROM_ELEMENTS_LIBRARY'
    })
}

function handleElementsLibraryElementButtonClickedEvents(): void {
    eventBus.on('elementsLibraryElementButtonClicked', (data) => {
        const assetsManager = new AssetsManager(scene)
        const meshTask = assetsManager.addMeshTask(
            `${data.elementName} load task`,
            '',
            '',
            data.element3DModelFilePath,
        )

        meshTask.onSuccess = (task) => {
            const loadedMesh = task.loadedMeshes[0]

            loadedMesh.setEnabled(false)
            loadedMesh.name =
                data.elementName.substring(0, data.elementName.lastIndexOf('.')) || data.elementName

            loadedMesh.rotationQuaternion = null
            ;(loadedMesh as Mesh).bakeCurrentTransformIntoVertices()
            ;(loadedMesh as Mesh).refreshBoundingInfo()
            createMeshMetadataWithNoTransformations(loadedMesh)
            buildMeshHierarchyBoundingInfo(loadedMesh)
            const loadedMeshBoundingBoxCenter = loadedMesh.getBoundingInfo().boundingBox.center
            loadedMesh.setPivotMatrix(
                Matrix.Translation(
                    -loadedMeshBoundingBoxCenter.x,
                    -loadedMeshBoundingBoxCenter.y,
                    -loadedMeshBoundingBoxCenter.z,
                ),
                false,
            )
            loadedMesh.computeWorldMatrix(true)

            const loadedMeshMaxDimension = getMeshMaxDimension(loadedMesh as Mesh)
            const loadedMeshMaxDimensionLimit = 10
            if (loadedMeshMaxDimension > loadedMeshMaxDimensionLimit) {
                scaleMeshUniformlyToReachDesiredMaxDimension(
                    loadedMesh as Mesh,
                    loadedMeshMaxDimensionLimit,
                    loadedMeshMaxDimension,
                )
            }

            loadedMesh.position = Vector3.TransformCoordinates(
                new Vector3(0, 0, 1 + loadedMeshMaxDimension),
                experienceDesignerCamera.computeWorldMatrix().clone(),
            )

            loadedMesh.checkCollisions = true
            for (const mesh of (loadedMesh as Mesh).getChildMeshes()) {
                mesh.checkCollisions = true
            }

            loadedMesh.setEnabled(true)
            setNodeAsActive(loadedMesh)
        }

        meshTask.onError = (task, message, exception) => {
            console.error(exception)
        }

        assetsManager
            .loadAsync()
            .then(() => {
                updateSceneNodesData()
            })
            .catch((reason) => {
                console.log(reason)
            })
    })
}

const emit = defineEmits<{
    playExperienceScene: [string]
}>()

function handlePlayExperienceCommandExecutedEvents(): void {
    eventBus.on('playExperienceCommandExecuted', () => {
        if (experienceDesignerStore.areThereSavingOrOpeningOperationsInProgress) {
            alert('Wait for the experience to be saved or opened first, before playing it.')
            return
        }

        experienceDesignerStore.areThereSavingOrOpeningOperationsInProgress = true

        experienceDesignerStore.status = 'Loading the experience...'

        setTimeout(() => {
            SceneSerializer.SerializeAsync(scene)
                .then((serializedScene) => {
                    const serializedSceneStringified = JSON.stringify(serializedScene)
                    emit('playExperienceScene', serializedSceneStringified)
                })
                .catch((error) => {
                    console.log(error)
                })
                .finally(() => {
                    experienceDesignerStore.status = 'Ready'

                    experienceDesignerStore.areThereSavingOrOpeningOperationsInProgress = false
                })
        })
    })
}

function handleCloseOrReloadBrowserTabRequestedEvents(): void {
    window.addEventListener('beforeunload', (e) => {
        if (
            experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave ||
            experienceDesignerStore.areThereSavingOrOpeningOperationsInProgress
        ) {
            e.preventDefault()
        }
    })
}

function openExperience(experienceFileWithHandle: FileWithHandle, resetSceneBeforeOpening = false) {
    engine.displayLoadingUI()

    if (resetSceneBeforeOpening) {
        resetScene()
    }

    createSystemMeshesAndGizmos()

    const experienceFileName = experienceFileWithHandle.name
    const experienceFileNameWithoutExtension =
        experienceFileName.substring(0, experienceFileName.lastIndexOf('.')) || experienceFileName
    experienceDesignerStore.experienceName = experienceFileNameWithoutExtension

    existingExperienceFileWithHandle = experienceFileWithHandle

    if (existingExperienceFileWithHandle.handle !== undefined) {
        existingExperienceFileSystemFileHandle = existingExperienceFileWithHandle.handle
    }

    experienceFileWithHandle
        .text()
        .then((stringifiedScene) => {
            return AppendSceneAsync(`data:${stringifiedScene}`, scene)
        })
        .then(() => {
            const sceneMetadata = scene.metadata as SceneMetadata

            const skyBoxMesh = scene.getMeshById(`${skyBoxId}_mesh`)!
            const skyBoxMeshMaterial = skyBoxMesh.material as BackgroundMaterial
            const skyBoxMeshMaterialDiffuseTexture = skyBoxMeshMaterial.diffuseTexture as Texture
            experienceDesignerStore.skyTextureSrc = skyBoxMeshMaterialDiffuseTexture.url!

            experienceDesignerCamera.position.set(
                sceneMetadata.experienceDesignerCameraPositionWhenExperienceWasLastSaved.x,
                sceneMetadata.experienceDesignerCameraPositionWhenExperienceWasLastSaved.y,
                sceneMetadata.experienceDesignerCameraPositionWhenExperienceWasLastSaved.z,
            )
            experienceDesignerCamera.rotation.set(
                sceneMetadata.experienceDesignerCameraRotationWhenExperienceWasLastSaved.x,
                sceneMetadata.experienceDesignerCameraRotationWhenExperienceWasLastSaved.y,
                sceneMetadata.experienceDesignerCameraRotationWhenExperienceWasLastSaved.z,
            )

            experiencePlayerCamera = scene.getCameraByName(
                experiencePlayerCameraName,
            ) as UniversalCamera
            experienceDesignerStore.experiencePlayerCameraProperties = {
                initialPosition: {
                    x: experiencePlayerCamera.position.x,
                    y: experiencePlayerCamera.position.z,
                    z: experiencePlayerCamera.position.y,
                },
                initialRotation: {
                    x: experiencePlayerCamera.rotation.x,
                    z: experiencePlayerCamera.rotation.y,
                },
                FOVDegrees: roundNumber(radiansToDegrees(experiencePlayerCamera.fov), 2),
                speed: experiencePlayerCamera.speed, // m/s
                inertiaPercentage: experiencePlayerCamera.inertia * 100,
                sensitivity: experiencePlayerCamera.angularSensibility,
            }
            experiencePlayerCameraGizmo!.camera = experiencePlayerCamera

            // Wait the next event cycle to give precedence to the experience player camera properties watchers
            setTimeout(() => {
                experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = false
                experienceDesignerStore.wasTheExperienceFileSavedAtLeastOnce = true

                // There's no need to call engine.hideLoadingUI(). AppendSceneAsync will take care
                // of hiding the loading UI when the appended scene is fully loaded.
            })
        })
        .catch((error) => {
            console.log(error)
        })
        .finally(() => {
            updateSceneNodesData()
            experienceDesignerStore.status = 'Ready'

            experienceDesignerStore.areThereSavingOrOpeningOperationsInProgress = false
        })
}

function handleOpenExperienceCommandExecutedEvents(): void {
    eventBus.on('openExperienceCommandExecuted', () => {
        if (experienceDesignerStore.areThereSavingOrOpeningOperationsInProgress) {
            return
        }

        if (experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave) {
            const openExperienceCommandConfirmed = confirm(
                'Any unsaved changes to the current experience will be lost.\nDo you want to open another experience?',
            )

            if (openExperienceCommandConfirmed === false) {
                return
            }
        }

        experienceDesignerStore.areThereSavingOrOpeningOperationsInProgress = true

        experienceDesignerStore.status = 'Busy'
        fileOpen({
            description: 'Mersive Experience',
            extensions: ['.mersive'],
        })
            .then((fileWithHandle) => {
                openExperience(fileWithHandle, true)
            })
            .catch((error) => {
                console.log(error)
                experienceDesignerStore.status = 'Ready'

                experienceDesignerStore.areThereSavingOrOpeningOperationsInProgress = false
            })
    })
}

let existingExperienceFileWithHandle: FileWithHandle | null = null
let existingExperienceFileSystemFileHandle: FileSystemFileHandle | null = null

function saveExperienceToFile(
    overwriteExistingFileIfItExists = true,
    onSaveSuccess?: () => void,
): void {
    if (experienceDesignerStore.areThereSavingOrOpeningOperationsInProgress) {
        return
    }

    experienceDesignerStore.areThereSavingOrOpeningOperationsInProgress = true

    experienceDesignerStore.status = 'Saving...'

    setTimeout(() => {
        const sceneMetadata = scene.metadata as SceneMetadata
        sceneMetadata.mersiveVersionWhenExperienceWasLastSaved =
            experienceDesignerStore.mersiveVersion
        sceneMetadata.experienceDesignerCameraPositionWhenExperienceWasLastSaved = {
            x: experienceDesignerCamera.position.x,
            y: experienceDesignerCamera.position.y,
            z: experienceDesignerCamera.position.z,
        }
        sceneMetadata.experienceDesignerCameraRotationWhenExperienceWasLastSaved = {
            x: experienceDesignerCamera.rotation.x,
            y: experienceDesignerCamera.rotation.y,
            z: experienceDesignerCamera.rotation.z,
        }

        SceneSerializer.SerializeAsync(scene)
            .then((serializedScene) => {
                const serializedSceneStringified = JSON.stringify(serializedScene)
                const blob = new Blob([serializedSceneStringified], { type: 'octet/stream' })

                let experienceFileNameWithoutExtensionPromptResult: string | null =
                    experienceDesignerStore.experienceName
                const isFileSystemAccessAPISupported = supported
                if (isFileSystemAccessAPISupported === false) {
                    experienceFileNameWithoutExtensionPromptResult = prompt(
                        'Type a name for the experience to save',
                        experienceDesignerStore.experienceName,
                    )

                    if (experienceFileNameWithoutExtensionPromptResult === null) {
                        const errorName = 'No name provided for the experience. Save cancelled.'
                        alert(errorName)
                        throw new Error(errorName)
                    }

                    experienceDesignerStore.experienceName =
                        experienceFileNameWithoutExtensionPromptResult
                }

                return fileSave(
                    blob,
                    {
                        fileName: `${experienceDesignerStore.experienceName}.mersive`,
                        extensions: ['.mersive'],
                    },
                    overwriteExistingFileIfItExists ? existingExperienceFileSystemFileHandle : null,
                )
            })
            .then((fileSystemFileHandle) => {
                if (fileSystemFileHandle === null) {
                    return null
                }

                existingExperienceFileSystemFileHandle = fileSystemFileHandle

                const experienceFileName = existingExperienceFileSystemFileHandle.name
                const experienceFileNameWithoutExtension =
                    experienceFileName.substring(0, experienceFileName.lastIndexOf('.')) ||
                    experienceFileName
                experienceDesignerStore.experienceName = experienceFileNameWithoutExtension

                return existingExperienceFileSystemFileHandle.getFile()
            })
            .then((file) => {
                if (file !== null) {
                    existingExperienceFileWithHandle = file

                    if (existingExperienceFileWithHandle.handle !== undefined) {
                        existingExperienceFileWithHandle.handle =
                            existingExperienceFileSystemFileHandle!
                    }
                }

                experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = false
                experienceDesignerStore.wasTheExperienceFileSavedAtLeastOnce = true

                experienceDesignerStore.status = 'Save completed'

                setTimeout(() => {
                    experienceDesignerStore.status = 'Ready'

                    experienceDesignerStore.areThereSavingOrOpeningOperationsInProgress = false

                    if (onSaveSuccess !== undefined) {
                        onSaveSuccess()
                    }
                }, 2000)
            })
            .catch((error) => {
                console.log(error)
                experienceDesignerStore.status = 'Ready'

                experienceDesignerStore.areThereSavingOrOpeningOperationsInProgress = false
            })
    })
}

function handleSaveExperienceCommandExecutedEvents(): void {
    eventBus.on('saveExperienceCommandExecuted', () => {
        saveExperienceToFile(true)
    })
}

function handleSaveExperienceAsCommandExecutedEvents(): void {
    eventBus.on('saveExperienceAsCommandExecuted', () => {
        saveExperienceToFile(false)
    })
}

function resetScene(): void {
    resetActiveNode()
    experienceDesignerStore.reset()

    experiencePlayerCamera.dispose()
    experiencePlayerCameraGizmo!.dispose()
    experiencePlayerCameraGizmo = null

    scene.environmentTexture!.dispose()
    _3DViewportGrid!.disposeMaterialAndOpacityTexture()
    scene.getMaterialById(defaultMaterialId)?.dispose(true, true)

    /**
     * @see https://forum.babylonjs.com/t/browser-turned-black-for-a-few-seconds-then-restored/46447/5
     */
    while (scene.meshes.length) {
        const mesh = scene.meshes[0]
        mesh.dispose(true, true)
    }

    while (scene.transformNodes.length) {
        const transformNode = scene.transformNodes[0]
        transformNode.dispose(true, true)
    }

    while (scene.lights.length) {
        const light = scene.lights[0]
        light.dispose(true, true)
    }

    for (const shadowGeneratorId in shadowsGeneratorsBuffer) {
        shadowsGeneratorsBuffer[shadowGeneratorId].dispose()
    }
    shadowsGeneratorsBuffer = {}

    // Doing this would dispose special BabylonJS materials such as 'colorShader',
    // 'colorShaderOccQuery' and possibly others.
    // while (scene.materials.length) {
    //     const material = scene.materials[0]
    //     material.dispose(true, true)
    // }

    // Doing this causes unexpected behaviors, like invisible textures for imported GLB 3D models
    // when opening an experience, then creating a new one and then re-opening the same experience.
    // while (scene.textures.length) {
    //     const texture = scene.textures[0]
    //     texture.dispose()
    // }

    experienceDesignerCamera.position = Vector3.Zero()
    experienceDesignerCamera.rotation = Vector3.Zero()
}

function handleCreateNewExperienceCommandExecutedEvents(): void {
    eventBus.on('createNewExperienceCommandExecuted', () => {
        if (experienceDesignerStore.isCreateNewExperienceOperationInProgress) {
            return
        }

        if (experienceDesignerStore.areThereSavingOrOpeningOperationsInProgress) {
            return
        }

        if (
            experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave === false &&
            experienceDesignerStore.wasTheExperienceFileSavedAtLeastOnce === false
        ) {
            return
        }

        if (experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave) {
            const createNewExperienceCommandConfirmed = confirm(
                'Any unsaved changes to the current experience will be lost.\nDo you want to create a new experience?',
            )

            if (createNewExperienceCommandConfirmed === false) {
                return
            }
        }

        experienceDesignerStore.isCreateNewExperienceOperationInProgress = true

        existingExperienceFileWithHandle = null
        existingExperienceFileSystemFileHandle = null

        experienceDesignerStore.status = 'Busy'
        areStatisticsUpdatesEnabled = false

        resetScene()
        setupDefaultScene()

        experienceDesignerStore.status = 'Ready'
        areStatisticsUpdatesEnabled = true

        // Wait the next event cycle to give precedence to the experience player camera properties watchers
        setTimeout(() => {
            experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = false
            experienceDesignerStore.wasTheExperienceFileSavedAtLeastOnce = false
            experienceDesignerStore.isCreateNewExperienceOperationInProgress = false
            experienceDesignerStore.areThereSavingOrOpeningOperationsInProgress = false
        })
    })
}

function handleElementExaminationScreenClosedEvents(): void {
    eventBus.on('elementExaminationScreenClosed', (data) => {
        ;(activeNode!.metadata as MeshMetadata).examinationScreenData =
            data.currentElementMetadata!.examinationScreenData

        // Delete the existing POIs of the active node,
        // before adding the (possibly) updated or added ones.
        const activeNodePOIs = activeNode!.getChildMeshes(true, (node) => {
            return isNodeAPointOfInterest(node)
        })
        for (const POI of activeNodePOIs) {
            POI.dispose()
        }

        if (data.currentElementPOIsSerializedStringified!.length > 0) {
            for (const serializedStringifiedPOI of data.currentElementPOIsSerializedStringified!) {
                LoadAssetContainerAsync(`data:${serializedStringifiedPOI}`, scene)
                    .then((assetContainer) => {
                        for (const POI of assetContainer.meshes) {
                            POI.setEnabled(false)
                            POI.state = 'JUST_ADDED_POI'
                        }

                        assetContainer.addAllToScene()
                    })
                    .catch((reason) => {
                        console.log(reason)
                    })
            }
        }

        experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
    })
}

function handleResetActiveElementDimensionsButtonClickEvents(): void {
    eventBus.on('resetActiveElementDimensionsButtonClicked', () => {
        experienceDesignerStore.lockAspectRatioModeEnabled = false

        transformationMesh!.scaling.divideInPlace(
            new Vector3(
                Math.abs(transformationMesh!.scaling.x),
                Math.abs(transformationMesh!.scaling.y),
                Math.abs(transformationMesh!.scaling.z),
            ),
        )

        transformationMesh!.computeWorldMatrix(true)

        const activeMeshMaxDimension = getMeshMaxDimension(activeNode as Mesh)
        const activeMeshMaxDimensionLimit = 10
        if (activeMeshMaxDimension > activeMeshMaxDimensionLimit) {
            scaleMeshUniformlyToReachDesiredMaxDimension(
                transformationMesh!,
                activeMeshMaxDimensionLimit,
                activeMeshMaxDimension,
            )
        }
    })
}

function handleResetActiveElementRotationButtonClickEvents(): void {
    eventBus.on('resetActiveElementRotationButtonClicked', () => {
        transformationMesh!.rotation.set(0, 0, 0)
    })
}

function handleWindowResizeEvents(): void {
    // Resize the viewport if the browser window size changes
    window.addEventListener('resize', () => {
        engine.resize()
    })
}

// TODO: re-write this method using getCameraFramingHorizontalAxis and using the same
//       approach used for translating nodes in handleDuplicated/CopiedNode
async function process3DModelsFiles(files: File[]): Promise<void> {
    try {
        for (const file of files) {
            if (file.name.endsWith('.glb') === false) {
                throw new Error(`${file.name} doesn't have an allowed extension. It must be .glb.`)
            }
        }

        // Compute the translation axis for placing multiple imported meshes
        // based on the camera rotation, in such a way that they will appear
        // to the right of the camera framing.
        const translationAxis = new Vector3()
        let componentToTranslate: 'x' | 'z' = 'x'

        const cameraYRotationNormalized = normalizeAngleFromRadiansInDegrees(
            experienceDesignerCamera.rotation.y,
        )
        if (
            (cameraYRotationNormalized >= 0 && cameraYRotationNormalized <= 45) ||
            (cameraYRotationNormalized >= 315 && cameraYRotationNormalized <= 360)
        ) {
            translationAxis.set(1, 0, 0)
        } else if (cameraYRotationNormalized > 45 && cameraYRotationNormalized <= 135) {
            translationAxis.set(0, 0, -1)
            componentToTranslate = 'z'
        } else if (cameraYRotationNormalized > 135 && cameraYRotationNormalized <= 225) {
            translationAxis.set(-1, 0, 0)
        } else if (cameraYRotationNormalized > 225 && cameraYRotationNormalized < 315) {
            translationAxis.set(0, 0, 1)
            componentToTranslate = 'z'
        }

        let previousTranslationAmount = 0
        let previousComponentToTranslateMeshDimension: number | null = null
        const distanceBetweenMeshes = 2

        const assetsManager = new AssetsManager(scene)
        for (const file of files) {
            const meshTask = assetsManager.addMeshTask(`${file.name} load task`, '', '', file)

            meshTask.onSuccess = (task) => {
                // console.log('meshTask.onSuccess', task)
                // The first loaded mesh is ALWAYS the root node (__root__)
                const loadedMesh = task.loadedMeshes[0]

                loadedMesh.setEnabled(false)
                loadedMesh.name = file.name.substring(0, file.name.lastIndexOf('.')) || file.name

                // Set rotation quaternion to null to allow using only rotation property
                loadedMesh.rotationQuaternion = null

                // Update the root node vertices in a manner that the scaling is 1
                // for each component, while preserving the initial configuration.
                // In this way, the root node (which is a mesh) has a uniform scaling, and it's
                // strictly required to perform some operations in a proper way, like parenting
                // the point of interests to the elements which they belong while keeping the
                // same position and rotation.
                ;(loadedMesh as Mesh).bakeCurrentTransformIntoVertices()
                ;(loadedMesh as Mesh).refreshBoundingInfo()

                createMeshMetadataWithNoTransformations(loadedMesh)
                buildMeshHierarchyBoundingInfo(loadedMesh)

                // Ensure the center of transformations (pivot) of the root mesh is located
                // in the mesh center (considering the child meshes, too)
                const loadedMeshBoundingBoxCenter = loadedMesh.getBoundingInfo().boundingBox.center
                loadedMesh.setPivotMatrix(
                    Matrix.Translation(
                        -loadedMeshBoundingBoxCenter.x,
                        -loadedMeshBoundingBoxCenter.y,
                        -loadedMeshBoundingBoxCenter.z,
                    ),
                    false,
                )

                // Update the world matrix of the loaded mesh after setting the pivot
                loadedMesh.computeWorldMatrix(true)

                // Limit the loaded mesh max dimension to 10 m, if needed,
                // by applying a uniform scaling
                const loadedMeshMaxDimension = getMeshMaxDimension(loadedMesh as Mesh)
                const loadedMeshMaxDimensionLimit = 10
                if (loadedMeshMaxDimension > loadedMeshMaxDimensionLimit) {
                    scaleMeshUniformlyToReachDesiredMaxDimension(
                        loadedMesh as Mesh,
                        loadedMeshMaxDimensionLimit,
                        loadedMeshMaxDimension,
                    )
                }

                // Place the mesh away from the camera current local forward axis
                loadedMesh.position = Vector3.TransformCoordinates(
                    new Vector3(0, 0, 10 + loadedMeshMaxDimensionLimit),
                    experienceDesignerCamera.computeWorldMatrix().clone(),
                )

                const componentToTranslateMeshDimension =
                    getMeshDimensionsVector(loadedMesh)[componentToTranslate]

                // The first loaded mesh it's not always the one associated with the index 0
                // of the for...of loop.
                // For example, the first mesh task can be the last to finish.
                // So, to check if the current loaded mesh is the first loaded or not,
                // we have to use a variable which is initially null and that will be set
                // in the future as other meshes are loaded, like this.
                if (previousComponentToTranslateMeshDimension !== null) {
                    // Distance each loaded mesh from each other, when two or more 3D models
                    // are imported at the same time

                    const translationAmount =
                        (componentToTranslateMeshDimension +
                            previousComponentToTranslateMeshDimension) /
                            2 +
                        previousTranslationAmount +
                        distanceBetweenMeshes

                    // Ensure the world matrix of the loaded mesh is updated before
                    // translating it
                    loadedMesh.computeWorldMatrix(true)

                    // When translating a mesh, we have to take its scaling into account
                    // for the 'distance' parameter, dividing it by the mesh scaling.
                    // For example, if we move a mesh along its local x axis by an amount
                    // of 10 units and the mesh has a scaling of 0.01 for its x component,
                    // then the effective translation amount would be 10 * 0.01 = (0.1).
                    // This happens because the 'distance' parameter actually says:
                    // "move the mesh by an amount equal to 'distance' times its scaling", so the
                    // 'distance' amount is not expressed in space units, but rahter in
                    // 'mesh scaling' units.
                    // To avoid that division, we can set the scaling of the mesh to 1,
                    // then do the translation and finally restoring the initial scaling.
                    // Also, take into account the scaling z component, if it's negative.
                    loadedMesh.translate(
                        translationAxis,
                        (translationAmount / loadedMesh.scaling[componentToTranslate]) *
                            Math.sign(loadedMesh.scaling.z),
                    )

                    previousTranslationAmount = translationAmount
                }

                previousComponentToTranslateMeshDimension = componentToTranslateMeshDimension

                loadedMesh.checkCollisions = true
                for (const mesh of (loadedMesh as Mesh).getChildMeshes()) {
                    mesh.checkCollisions = true
                }

                loadedMesh.setEnabled(true)
            }

            meshTask.onError = (task, message, exception) => {
                console.error(exception)
            }
        }

        await assetsManager.loadAsync()

        // assetsManager.onFinish = (tasks) => {
        //     console.log('assetsManager.onFinish', tasks)
        // }

        // assetsManager.onProgress = (remainingCount, totalCount, task) => {
        //     console.log('assetsManager.onProgress', remainingCount, totalCount, task)
        // }

        updateSceneNodesData()
        // engine.hideLoadingUI()
        experienceDesignerStore.status = 'Ready'
    } catch (excpetion) {
        // TODO: show a modal with the error message
        console.log('exception', excpetion)
    }
}

function handleImport3DModelCommandExecutedEvents(): void {
    eventBus.on('import3DModelCommandExecuted', () => {
        if (experienceDesignerStore.areThereSavingOrOpeningOperationsInProgress) {
            return
        }

        experienceDesignerStore.status = 'Busy'
        fileOpen({
            description: '3D Models',
            extensions: ['.glb'],
            multiple: true,
        })
            .then((filesWithHandles) => {
                void process3DModelsFiles(filesWithHandles as File[])

                experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
            })
            .catch((error) => {
                // TODO: display a modal with the error reason.
                console.log(error)
                experienceDesignerStore.status = 'Ready'
                // engine.hideLoadingUI()
            })
    })
}

function handleOutlinerNodeRenamedEvents(): void {
    eventBus.on('outlinerNodeRenamed', (data) => {
        scene.getNodeById(data.renamedNodeData.nodeToRenameId)!.name = data.renamedNodeData.newName
        updateSceneNodesData()

        experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
    })
}

function handleDuplicateNodeEvents(): void {
    eventBus.on('duplicateActiveElementCommandExecuted', () => {
        if (activeNode === null) {
            return
        }

        const duplicatedNode = activeNode.clone(`${activeNode.name} copy`, null)!

        const distanceFromPreviousNode = 2
        const translationAxis = getCameraFramingHorizontalAxis(experienceDesignerCamera)

        if (isNodeAMesh(duplicatedNode)) {
            const duplicatedMesh = duplicatedNode as Mesh
            duplicatedMesh.makeGeometryUnique()
            const duplicatedMeshDimensionsVector = getMeshDimensionsVector(duplicatedMesh)

            if (duplicatedMesh.material !== null) {
                duplicatedMesh.material = duplicatedMesh.material.clone(
                    `${duplicatedMesh.material.name} copy`,
                )
            }

            if (duplicatedMesh.metadata !== null) {
                duplicatedMesh.metadata = { ...duplicatedMesh.metadata }
            }

            duplicatedMesh.position.addInPlace(
                translationAxis.multiplyByFloats(
                    duplicatedMeshDimensionsVector.x + distanceFromPreviousNode,
                    duplicatedMeshDimensionsVector.y + distanceFromPreviousNode,
                    duplicatedMeshDimensionsVector.z + distanceFromPreviousNode,
                ),
            )
        } else if (isNodeAMovableLight(duplicatedNode)) {
            // REMARK: we can translate meshes, too, with this approach, without using
            // the translate method
            // REMARK: we can also move and rotate meshes with arrows and pageup/down
            //       with this approach
            ;(duplicatedNode as MovableNode).position.addInPlace(
                translationAxis.multiplyByFloats(
                    distanceFromPreviousNode,
                    distanceFromPreviousNode,
                    distanceFromPreviousNode,
                ),
            )
        }

        if (isNodeADirectionableLight(duplicatedNode)) {
            const duplicatedDirectionableLightMetadata =
                duplicatedNode.metadata as DirectionableLightMetadata

            if (duplicatedDirectionableLightMetadata?.directionPointMeshGizmoPosition) {
                const directionPointMeshGizmoPosition = new Vector3(
                    duplicatedDirectionableLightMetadata.directionPointMeshGizmoPosition.x,
                    duplicatedDirectionableLightMetadata.directionPointMeshGizmoPosition.y,
                    duplicatedDirectionableLightMetadata.directionPointMeshGizmoPosition.z,
                )

                const newDirectionPointMeshGizmoPosition = directionPointMeshGizmoPosition.add(
                    translationAxis.multiplyByFloats(
                        distanceFromPreviousNode,
                        distanceFromPreviousNode,
                        distanceFromPreviousNode,
                    ),
                )

                // The metadata of a cloned node must be entirely re-assigned,
                // otherwise we'll keep accessing the metadata of the source node.
                duplicatedNode.metadata = {
                    directionPointMeshGizmoPosition: {
                        x: newDirectionPointMeshGizmoPosition.x,
                        y: newDirectionPointMeshGizmoPosition.y,
                        z: newDirectionPointMeshGizmoPosition.z,
                    },
                } as DirectionableLightMetadata
            }
        }

        duplicatedNode.id = duplicatedNode.uniqueId.toString()
        setNodeAsActive(duplicatedNode)

        updateSceneNodesData()

        experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
    })
}

function handleCopyActiveNodeEvents(): void {
    eventBus.on('copyActiveElementCommandExecuted', () => {
        if (activeNode === null) {
            return
        }

        // On consecutive copy commands, dispose the currently copied node and its material
        // (if it exists) and clear their references before copying another node.
        // Without this, repeated copy commands will create new nodes and materials over and over.
        if (copiedNode !== null) {
            if (isNodeAMesh(copiedNode)) {
                const copiedMesh = copiedNode as Mesh

                if (copiedMesh.material !== null) {
                    copiedMesh.material.dispose()
                    copiedMesh.material = null
                }
            }
            copiedNode.dispose()
            copiedNode = null
        }

        copyNode(activeNode)

        experienceDesignerStore.isPasteEnabled = true
        updateSceneNodesData()
    })
}

function handlePasteNodeEvents(): void {
    eventBus.on('pasteElementCommandExecuted', () => {
        if (copiedNode === null) {
            return
        }

        pasteCopiedNode()
        setNodeAsActive(copiedNode)

        // We need this to paste the same node again if the user repeats the paste command
        // without copying a new node.
        // Without this, the following will happen in this scenario:
        // 1. the user executes the paste command, which means copiedNode becomes enabled
        //    and also becomes the active node
        // 2. the user executes, again, the paste command, but this operation just enables
        //    copiedNode and sets it as the active node
        //    => so no copy is made at all, hence this is why we need to copy again copiedNode.
        //
        // We also need this to paste the same node again in case the 'pasted' node is deleted
        // and the user repeat the paste command without copying a new node.
        // Without this, the following will happen in this scenario:
        // 1. the user executes the paste command
        // 2. the user deletes the newly pasted node, but that node is copiedNode,
        //    which gets disposed and set to null
        // 3. the user executes, again, the paste command
        //    => ERROR: since copiedNode has been deleted (disposed) and is null,
        //              it wouldn't be possible to call any method on it (such as setEnabled),
        //              and this will throw fatal errors.
        copyNode(copiedNode)

        updateSceneNodesData()
    })
}

function handleMeshAddedToSceneEvents(): void {
    // scene.onNewMeshAddedObservable.add((addedMesh, eventState) => {
    scene.onNewMeshAddedObservable.add((newMesh) => {
        // Initialize the metadata property with an empty object, if it has not already been set
        if (newMesh.metadata === null) {
            newMesh.metadata = {}
        }

        if (isNodeAPointOfInterest(newMesh)) {
            if (newMesh.state == 'JUST_ADDED_POI') {
                // There's no need to reset the rotation of the active node
                // before setting the POI's parent to the active node and
                // then restoring the previous rotation after having done it:
                // infact, the local position of a node is not affected
                // by its parent's rotation.
                // So, all the POIs added to a node in its examination screen
                // will have the same exact position, rotation and scaling
                // in the experience scene, too.
                newMesh.parent = activeNode
            }
        }

        if (
            !systemMeshesIds.includes(newMesh.id) &&
            !(newMesh.parent !== null && systemMeshesIds.includes(newMesh.parent.id))
        ) {
            newMesh.id = newMesh.uniqueId.toString()
            ;(newMesh as Mesh).receiveShadows = true
            for (const light of scene.lights) {
                if (isNodeAMovableLight(light) === false) {
                    continue
                }

                const movableLight = light as MovableLight

                if (shadowsGeneratorsBuffer[movableLight.id] === undefined) {
                    createShadowsGenerator(movableLight)
                }

                // addShadowCaster adds the mesh to shadow casters only if it's not already present
                shadowsGeneratorsBuffer[movableLight.id].addShadowCaster(newMesh)
            }
        }

        // Process the mesh further and update scene nodes data only
        // if it's a root node (this is needed for imported meshes and POIs).
        if (newMesh.parent !== null) {
            return
        }

        if (!systemMeshesIds.includes(newMesh.id)) {
            const newMeshIsEnabledInitialValue = newMesh.isEnabled(false)
            newMesh.setEnabled(false)
            createMeshMetadataWithNoTransformations(newMesh)
            buildMeshHierarchyBoundingInfo(newMesh)

            if (newMesh.state != 'COPIED_NODE') {
                newMesh.setEnabled(newMeshIsEnabledInitialValue)
            }
        }

        if (newMesh.state === 'ELEMENT_ADDED_FROM_ELEMENTS_LIBRARY') {
            // Wait the next event cycle to set the node as active to fix the editor inputs
            // initial empty (and invalid) values when no active node is already set, which
            // triggers a showy transition from the 'invalid' to 'valid' state
            // (red border color to no border color)
            setTimeout(() => {
                setNodeAsActive(newMesh)
            })
        }

        updateSceneNodesData()
    })
}

function handleMeshRemovedFromSceneEvents(): void {
    // scene.onMeshRemovedObservable.add((removedMesh, eventState) => {
    scene.onMeshRemovedObservable.add(() => {
        updateSceneNodesData()
    })
}

function handleLightAddedToSceneEvents(): void {
    // scene.onNewLightAddedObservable.add((addedLight, eventState) => {
    scene.onNewLightAddedObservable.add((newLight) => {
        // Initialize the metadata property with an empty object, if it has not already been set
        if (newLight.metadata === null) {
            newLight.metadata = {}
        }

        newLight.id = newLight.uniqueId.toString()

        // Point and spot lights will use INTENSITYMODE_LUMINOUSINTENSITY (cd)
        // Diretional and hemispheric lights will use INTENSITYMODE_ILLUMINANCE (lux)
        newLight.intensityMode = Light.INTENSITYMODE_AUTOMATIC

        if (isNodeADirectionableLight(newLight)) {
            const directionableLight = newLight as DirectionableLight

            // Store the direction point position in the directionable light metadata,
            // if it has never been set.
            const directionableLightMetadata =
                directionableLight.metadata as DirectionableLightMetadata
            if (directionableLightMetadata?.directionPointMeshGizmoPosition === undefined) {
                if (isNodeAMovableLight(directionableLight)) {
                    const directionableLightPositionX = (directionableLight as MovableLight)
                        .position.x
                    const directionableLightPositionY = (directionableLight as MovableLight)
                        .position.y
                    const directionableLightPositionZ = (directionableLight as MovableLight)
                        .position.z

                    directionableLightMetadata.directionPointMeshGizmoPosition = {
                        x: directionableLightPositionX + directionableLight.direction.x,
                        y: directionableLightPositionY + directionableLight.direction.y,
                        z: directionableLightPositionZ + directionableLight.direction.z,
                    }
                } else {
                    directionableLightMetadata.directionPointMeshGizmoPosition = {
                        x: directionableLight.direction.x,
                        y: directionableLight.direction.y,
                        z: directionableLight.direction.z,
                    }
                }
            }
        }

        if (isNodeAMovableLight(newLight)) {
            const newMovableLight = newLight as MovableLight
            newMovableLight.shadowEnabled = true

            if (shadowsGeneratorsBuffer[newMovableLight.id] === undefined) {
                createShadowsGenerator(newMovableLight)
            }

            for (const mesh of scene.meshes) {
                if (
                    systemMeshesIds.includes(mesh.id) ||
                    (mesh.parent !== null && systemMeshesIds.includes(mesh.parent.id))
                ) {
                    continue
                }

                // addShadowCaster adds the mesh to shadow casters only if it's not already present
                shadowsGeneratorsBuffer[newMovableLight.id].addShadowCaster(mesh)
            }
        }

        if (newLight.state === 'ELEMENT_ADDED_FROM_ELEMENTS_LIBRARY') {
            // Wait the next event cycle to set the node as active to fix the editor inputs
            // initial empty (and invalid) values when no active node is already set, which
            // triggers a showy transition from the 'invalid' to 'valid' state
            // (red border color to no border color)
            setTimeout(() => {
                setNodeAsActive(newLight)
            })
        }

        updateSceneNodesData()
    })
}

// REMARK: ShadowGenerator should be called ShadowsGenerator
// TODO: fix duplicate shadows generators when adding meshes or lights
function createShadowsGenerator(light: IShadowLight): void {
    const shadowsGenerator = new ShadowGenerator(1024, light)
    shadowsGenerator.usePercentageCloserFiltering = true
    shadowsGenerator.filteringQuality = 1
    shadowsGenerator.transparencyShadow = true
    shadowsGeneratorsBuffer[light.id] = shadowsGenerator
}

function handleLightRemovedFromSceneEvents(): void {
    // scene.onLightRemovedObservable.add((removedLight, eventState) => {
    scene.onLightRemovedObservable.add(() => {
        updateSceneNodesData()
    })
}

function handleNodeAddedOrRemovedToSceneEvents(): void {
    handleMeshAddedToSceneEvents()
    handleMeshRemovedFromSceneEvents()
    handleLightAddedToSceneEvents()
    handleLightRemovedFromSceneEvents()
}

function handleMaterialAddedToSceneEvents(): void {
    scene.onNewMaterialAddedObservable.add((newMaterial) => {
        if (newMaterial.id != defaultMaterialId) {
            newMaterial.id = newMaterial.uniqueId.toString()
        }
    })
}

// DEBUG
// function handleToggleBabylonJSDebuggerEvents(keyboardEvent: KeyboardEvent): void {
//     if (keyboardEvent.ctrlKey && keyboardEvent.altKey && keyboardEvent.key.toLowerCase() == 'i') {
//         if (scene.debugLayer.isVisible()) {
//             scene.debugLayer.hide()
//         } else {
//             void scene.debugLayer.show()
//         }
//     }
// }

function handleDeactivateActiveNodeEvents(keyboardEvent: KeyboardEvent): void {
    if (keyboardEvent.key.toLowerCase() == 'escape') {
        resetActiveNode()
    }
}

// TODO: re-write this method using getCameraFramingHorizontalAxis and using the same
//       approach used for translating nodes in handleDuplicated/CopiedNode
function handleMoveActiveNodeEvents(keyboardEvent: KeyboardEvent): void {
    if (activeNode === null) {
        return
    }

    if (!isNodeMovable(activeNode)) {
        return
    }

    if (keyboardEvent.ctrlKey === false) {
        const cameraYRotationNormalized = normalizeAngleFromRadiansInDegrees(
            experienceDesignerCamera.rotation.y,
        )

        let translationAmount = 1
        if (keyboardEvent.shiftKey) {
            translationAmount = 5
        } else if (keyboardEvent.altKey) {
            translationAmount = 0.2
        }

        let forwardTranslationCoordinate: PlaneCoordinate = 'x'
        let forwardTranslationAmount = translationAmount
        let rightTranslationCoordinate: PlaneCoordinate = 'x'
        let rightTranslationAmount = translationAmount

        if (
            (cameraYRotationNormalized >= 0 && cameraYRotationNormalized <= 45) ||
            (cameraYRotationNormalized >= 315 && cameraYRotationNormalized <= 360)
        ) {
            forwardTranslationCoordinate = 'z'
            forwardTranslationAmount = translationAmount
            rightTranslationCoordinate = 'x'
            rightTranslationAmount = translationAmount
        } else if (cameraYRotationNormalized > 45 && cameraYRotationNormalized <= 135) {
            forwardTranslationCoordinate = 'x'
            forwardTranslationAmount = translationAmount
            rightTranslationCoordinate = 'z'
            rightTranslationAmount = -translationAmount
        } else if (cameraYRotationNormalized > 135 && cameraYRotationNormalized <= 225) {
            forwardTranslationCoordinate = 'z'
            forwardTranslationAmount = -translationAmount
            rightTranslationCoordinate = 'x'
            rightTranslationAmount = -translationAmount
        } else if (cameraYRotationNormalized > 225 && cameraYRotationNormalized < 315) {
            forwardTranslationCoordinate = 'x'
            forwardTranslationAmount = -translationAmount
            rightTranslationCoordinate = 'z'
            rightTranslationAmount = translationAmount
        }

        switch (keyboardEvent.key.toLowerCase()) {
            case 'arrowup':
                transformationMesh!.position[forwardTranslationCoordinate] +=
                    forwardTranslationAmount
                break
            case 'arrowright':
                transformationMesh!.position[rightTranslationCoordinate] += rightTranslationAmount
                break
            case 'arrowdown':
                transformationMesh!.position[forwardTranslationCoordinate] -=
                    forwardTranslationAmount
                break
            case 'arrowleft':
                transformationMesh!.position[rightTranslationCoordinate] -= rightTranslationAmount
                break
            case 'pageup':
                transformationMesh!.position.y += translationAmount
                break
            case 'pagedown':
                transformationMesh!.position.y -= translationAmount
                break
            default:
                break
        }
    }
}

// TODO: re-write this method using getCameraFramingHorizontalAxis and using the same
//       approach used for translating nodes in handleDuplicated/CopiedNode
//       (but here rotate the node instead, obviously)
function handleRotateActiveNodeEvents(keyboardEvent: KeyboardEvent): void {
    if (activeNode === null) {
        return
    }

    // Rotation can be applied only to meshes
    if (!isNodeAMesh(activeNode)) {
        return
    }

    if (keyboardEvent.ctrlKey) {
        const cameraYRotationNormalized = normalizeAngleFromRadiansInDegrees(
            experienceDesignerCamera.rotation.y,
        )
        let rotationAmount = degreesToRadians(1)
        if (keyboardEvent.shiftKey) {
            rotationAmount = degreesToRadians(5)
        } else if (keyboardEvent.altKey) {
            rotationAmount = degreesToRadians(0.2)
        }

        let forwardRotationCoordinate: PlaneCoordinate = 'x'
        let forwardRotationAmount = rotationAmount
        let rightRotationCoordinate: PlaneCoordinate = 'x'
        let rightRotationAmount = rotationAmount

        if (
            (cameraYRotationNormalized >= 0 && cameraYRotationNormalized <= 45) ||
            (cameraYRotationNormalized >= 315 && cameraYRotationNormalized <= 360)
        ) {
            forwardRotationCoordinate = 'x'
            forwardRotationAmount = rotationAmount
            rightRotationCoordinate = 'y'
            rightRotationAmount = -rotationAmount
        } else if (cameraYRotationNormalized > 45 && cameraYRotationNormalized <= 135) {
            forwardRotationCoordinate = 'z'
            forwardRotationAmount = -rotationAmount
            rightRotationCoordinate = 'y'
            rightRotationAmount = -rotationAmount
        } else if (cameraYRotationNormalized > 135 && cameraYRotationNormalized <= 225) {
            forwardRotationCoordinate = 'x'
            forwardRotationAmount = -rotationAmount
            rightRotationCoordinate = 'y'
            rightRotationAmount = -rotationAmount
        } else if (cameraYRotationNormalized > 225 && cameraYRotationNormalized < 315) {
            forwardRotationCoordinate = 'z'
            forwardRotationAmount = rotationAmount
            rightRotationCoordinate = 'y'
            rightRotationAmount = -rotationAmount
        }

        switch (keyboardEvent.key.toLowerCase()) {
            case 'arrowup':
                transformationMesh!.rotation[forwardRotationCoordinate] += forwardRotationAmount
                break
            case 'arrowright':
                transformationMesh!.rotation[rightRotationCoordinate] += rightRotationAmount
                break
            case 'arrowdown':
                transformationMesh!.rotation[forwardRotationCoordinate] -= forwardRotationAmount
                break
            case 'arrowleft':
                transformationMesh!.rotation[rightRotationCoordinate] -= rightRotationAmount
                break
            case 'pageup':
                transformationMesh!.rotation.y += rotationAmount
                break
            case 'pagedown':
                transformationMesh!.rotation.y -= rotationAmount
                break
            default:
                break
        }
    }
}

function handleEnableTransformationGizmoSnapEvents(keyboardEvent: KeyboardEvent): void {
    if (keyboardEvent.shiftKey) {
        if (transformationMeshGizmoManager?.gizmos?.positionGizmo) {
            transformationMeshGizmoManager.gizmos.positionGizmo.snapDistance = 1
        }

        if (transformationMeshGizmoManager?.gizmos?.rotationGizmo) {
            transformationMeshGizmoManager.gizmos.rotationGizmo.snapDistance = degreesToRadians(5)
        }

        if (transformationMeshGizmoManager?.gizmos?.scaleGizmo) {
            if (transformationMeshGizmoManager.gizmos.scaleGizmo.isDragging === false) {
                transformationMeshGizmoSnapDistancesVector.set(
                    0.1 * (activeNode as AbstractMesh).scaling.x,
                    0.1 * (activeNode as AbstractMesh).scaling.y,
                    0.1 * (activeNode as AbstractMesh).scaling.z,
                )

                transformationMeshGizmoSnapSensitivitiesVector.set(
                    (activeNode as AbstractMesh).scaling.x,
                    (activeNode as AbstractMesh).scaling.y,
                    (activeNode as AbstractMesh).scaling.z,
                )
            }

            transformationMeshGizmoManager.gizmos.scaleGizmo.xGizmo.snapDistance =
                transformationMeshGizmoSnapDistancesVector.x
            transformationMeshGizmoManager.gizmos.scaleGizmo.yGizmo.snapDistance =
                transformationMeshGizmoSnapDistancesVector.y
            transformationMeshGizmoManager.gizmos.scaleGizmo.zGizmo.snapDistance =
                transformationMeshGizmoSnapDistancesVector.z

            transformationMeshGizmoManager.gizmos.scaleGizmo.xGizmo.sensitivity =
                transformationMeshGizmoSnapSensitivitiesVector.x
            transformationMeshGizmoManager.gizmos.scaleGizmo.yGizmo.sensitivity =
                transformationMeshGizmoSnapSensitivitiesVector.y
            transformationMeshGizmoManager.gizmos.scaleGizmo.zGizmo.sensitivity =
                transformationMeshGizmoSnapSensitivitiesVector.z
        }
    }
}

function handleDisableTransformationGizmoSnapEvents(keyboardEvent: KeyboardEvent): void {
    if (keyboardEvent.key.toLowerCase() == 'shift') {
        if (transformationMeshGizmoManager?.gizmos?.positionGizmo) {
            transformationMeshGizmoManager.gizmos.positionGizmo.snapDistance = 0
        }

        if (transformationMeshGizmoManager?.gizmos?.rotationGizmo) {
            transformationMeshGizmoManager.gizmos.rotationGizmo.snapDistance = 0
        }

        if (transformationMeshGizmoManager?.gizmos?.scaleGizmo) {
            transformationMeshGizmoManager.gizmos.scaleGizmo.snapDistance = 0
            transformationMeshGizmoManager.gizmos.scaleGizmo.xGizmo.sensitivity = 1
            transformationMeshGizmoManager.gizmos.scaleGizmo.yGizmo.sensitivity = 1
            transformationMeshGizmoManager.gizmos.scaleGizmo.zGizmo.sensitivity = 1
        }
    }
}

function handleKeyboardEvents(): void {
    handleKeyDownEvents()
    handleKeyUpEvents()
}

function handleConfigureExaminationScreenButtonClickEvents(): void {
    eventBus.on('configureExaminationScreenButtonClicked', () => {
        canvas.value!.blur()
        is3DViewportCanvasAboveUI.value = true
        experienceDesignerStore.isExperienceDesignerExaminationScreenShown = true
        eventBus.emit('elementExaminationScreenOpened')

        const activeMesh = activeNode as Mesh
        const previousActiveMeshPosition = activeMesh.position.clone()
        const previousActiveMeshRotation = activeMesh.rotation.clone()
        activeMesh.position = Vector3.Zero()
        activeMesh.rotation = Vector3.Zero()

        activeMesh.bakeCurrentTransformIntoVertices()
        activeMesh.refreshBoundingInfo()
        createMeshMetadataWithNoTransformations(activeMesh)
        buildMeshHierarchyBoundingInfo(activeMesh)

        // Ensure the center of transformations (pivot) of the root mesh is located
        // in the mesh center (considering the child meshes, too)
        const activeMeshBoundingBoxCenter = activeMesh.getBoundingInfo().boundingBox.center
        activeMesh.setPivotMatrix(
            Matrix.Translation(
                -activeMeshBoundingBoxCenter.x,
                -activeMeshBoundingBoxCenter.y,
                -activeMeshBoundingBoxCenter.z,
            ),
            false,
        )

        // Update the world matrix of the active mesh after setting the pivot
        activeMesh.computeWorldMatrix(true)

        activeMesh.position = previousActiveMeshPosition
        activeMesh.rotation = previousActiveMeshRotation

        transformationMesh!.position = activeMesh.position.clone()
        transformationMesh!.rotation = activeMesh.rotation.clone()
        transformationMesh!.scaling = activeMesh.scaling.clone()
        transformationMeshPreviousScaling = activeMesh.scaling.clone()
        transformationMesh!.computeWorldMatrix(true)

        // SerializeMesh is a synchronous operation, so the examination screen fade/blur-in
        // animation won't show until it finishes. To fix this, add a small delay before
        // serializing the active node: in this way, the animation will play first.
        setTimeout(() => {
            SceneSerializer.ClearCache()
            const serializedMeshStringified = JSON.stringify(
                SceneSerializer.SerializeMesh(activeNode, false, true),
            )

            eventBus.emit('elementExaminationScreenSerializeMeshFinished', {
                serializedMeshStringified: serializedMeshStringified,
            })
        }, 100)

        experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
    })
}

function handleKeyDownEvents(): void {
    window.addEventListener('keydown', (keyboardEvent) => {
        if (experienceDesignerStore.isExperienceDesignerExaminationScreenShown) {
            return
        }

        if (experiencePlayerStore.isExperiencePlayerExaminationScreenShown) {
            return
        }

        if (experienceDesignerStore.isPlayExperienceModeEnabled) {
            return
        }

        if (keyboardEvent.key.toLowerCase() == 'l') {
            console.log(activeNode)
        }

        // DEBUG
        // Ctrl+Alt+I
        // handleToggleBabylonJSDebuggerEvents(keyboardEvent)

        // Ignore keyboard events when typing in inputs (except for BabylonJS Debugger)
        if ((keyboardEvent.target as HTMLElement).tagName.toLowerCase() == 'input') {
            return
        }

        // Escape
        handleDeactivateActiveNodeEvents(keyboardEvent)

        // Delete or Backspace
        handleDeleteNodeEvents(keyboardEvent)

        // Arrows (optionally Shift and Alt)
        handleMoveActiveNodeEvents(keyboardEvent)

        // Ctrl + Arrows (optionally Shift and Alt)
        handleRotateActiveNodeEvents(keyboardEvent)

        // Press Shift to enable snapping on the Transformation Gizmo
        handleEnableTransformationGizmoSnapEvents(keyboardEvent)
    })
}

function handleKeyUpEvents(): void {
    window.addEventListener('keyup', (keyboardEvent) => {
        if (experienceDesignerStore.isExperienceDesignerExaminationScreenShown) {
            return
        }

        if (experiencePlayerStore.isExperiencePlayerExaminationScreenShown) {
            return
        }

        if (experienceDesignerStore.isPlayExperienceModeEnabled) {
            return
        }

        // Ignore keyboard events when typing in inputs (except for BabylonJS Debugger)
        if ((keyboardEvent.target as HTMLElement).tagName.toLowerCase() == 'input') {
            return
        }

        // Release Shift to disable snapping on the Transformation Gizmo
        handleDisableTransformationGizmoSnapEvents(keyboardEvent)
    })
}

function handleDeleteNodeEvents(keyboardEvent: KeyboardEvent): void {
    if (['delete', 'backspace'].includes(keyboardEvent.key.toLowerCase())) {
        if (activeNode === null) {
            return
        }

        activeNode.dispose()
        resetActiveNode()
    }
}

function handlePointerEvents(): void {
    scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type === PointerEventTypes.POINTERTAP) {
            // Only consider left clicks
            if (pointerInfo.event.button !== 0) {
                return
            }

            // pickInfo is never null, even when no point or mesh has been picked
            if (pointerInfo.pickInfo!.pickedPoint !== null) {
                const pickedPoint = pointerInfo.pickInfo!.pickedPoint

                if (
                    experienceDesignerStore.isSetActiveElementPositionToObjectPointModeEnabled &&
                    activeNode !== null
                ) {
                    let newYPosition = pickedPoint.y
                    if (isNodeAMesh(activeNode)) {
                        const meshHeight = getMeshDimensionsVector(activeNode as Mesh).y
                        newYPosition += meshHeight / 2
                    }

                    transformationMesh!.position.set(pickedPoint.x, newYPosition, pickedPoint.z)

                    transformationMesh!.computeWorldMatrix(true)
                    experienceDesignerStore.isSetActiveElementPositionToObjectPointModeEnabled =
                        false
                } else if (
                    experienceDesignerStore.isSetDirectionPointMeshPositionToObjectPointModeEnabled &&
                    activeNode !== null
                ) {
                    directionPointMesh!.position.set(pickedPoint.x, pickedPoint.y, pickedPoint.z)

                    directionPointMesh!.computeWorldMatrix(true)
                    experienceDesignerStore.isSetDirectionPointMeshPositionToObjectPointModeEnabled =
                        false
                } else if (
                    experienceDesignerStore.isSetExperiencePlayerCameraInitialPositionToObjectPointModeEnabled
                ) {
                    experienceDesignerStore.experiencePlayerCameraProperties.initialPosition = {
                        x: roundNumber(pickedPoint.x, 4),
                        y: roundNumber(pickedPoint.z, 4),
                        z: roundNumber(pickedPoint.y + 1.5, 4),
                    }

                    experienceDesignerStore.isSetExperiencePlayerCameraInitialPositionToObjectPointModeEnabled =
                        false

                    experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
                } else if (pointerInfo.pickInfo!.pickedMesh !== null) {
                    // Get the root node in case of meshes which contain other meshes
                    let pickedMeshRootNode: Node | null = null
                    if (pointerInfo.pickInfo!.pickedMesh.parent === null) {
                        pickedMeshRootNode = pointerInfo.pickInfo!.pickedMesh!
                    } else {
                        pickedMeshRootNode = pointerInfo.pickInfo!.pickedMesh.parent
                        while (pickedMeshRootNode.parent !== null) {
                            pickedMeshRootNode = pickedMeshRootNode.parent
                        }
                    }
                    setNodeAsActive(pickedMeshRootNode)
                }
            } else {
                resetActiveNode()
            }
        }
    })
}

function handleOutlinerNodeSelectedEvents(): void {
    eventBus.on('outlinerNodeSelected', (data) => {
        const selectedNode = scene.getNodeById(data.selectedNodeId)

        setNodeAsActive(selectedNode!)
    })
}

function handleOutlinerSceneSelectedEvents(): void {
    eventBus.on('outlinerSceneSelected', () => {
        resetActiveNode()
    })
}

function handleToggleNodeVisibilityEvents(): void {
    eventBus.on('nodeVisibilityChanged', (data) => {
        const node = scene.getNodeById(data.nodeVisibilityData.id)!
        node.setEnabled(data.nodeVisibilityData.isVisible)

        updateSceneNodesData()

        experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
    })
}

function isEditorInputValid(inputName: keyof INodeProperties, inputValue: unknown): boolean {
    // These inputs values must be numbers
    switch (inputName) {
        case 'positionX':
        case 'positionY':
        case 'positionZ':
        case 'rotationX':
        case 'rotationY':
        case 'rotationZ':
        case 'directionPointX':
        case 'directionPointY':
        case 'directionPointZ':
        case 'dimensionX':
        case 'dimensionY':
        case 'dimensionZ':
        case 'intensity':
            if (typeof inputValue == 'string' || isNaN(inputValue as number)) {
                return false
            }

            break
    }

    // These inputs values must be positives and can't be 0
    switch (inputName) {
        case 'dimensionX':
        case 'dimensionY':
        case 'dimensionZ':
            if ((inputValue as number) <= 0) {
                return false
            }

            break
    }

    // These inputs values must be positives or 0
    switch (inputName) {
        case 'intensity':
        case 'angleDegrees':
        case 'materialAlphaPercentage':
            if ((inputValue as number) < 0) {
                return false
            }

            break
    }

    // These inputs values must be booleans (false or true)
    switch (inputName) {
        case 'isExaminationScreenEnabled':
        case 'areCollisionsEnabled':
        case 'canReceiveShadows':
        case 'areShadowsEnabled':
            if (typeof inputValue != 'boolean') {
                return false
            }

            break
    }

    // These inputs values must be strings
    switch (inputName) {
        case 'diffuseColorHEX':
        case 'groundColorHEX':
        case 'materialDiffuseColorHEX':
        case 'materialEmissiveColorHEX':
            if (typeof inputValue != 'string') {
                return false
            }

            break
    }

    return true
}

function handleExperiencePlayerCameraPropertiesInputEvents(): void {
    // BabylonJS coordinate system is left handed (Y is up/down).
    // Mersive, instead, will use a right handed system (Z is up/down).
    // So, what is Y for BabylonJS, is Z for Mersive, and vice versa.
    // The position refers to the object's pivot.

    watch(
        () => experienceDesignerStore.experiencePlayerCameraProperties.initialPosition,
        (newInitialPosition) => {
            experiencePlayerCamera.position.set(
                Number(newInitialPosition.x),
                Number(newInitialPosition.z),
                Number(newInitialPosition.y),
            )

            if (experienceDesignerStore.isPreviewExperiencePlayerCameraSettingsModeEnabled) {
                experienceDesignerCamera.position = experiencePlayerCamera.position.clone()
            }

            experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
        },
        { deep: true },
    )

    watch(
        () => experienceDesignerStore.experiencePlayerCameraProperties.initialRotation,
        (newInitialRotation) => {
            experiencePlayerCamera.rotation.set(
                degreesToRadians(Number(newInitialRotation.x)),
                degreesToRadians(Number(newInitialRotation.z)),
                0, // The BabylonJS z component of the EP Camera Rotation will always be 0
            )

            if (experienceDesignerStore.isPreviewExperiencePlayerCameraSettingsModeEnabled) {
                experienceDesignerCamera.rotation = experiencePlayerCamera.rotation.clone()
            }

            experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
        },
        { deep: true },
    )

    watch(
        () => experienceDesignerStore.experiencePlayerCameraProperties.FOVDegrees,
        (newValue) => {
            experiencePlayerCamera.fov = degreesToRadians(Number(newValue))

            if (experienceDesignerStore.isPreviewExperiencePlayerCameraSettingsModeEnabled) {
                experienceDesignerCamera.fov = experiencePlayerCamera.fov
            }

            experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
        },
    )

    watch(
        () => experienceDesignerStore.experiencePlayerCameraProperties.speed,
        (newValue) => {
            experiencePlayerCamera.speed = Number(newValue)

            if (experienceDesignerStore.isPreviewExperiencePlayerCameraSettingsModeEnabled) {
                experienceDesignerCamera.setWalkingSpeed(experiencePlayerCamera.speed)
                experienceDesignerCamera.setSprintingSpeed(experiencePlayerCamera.speed * 2)
            }

            experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
        },
    )

    watch(
        () => experienceDesignerStore.experiencePlayerCameraProperties.inertiaPercentage,
        (newValue) => {
            experiencePlayerCamera.inertia = Number(newValue / 100)

            if (experienceDesignerStore.isPreviewExperiencePlayerCameraSettingsModeEnabled) {
                experienceDesignerCamera.inertia = experiencePlayerCamera.inertia
            }

            experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
        },
    )

    watch(
        () => experienceDesignerStore.experiencePlayerCameraProperties.sensitivity,
        (newValue) => {
            experiencePlayerCamera.angularSensibility = Number(newValue)

            if (experienceDesignerStore.isPreviewExperiencePlayerCameraSettingsModeEnabled) {
                experienceDesignerCamera.angularSensibility =
                    experiencePlayerCamera.angularSensibility
            }

            experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
        },
    )

    watch(
        () => experienceDesignerStore.isPreviewExperiencePlayerCameraSettingsModeEnabled,
        (isPreviewExperiencePlayerCameraSettingsModeEnabled) => {
            if (isPreviewExperiencePlayerCameraSettingsModeEnabled) {
                experienceDesignerCamera.position.set(
                    experienceDesignerStore.experiencePlayerCameraProperties.initialPosition.x,
                    experienceDesignerStore.experiencePlayerCameraProperties.initialPosition.z,
                    experienceDesignerStore.experiencePlayerCameraProperties.initialPosition.y,
                )

                experienceDesignerCamera.rotation.set(
                    degreesToRadians(
                        Number(
                            experienceDesignerStore.experiencePlayerCameraProperties.initialRotation
                                .x,
                        ),
                    ),
                    degreesToRadians(
                        Number(
                            experienceDesignerStore.experiencePlayerCameraProperties.initialRotation
                                .z,
                        ),
                    ),
                    0, // The BabylonJS z component of the EP Camera Rotation will always be 0
                )

                experienceDesignerCamera.fov = degreesToRadians(
                    experienceDesignerStore.experiencePlayerCameraProperties.FOVDegrees,
                )

                experienceDesignerCamera.setWalkingSpeed(
                    experienceDesignerStore.experiencePlayerCameraProperties.speed,
                )
                experienceDesignerCamera.setSprintingSpeed(
                    experienceDesignerStore.experiencePlayerCameraProperties.speed * 2,
                )

                experienceDesignerCamera.inertia =
                    experienceDesignerStore.experiencePlayerCameraProperties.inertiaPercentage / 100
                experienceDesignerCamera.angularSensibility =
                    experienceDesignerStore.experiencePlayerCameraProperties.sensitivity
            } else {
                experienceDesignerCamera.setWalkingSpeed(
                    experienceDesignerCamera.defaultWalkingSpeed,
                )
                experienceDesignerCamera.setSprintingSpeed(
                    experienceDesignerCamera.defaultSprintingSpeed,
                )
                experienceDesignerCamera.fov = experienceDesignerCamera.defaultFOV
                experienceDesignerCamera.inertia = experienceDesignerCamera.defaultInertia
                experienceDesignerCamera.angularSensibility =
                    experienceDesignerCamera.defaultAngularSensibility
            }

            experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
        },
        { deep: true },
    )
}

function handleUploadNewSceneSkyTextureButtonClickEvents(): void {
    eventBus.on('uploadNewSceneSkyTextureButtonClicked', () => {
        fileOpen({
            description: 'Image file',
            extensions: ['.jpg', '.png'],
        })
            .then((fileWithHandle) => {
                experienceDesignerStore.status = 'Busy'

                const skyBoxMesh = scene.getMeshById(`${skyBoxId}_mesh`)!
                const skyBoxMeshTexture = (skyBoxMesh.material as BackgroundMaterial)
                    .diffuseTexture!
                const blob = new Blob([fileWithHandle], { type: 'octet/stream' })

                const reader = new FileReader()
                reader.readAsDataURL(blob)
                reader.onloadend = () => {
                    const base64data = reader.result as string
                    experienceDesignerStore.skyTextureSrc = base64data
                    ;(skyBoxMeshTexture as Texture).updateURL(base64data, null, () => {
                        experienceDesignerStore.status = 'Ready'
                    })
                    skyBoxMeshTexture.gammaSpace = true

                    experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
                }
            })
            .catch((error) => {
                console.log(error)
            })
    })
}

function handleUploadNewSceneEnvironmentTextureButtonClickEvents(): void {
    eventBus.on('uploadNewSceneEnvironmentTextureButtonClicked', () => {
        fileOpen({
            description: 'Environment texture',
            extensions: ['.env'],
        })
            .then((fileWithHandle) => {
                experienceDesignerStore.status = 'Busy'

                const environmentTexture = scene.environmentTexture
                const blob = new Blob([fileWithHandle], { type: 'octet/stream' })

                const reader = new FileReader()
                reader.readAsDataURL(blob)
                reader.onloadend = () => {
                    const base64data = reader.result as string
                    ;(environmentTexture as CubeTexture).updateURL(base64data, '.env', () => {
                        experienceDesignerStore.status = 'Ready'
                    })

                    experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
                }
            })
            .catch((error) => {
                console.log(error)
            })
    })
}

function handleEditorInputEvents(): void {
    eventBus.on('editorInput', (data) => {
        const inputName = data.inputData.name
        const inputValue = data.inputData.value

        if (isEditorInputValid(inputName, inputValue) === false) {
            return
        }

        // BabylonJS coordinate system is left handed (Y is up/down).
        // Mersive, instead, will use a right handed system (Z is up/down).
        // So, what is Y for BabylonJS, is Z for Mersive, and vice versa.
        // The position refers to the object's pivot.
        switch (inputName) {
            case 'positionX':
                transformationMesh!.position.x = inputValue as number

                break
            case 'positionY':
                transformationMesh!.position.z = inputValue as number

                break
            case 'positionZ':
                transformationMesh!.position.y = inputValue as number

                break
            case 'rotationX':
                transformationMesh!.rotation.x = degreesToRadians(inputValue as number)

                break
            case 'rotationY':
                transformationMesh!.rotation.z = degreesToRadians(inputValue as number)

                break
            case 'rotationZ':
                transformationMesh!.rotation.y = degreesToRadians(inputValue as number)

                break
            case 'directionPointX':
                directionPointMesh!.position.x = inputValue as number

                break
            case 'directionPointY':
                directionPointMesh!.position.z = inputValue as number

                break
            case 'directionPointZ':
                directionPointMesh!.position.y = inputValue as number

                break
            case 'areShadowsEnabled':
                ;(activeNode as MovableLight).shadowEnabled = inputValue as boolean

                break
            case 'intensity':
                ;(activeNode as Light).intensity = inputValue as number

                break
            case 'diffuseColorHEX':
                ;(activeNode as Light).diffuse.fromHexString(inputValue as string)

                break
            case 'groundColorHEX':
                ;(activeNode as HemisphericLight).groundColor.fromHexString(inputValue as string)

                break
            case 'angleDegrees':
                ;(activeNode as SpotLight).angle = degreesToRadians(inputValue as number)

                break
        }

        if (isNodeAMesh(activeNode!)) {
            const nodeDimensionsVector = getMeshDimensionsVector(activeNode as AbstractMesh)

            switch (inputName) {
                case 'dimensionX':
                    transformationMesh!.scaling.x =
                        ((inputValue as number) * transformationMesh!.scaling.x) /
                        nodeDimensionsVector.x

                    break
                case 'dimensionY':
                    transformationMesh!.scaling.z =
                        ((inputValue as number) * transformationMesh!.scaling.z) /
                        nodeDimensionsVector.z

                    break
                case 'dimensionZ':
                    transformationMesh!.scaling.y =
                        ((inputValue as number) * transformationMesh!.scaling.y) /
                        nodeDimensionsVector.y

                    break
                case 'isExaminationScreenEnabled':
                    const activeNodeMetadata = activeNode!.metadata as MeshMetadata
                    activeNodeMetadata.isExaminationScreenEnabled = inputValue as boolean

                    break
                case 'areCollisionsEnabled':
                    ;(activeNode as Mesh).checkCollisions = inputValue as boolean

                    for (const mesh of (activeNode as Mesh).getChildMeshes()) {
                        mesh.checkCollisions = inputValue as boolean
                    }

                    break
                case 'canReceiveShadows':
                    ;(activeNode as Mesh).receiveShadows = inputValue as boolean

                    for (const mesh of (activeNode as Mesh).getChildMeshes()) {
                        mesh.receiveShadows = inputValue as boolean
                    }

                    break
                case 'materialDiffuseColorHEX':
                    const materialDiffuseColor = ((activeNode as Mesh).material as StandardMaterial)
                        ?.diffuseColor
                    if (materialDiffuseColor !== undefined) {
                        materialDiffuseColor.fromHexString(inputValue as string)
                    }

                    break
                case 'materialEmissiveColorHEX':
                    const materialEmissiveColor = (
                        (activeNode as Mesh).material as StandardMaterial
                    )?.emissiveColor
                    if (materialEmissiveColor !== undefined) {
                        materialEmissiveColor.fromHexString(inputValue as string)
                    }

                    break
                case 'materialAlphaPercentage':
                    ;((activeNode as Mesh).material as StandardMaterial).alpha =
                        (inputValue as number) / 100

                    break
                default:
                    break
            }
        }

        // Ensure the transformation mesh world matrix is updated after each editor input
        transformationMesh!.computeWorldMatrix(true)

        experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
    })
}

function handleToggleGridCommandExecutedEvents(): void {
    watch(
        () => experienceDesignerStore.options.showGrid,
        (value) => {
            if (_3DViewportGrid) {
                _3DViewportGrid.setVisibility(value)
            }
        },
    )
}

function handleActiveToolChangedEvents(): void {
    watch(
        () => experienceDesignerStore.activeTool,
        () => {
            if (activeNode) {
                createNodeTransformationGizmo()
            }
        },
    )
}

function handleLockAspectRadioModeEnabledChangedEvents(): void {
    watch(
        () => experienceDesignerStore.lockAspectRatioModeEnabled,
        (value) => {
            if (activeNode !== null && isNodeAMesh(activeNode)) {
                if (value === true) {
                    transformationMeshPreviousScaling = (activeNode as AbstractMesh).scaling.clone()
                } else {
                    transformationMesh!.scaling = (activeNode as AbstractMesh).scaling.clone()
                }
            }
        },
    )
}

function createSystemMeshesAndGizmos(): void {
    _3DViewportGrid = new FloorGrid(scene, _3DViewportGridId)

    transformationMesh = new Mesh(transformationMeshId, scene)
    transformationMesh.doNotSerialize = true

    directionPointMesh = new Mesh(directionPointMeshId, scene)
    directionPointMesh.doNotSerialize = true

    experiencePlayerCameraGizmo = new CameraGizmo(
        UtilityLayerRenderer.DefaultUtilityLayer,
        Color3.Gray(),
        Color3.White(),
    )
    experiencePlayerCameraGizmo.updateScale = false
    experiencePlayerCameraGizmo.scaleRatio = 20
}

function setupDefaultScene(): void {
    createSystemMeshesAndGizmos()

    createSceneSkyBox(skyTextureUrl)
    createSceneEnvironmentTexture(skyEnvironmentTextureUrl)

    const defaultMaterial = new StandardMaterial(defaultMaterialName, scene)
    defaultMaterial.transparencyMode = 2
    defaultMaterial.alphaMode = 2
    defaultMaterial.id = defaultMaterialId

    const ambientLight = new HemisphericLight('Ambient light', Vector3.Up(), scene)
    ambientLight.intensity = 1
    ambientLight.groundColor = Color3.Black()
    ambientLight.diffuse = Color3.White()

    const defaultGroundWidth = 80
    const defaultGroundDepth = 80
    const defaultGroundRoofDistance = 20

    const defaultGround = CreatePlane(
        'Ground',
        {
            width: defaultGroundWidth,
            height: defaultGroundDepth,
            sideOrientation: Mesh.DOUBLESIDE,
        },
        scene,
    )
    defaultGround.rotation.set(Math.PI / 2, 0, 0)
    defaultGround.material = defaultMaterial.clone(`${defaultGround.name} material`)
    defaultGround.material.alpha = 0.6
    ;(defaultGround.material as StandardMaterial).diffuseColor.set(0, 0, 0)

    // For the default walls, we use boxes instead of planes since the latter allow the camera
    // to go through them when colliding with the face opposite to the plane normals.
    const defaultWallNorth = CreateBox(
        'Wall North',
        {
            width: defaultGroundWidth,
            height: defaultGroundRoofDistance,
            depth: 0.01,
            sideOrientation: Mesh.DOUBLESIDE,
        },
        scene,
    )
    defaultWallNorth.position.set(0, defaultGroundRoofDistance / 2, defaultGroundDepth / 2)
    defaultWallNorth.material = defaultMaterial.clone(`${defaultWallNorth.name} material`)
    defaultWallNorth.material.alpha = 0.3

    const defaultWallEast = CreateBox(
        'Wall East',
        {
            width: defaultGroundDepth,
            height: defaultGroundRoofDistance,
            depth: 0.01,
            sideOrientation: Mesh.DOUBLESIDE,
        },
        scene,
    )
    defaultWallEast.position.set(defaultGroundWidth / 2, defaultGroundRoofDistance / 2, 0)
    defaultWallEast.rotation.set(0, Math.PI / 2, 0)
    defaultWallEast.material = defaultMaterial.clone(`${defaultWallEast.name} material`)
    defaultWallEast.material.alpha = 0.2
    ;(defaultWallEast.material as StandardMaterial).diffuseColor.set(0, 0, 0)

    const defaultWallSouth = CreateBox(
        'Wall South',
        {
            width: defaultGroundWidth,
            height: defaultGroundRoofDistance,
            depth: 0.01,
            sideOrientation: Mesh.DOUBLESIDE,
        },
        scene,
    )
    defaultWallSouth.position.set(0, defaultGroundRoofDistance / 2, -defaultGroundDepth / 2)
    defaultWallSouth.material = defaultMaterial.clone(`${defaultWallSouth.name} material`)
    defaultWallSouth.material.alpha = 0.3

    const defaultWallWest = CreateBox(
        'Wall West',
        {
            width: defaultGroundDepth,
            height: defaultGroundRoofDistance,
            depth: 0.01,
            sideOrientation: Mesh.DOUBLESIDE,
        },
        scene,
    )
    defaultWallWest.position.set(-defaultGroundWidth / 2, defaultGroundRoofDistance / 2, 0)
    defaultWallWest.rotation.set(0, Math.PI / 2, 0)
    defaultWallWest.material = defaultMaterial.clone(`${defaultWallWest.name} material`)
    defaultWallWest.material.alpha = 0.2
    ;(defaultWallWest.material as StandardMaterial).diffuseColor.set(0, 0, 0)

    const defaultRoof = CreatePlane(
        'Roof',
        {
            width: defaultGroundWidth,
            height: defaultGroundDepth,
            sideOrientation: Mesh.DOUBLESIDE,
        },
        scene,
    )
    defaultRoof.position.set(0, defaultGroundRoofDistance, 0)
    defaultRoof.rotation.set(Math.PI / 2, 0, 0)
    defaultRoof.material = defaultMaterial.clone(`${defaultRoof.name} material`)
    defaultRoof.material.alpha = 0.6

    const meshToCheckCollisions = [
        defaultGround,
        defaultWallNorth,
        defaultWallEast,
        defaultWallSouth,
        defaultWallWest,
        defaultRoof,
    ]

    for (const mesh of meshToCheckCollisions) {
        mesh.checkCollisions = true
    }

    experienceDesignerStore.experiencePlayerCameraProperties = {
        initialPosition: {
            x: 0,
            y: -defaultGroundDepth / 2 + 10,
            z: 1.5,
        },
        initialRotation: {
            x: 0,
            z: 0,
        },
        FOVDegrees: 45.84,
        speed: 1.5, // m/s
        inertiaPercentage: 20,
        sensitivity: 1_000,
    }

    experiencePlayerCamera = new UniversalCamera(
        experiencePlayerCameraName,
        new Vector3(
            experienceDesignerStore.experiencePlayerCameraProperties.initialPosition.x,
            experienceDesignerStore.experiencePlayerCameraProperties.initialPosition.z,
            experienceDesignerStore.experiencePlayerCameraProperties.initialPosition.y,
        ),
        scene,
    )

    experiencePlayerCamera.rotation.set(
        degreesToRadians(
            Number(experienceDesignerStore.experiencePlayerCameraProperties.initialRotation.x),
        ),
        degreesToRadians(
            Number(experienceDesignerStore.experiencePlayerCameraProperties.initialRotation.z),
        ),
        0, // The BabylonJS z component of the EP Camera Rotation will always be 0
    )

    experiencePlayerCamera.ellipsoid = new Vector3(0.5, 0.75, 0.5) // POV Height = (0.75 * 2) m
    experiencePlayerCamera.fov = degreesToRadians(
        experienceDesignerStore.experiencePlayerCameraProperties.FOVDegrees,
    )
    experiencePlayerCamera.speed = experienceDesignerStore.experiencePlayerCameraProperties.speed
    experiencePlayerCamera.inertia =
        experienceDesignerStore.experiencePlayerCameraProperties.inertiaPercentage / 100
    experiencePlayerCamera.angularSensibility =
        experienceDesignerStore.experiencePlayerCameraProperties.sensitivity

    // Set the near (minZ) and far (maxZ) planes of the camera in a manner that
    // the frustum lines origin of the CameraGizmo are close to the gizmo mesh
    // (the default minZ is 1) and don't spread across the entire scene (the default maxZ is 10000)
    // We do this just to display the CameraGizmo frustum lines in a proper way.
    // Also, by setting the near plane to 0.1, we prevent the camera from going through walls.
    experiencePlayerCamera.minZ = 0.1
    experiencePlayerCamera.maxZ = 3

    experiencePlayerCameraGizmo!.camera = experiencePlayerCamera

    experienceDesignerCamera.position = new Vector3(-13.4, 6.3, -36.9)
    experienceDesignerCamera.rotation = new Vector3(0.1519, 0.7995, 0)

    updateSceneNodesData()

    // Wait the next event cycle to give precedence to the experience player camera properties watchers
    setTimeout(() => {
        experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = false
        experienceDesignerStore.wasTheExperienceFileSavedAtLeastOnce = false
    })
}

function copyNode(nodeToCopy: Node): void {
    // structuredClone, sadly, doesn't work :(
    // Uncaught DataCloneError: Failed to execute 'structuredClone' on 'Window': PointerEvent object could not be cloned.
    // We have to find another way.

    // The copied node is already 'pasted' and present in the scene.
    // Infact, in BabylonJS a node can just be cloned, there's no copy/paste mechanism.
    // So, such mechanism has to be implemented somehow.
    copiedNode = nodeToCopy.clone(`${nodeToCopy.name} copy`, null)!

    // Disable the copied node (hide it from rendering and from the scene)
    // Enable it, which in this case means 'paste it', just when the paste operation occurs.
    copiedNode.setEnabled(false)
    copiedNode.state = 'COPIED_NODE'
    copiedNode.doNotSerialize = true
    copiedNode.id = copiedNode.uniqueId.toString()

    if (isNodeAMesh(copiedNode)) {
        const copiedMesh = copiedNode as Mesh
        copiedMesh.makeGeometryUnique()

        if (copiedMesh.material !== null) {
            copiedMesh.material = copiedMesh.material.clone(`${copiedMesh.material.name} copy`)
        }

        if (copiedMesh.metadata !== null) {
            copiedMesh.metadata = { ...copiedMesh.metadata }
        }
    }

    experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
}

function pasteCopiedNode(): void {
    const distanceFromPreviousNode = 2
    const translationAxis = getCameraFramingHorizontalAxis(experienceDesignerCamera)

    if (isNodeADirectionableLight(copiedNode!)) {
        const copiedDirectionableLight = copiedNode as DirectionableLight

        if (isNodeAMovableLight(copiedNode!)) {
            if (activeNode !== null && isNodeMovable(activeNode)) {
                const activeNodePosition = (activeNode as MovableNode).position.clone()

                const copiedDirectionableLightMetadata =
                    copiedDirectionableLight.metadata as DirectionableLightMetadata
                if (copiedDirectionableLightMetadata?.directionPointMeshGizmoPosition) {
                    const directionPointMeshGizmoPositionVector = new Vector3(
                        copiedDirectionableLightMetadata.directionPointMeshGizmoPosition.x,
                        copiedDirectionableLightMetadata.directionPointMeshGizmoPosition.y,
                        copiedDirectionableLightMetadata.directionPointMeshGizmoPosition.z,
                    )

                    const directionPositionDelta = directionPointMeshGizmoPositionVector.subtract(
                        (copiedNode as MovableLight).position,
                    )

                    const newdirectionPointMeshGizmoPosition =
                        activeNodePosition.add(directionPositionDelta)

                    // The metadata of a cloned node must be entirely re-assigned,
                    // otherwise we'll keep accessing the metadata of the source node.
                    copiedDirectionableLight.metadata = {
                        directionPointMeshGizmoPosition: {
                            x: newdirectionPointMeshGizmoPosition.x,
                            y: newdirectionPointMeshGizmoPosition.y,
                            z: newdirectionPointMeshGizmoPosition.z,
                        },
                    } as DirectionableLightMetadata
                }
            }
        }

        if (activeNode !== null && isNodeADirectionableLight(activeNode)) {
            const activeDirectionableLightMetadata =
                activeNode.metadata as DirectionableLightMetadata

            if (activeDirectionableLightMetadata.directionPointMeshGizmoPosition) {
                // The metadata of a cloned node must be entirely re-assigned,
                // otherwise we'll keep accessing the metadata of the source node.
                copiedDirectionableLight.metadata = {
                    directionPointMeshGizmoPosition: {
                        x: activeDirectionableLightMetadata.directionPointMeshGizmoPosition.x,
                        y: activeDirectionableLightMetadata.directionPointMeshGizmoPosition.y,
                        z: activeDirectionableLightMetadata.directionPointMeshGizmoPosition.z,
                    },
                } as DirectionableLightMetadata
            }
        }

        const copiedDirectionableLightMetadata =
            copiedDirectionableLight.metadata as DirectionableLightMetadata
        if (copiedDirectionableLightMetadata?.directionPointMeshGizmoPosition) {
            const directionPointMeshGizmoPosition = new Vector3(
                copiedDirectionableLightMetadata.directionPointMeshGizmoPosition.x,
                copiedDirectionableLightMetadata.directionPointMeshGizmoPosition.y,
                copiedDirectionableLightMetadata.directionPointMeshGizmoPosition.z,
            )

            const newDirectionPointMeshGizmoPosition = directionPointMeshGizmoPosition.add(
                translationAxis.multiplyByFloats(
                    distanceFromPreviousNode,
                    distanceFromPreviousNode,
                    distanceFromPreviousNode,
                ),
            )

            // The metadata of a cloned node must be entirely re-assigned,
            // otherwise we'll keep accessing the metadata of the source node.
            copiedDirectionableLight.metadata = {
                directionPointMeshGizmoPosition: {
                    x: newDirectionPointMeshGizmoPosition.x,
                    y: newDirectionPointMeshGizmoPosition.y,
                    z: newDirectionPointMeshGizmoPosition.z,
                },
            } as DirectionableLightMetadata
        }
    }

    if (isNodeMovable(copiedNode!)) {
        if (activeNode !== null && isNodeMovable(activeNode)) {
            const activeNodePosition = (activeNode as MovableNode).position.clone()
            ;(copiedNode as MovableNode).position = activeNodePosition
        }

        if (isNodeAMesh(copiedNode!)) {
            const copiedMesh = copiedNode as AbstractMesh
            const copiedMeshDimensionsVector = getMeshDimensionsVector(copiedMesh)

            copiedMesh.position.addInPlace(
                translationAxis.multiplyByFloats(
                    copiedMeshDimensionsVector.x + distanceFromPreviousNode,
                    copiedMeshDimensionsVector.y + distanceFromPreviousNode,
                    copiedMeshDimensionsVector.z + distanceFromPreviousNode,
                ),
            )
        } else if (isNodeAMovableLight(copiedNode!)) {
            const copiedLight = copiedNode as MovableLight

            copiedLight.position.addInPlace(
                translationAxis.multiplyByFloats(
                    distanceFromPreviousNode,
                    distanceFromPreviousNode,
                    distanceFromPreviousNode,
                ),
            )
        }
    }

    copiedNode!.setEnabled(true)
    copiedNode!.state = ''
    copiedNode!.doNotSerialize = false

    experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
}

function getSceneNumberOfElements(): number {
    // Determine the number of the elements in the scene by adding the number of root nodes
    // (root meshes + root lights), and subtract the number of the system meshes.

    let numberOfElements = scene.rootNodes.length - scene.cameras.length - systemMeshesIds.length

    // Exclude the copiedNode node, if present
    if (copiedNode !== null) {
        numberOfElements--
    }

    return numberOfElements
}

function getSceneNumberOfMeshes(): number {
    let numberOfMeshes = scene.meshes.length - systemMeshesIds.length
    if (copiedNode !== null && isNodeAMesh(copiedNode)) {
        numberOfMeshes--
    }

    for (const mesh of scene.meshes) {
        if (mesh.parent !== null && systemMeshesIds.includes(mesh.parent.id)) {
            numberOfMeshes--
        }

        if (systemMeshesIds.includes(mesh.id)) {
            continue
        }

        // Subtract the number of root meshes which contain other meshes from numberOfMeshes.
        // These root meshes are just 'containers' and they are not real meshes with geometry.
        // Hence, these meshes have no vertices.
        if (mesh.getTotalVertices() == 0) {
            numberOfMeshes--
        } else if (isNodeAPointOfInterest(mesh)) {
            numberOfMeshes--
        }
    }

    return numberOfMeshes
}

let areStatisticsUpdatesEnabled = true
const updateStatisticsIntervalMS = 1000
function updateStatistics(): void {
    if (areStatisticsUpdatesEnabled) {
        experienceDesignerStore.statistics.fps = Math.round(engine.getFps())
        experienceDesignerStore.statistics.memoryUsedMB = getMemoryUsedMB()
        experienceDesignerStore.statistics.numberOfVertices = getSceneNumberOfVertices()
        experienceDesignerStore.statistics.numberOfFaces = getSceneNumberOfFaces()
        experienceDesignerStore.statistics.numberOfMeshes = getSceneNumberOfMeshes()
        experienceDesignerStore.statistics.numberOfElements = getSceneNumberOfElements()
    }
}

// TODO: rename skyBox* into skyDome*
function createSceneSkyBox(skyTextureUrl: string, skyTextureRotationY = 0): void {
    // When a PhotoDome is created, then a new TransformNode is created, and it will have
    // the same name of the just created PhotoDome.
    // The PhotoDome initial rotation depends on the active camera rotation at the time of creation.
    const skyBox = new PhotoDome(
        skyBoxId,
        skyTextureUrl,
        {
            resolution: 32,
            size: 2048,
        },
        scene,
    )
    skyBox.id = skyBoxId
    experienceDesignerStore.skyTextureSrc = skyTextureUrl

    // When a PhotoDome is created, a mesh named '{PhotoDome.name}_mesh' is added to the
    // TransformNode created by PhotoDome.
    const skyBoxMesh = scene.getMeshById(`${skyBoxId}_mesh`)!
    skyBoxMesh.isPickable = false
    skyBoxMesh.rotation.y = degreesToRadians(skyTextureRotationY)
    ;(skyBoxMesh.material as BackgroundMaterial).diffuseTexture!.gammaSpace = true

    skyBoxMesh.material!.name = 'SkyBox material'

    skyBoxMesh.getChildMeshes()[0].id = `${skyBoxId}_mesh_child`
    skyBoxMesh.getChildMeshes()[0].name = skyBoxMesh.getChildMeshes()[0].id
    skyBoxMesh.getChildMeshes()[0].isPickable = false
}

function createSceneEnvironmentTexture(
    skyEnvironmentTextureUrl: string,
    skyEnvironmentTextureRotationY = 0,
): void {
    const environmentTexture = CubeTexture.CreateFromPrefilteredData(
        skyEnvironmentTextureUrl,
        scene,
    )
    environmentTexture.gammaSpace = false
    environmentTexture.rotationY = degreesToRadians(skyEnvironmentTextureRotationY)
    scene.environmentTexture = environmentTexture
}

function getSceneNumberOfVertices(): number {
    let numberOfVertices = scene.getTotalVertices()

    // Exclude the copiedNode node vertices, if present
    if (copiedNode !== null && isNodeAMesh(copiedNode)) {
        numberOfVertices -= (copiedNode as Mesh).getTotalVertices()

        // Exclude the copiedNode child meshes vertices too, if they are present
        for (const childMesh of (copiedNode as Mesh).getChildMeshes()) {
            numberOfVertices -= childMesh.getTotalVertices()
        }
    }

    for (const mesh of scene.meshes) {
        if (isNodeAPointOfInterest(mesh)) {
            numberOfVertices -= mesh.getTotalVertices()
        }

        if (
            systemMeshesIds.includes(mesh.id) ||
            (mesh.parent !== null && systemMeshesIds.includes(mesh.parent.id))
        ) {
            numberOfVertices -= mesh.getTotalVertices()
        }
    }

    return numberOfVertices
}

function getSceneNumberOfFaces(): number {
    let numberOfFaces = 0

    for (const mesh of scene.meshes) {
        if (mesh.state == 'COPIED_NODE') {
            continue
        }

        if (isNodeAPointOfInterest(mesh)) {
            continue
        }

        if (systemMeshesIds.includes(mesh.id)) {
            continue
        }

        if (mesh.parent !== null && systemMeshesIds.includes(mesh.parent.id)) {
            continue
        }

        numberOfFaces += mesh.getTotalIndices() / 3
    }

    // Subtract the number of faces of root meshes which contain other meshes from numberOfFaces.
    if (copiedNode !== null && isNodeAMesh(copiedNode)) {
        for (const childMesh of (copiedNode as Mesh).getChildMeshes()) {
            numberOfFaces -= childMesh.getTotalIndices() / 3
        }
    }

    return numberOfFaces
}

function getNodeClassNameById(nodeId: string): string {
    return scene.getNodeById(nodeId)!.getClassName()
}

function getNodeDataById(nodeId: string): NodeData {
    const node = scene.getNodeById(nodeId)
    const nodeClassName = getNodeClassNameById(nodeId)

    const nodeData: NodeData = {
        type: nodeClassName,
        properties: undefined,
    }

    switch (nodeClassName) {
        case 'Mesh':
        case 'GroundMesh': {
            const mesh = node as Mesh

            let isExaminationScreenEnabled = false
            if ((mesh.metadata as MeshMetadata)?.isExaminationScreenEnabled === true) {
                isExaminationScreenEnabled = true
            }

            const nodeDimensionsVector = getMeshDimensionsVector(mesh)
            const dimensionY = roundNumber(nodeDimensionsVector.z, 4)
            const dimensionZ = roundNumber(nodeDimensionsVector.y, 4)

            const properties: MeshProperties = {
                isExaminationScreenEnabled: isExaminationScreenEnabled,
                positionX: roundNumber(mesh.position.x, 4),
                positionY: roundNumber(mesh.position.z, 4),
                positionZ: roundNumber(mesh.position.y, 4),
                rotationX: roundNumber(radiansToDegrees(mesh.rotation.x), 4),
                rotationY: roundNumber(radiansToDegrees(mesh.rotation.z), 4),
                rotationZ: roundNumber(radiansToDegrees(mesh.rotation.y), 4),
                dimensionX: roundNumber(nodeDimensionsVector.x, 4),
                dimensionY: dimensionY === 0 ? undefined : dimensionY,
                dimensionZ: dimensionZ === 0 ? undefined : dimensionZ,
                canReceiveShadows: mesh.receiveShadows,
                areCollisionsEnabled: mesh.checkCollisions,
                materialDiffuseColorHEX: (
                    mesh.material as StandardMaterial
                )?.diffuseColor?.toHexString(),
                materialEmissiveColorHEX: (
                    mesh.material as StandardMaterial
                )?.emissiveColor?.toHexString(),
                materialAlphaPercentage:
                    mesh.material?.alpha !== undefined
                        ? roundNumber(mesh.material?.alpha * 100, 1)
                        : undefined,
            }

            nodeData.properties = properties
            break
        }
        case 'PointLight': {
            const pointLight = node as PointLight

            const properties: PointLightProperties = {
                positionX: roundNumber(pointLight.position.x, 4),
                positionY: roundNumber(pointLight.position.z, 4),
                positionZ: roundNumber(pointLight.position.y, 4),
                intensity: pointLight.intensity,
                diffuseColorHEX: pointLight.diffuse.toHexString(),
                areShadowsEnabled: pointLight.shadowEnabled,
            }

            nodeData.properties = properties
            break
        }
        case 'DirectionalLight': {
            const directionalLight = node as DirectionalLight
            const directionalLightMetadata = directionalLight.metadata as DirectionableLightMetadata

            const properties: DirectionalLightProperties = {
                positionX: roundNumber(directionalLight.position.x, 4),
                positionY: roundNumber(directionalLight.position.z, 4),
                positionZ: roundNumber(directionalLight.position.y, 4),
                directionPointX: roundNumber(
                    directionalLightMetadata.directionPointMeshGizmoPosition.x,
                    4,
                ),
                directionPointY: roundNumber(
                    directionalLightMetadata.directionPointMeshGizmoPosition.z,
                    4,
                ),
                directionPointZ: roundNumber(
                    directionalLightMetadata.directionPointMeshGizmoPosition.y,
                    4,
                ),
                intensity: directionalLight.intensity,
                diffuseColorHEX: directionalLight.diffuse.toHexString(),
                areShadowsEnabled: directionalLight.shadowEnabled,
            }

            nodeData.properties = properties
            break
        }
        case 'SpotLight': {
            const spotLight = node as SpotLight
            const spotLightMetadata = spotLight.metadata as DirectionableLightMetadata

            const properties: SpotLightProperties = {
                positionX: roundNumber(spotLight.position.x, 4),
                positionY: roundNumber(spotLight.position.z, 4),
                positionZ: roundNumber(spotLight.position.y, 4),
                directionPointX: roundNumber(
                    spotLightMetadata.directionPointMeshGizmoPosition.x,
                    4,
                ),
                directionPointY: roundNumber(
                    spotLightMetadata.directionPointMeshGizmoPosition.z,
                    4,
                ),
                directionPointZ: roundNumber(
                    spotLightMetadata.directionPointMeshGizmoPosition.y,
                    4,
                ),
                intensity: spotLight.intensity,
                diffuseColorHEX: spotLight.diffuse.toHexString(),
                areShadowsEnabled: spotLight.shadowEnabled,
                angleDegrees: roundNumber(radiansToDegrees(spotLight.angle), 1),
            }

            nodeData.properties = properties
            break
        }
        case 'HemisphericLight': {
            const hemisphericLight = node as HemisphericLight
            const hemisphericLightMetadata = hemisphericLight.metadata as DirectionableLightMetadata

            const properties: HemisphericLightProperties = {
                directionPointX: roundNumber(
                    hemisphericLightMetadata.directionPointMeshGizmoPosition.x,
                    4,
                ),
                directionPointY: roundNumber(
                    hemisphericLightMetadata.directionPointMeshGizmoPosition.z,
                    4,
                ),
                directionPointZ: roundNumber(
                    hemisphericLightMetadata.directionPointMeshGizmoPosition.y,
                    4,
                ),
                intensity: hemisphericLight.intensity,
                diffuseColorHEX: hemisphericLight.diffuse.toHexString(),
                groundColorHEX: hemisphericLight.groundColor.toHexString(),
            }

            nodeData.properties = properties
            break
        }

        default:
            break
    }

    return nodeData
}

function resetNodeTransformationGizmo(): void {
    if (transformationMeshGizmoManager !== null) {
        transformationMeshGizmoManager.dispose()
        transformationMeshGizmoManager = null
    }
}

function createNodeTransformationGizmo(): void {
    resetNodeTransformationGizmo()

    if (isNodeALight(activeNode!)) {
        if (isNodeAMovableLight(activeNode!)) {
            experienceDesignerStore.setEnabledTools(['select', 'move'])

            if (experienceDesignerStore.activeTool != 'select') {
                experienceDesignerStore.setActiveTool('move')
            }
        } else {
            experienceDesignerStore.setEnabledTools(['select'])
            experienceDesignerStore.setActiveTool('select')
        }
    }

    if (experienceDesignerStore.activeTool == 'select') {
        return
    }

    transformationMeshGizmoManager = new GizmoManager(scene)
    transformationMeshGizmoManager.usePointerToAttachGizmos = false

    switch (experienceDesignerStore.activeTool) {
        case 'move':
            transformationMeshGizmoManager.positionGizmoEnabled = true
            transformationMeshGizmoManager.gizmos.positionGizmo!.scaleRatio = 1
            break

        case 'rotate':
            transformationMeshGizmoManager.rotationGizmoEnabled = true
            transformationMeshGizmoManager.gizmos.rotationGizmo!.scaleRatio = 1
            // The next line fixes the error 'Unable to use a rotation gizmo matching mesh rotation with non uniform scaling. Use uniform scaling or set updateGizmoRotationToMatchAttachedMesh to false.'
            transformationMeshGizmoManager.gizmos.rotationGizmo!.updateGizmoRotationToMatchAttachedMesh =
                false
            break

        case 'scale':
            transformationMeshGizmoManager.scaleGizmoEnabled = true
            transformationMeshGizmoManager.gizmos.scaleGizmo!.scaleRatio = 1
            transformationMeshGizmoManager.gizmos.scaleGizmo!.incrementalSnap = true
            break

        default:
            break
    }

    transformationMeshGizmoManager.attachToNode(transformationMesh)
}

function resetActiveNode(): void {
    if (activeNode === null) {
        return
    }

    experienceDesignerStore.isSetActiveElementPositionToObjectPointModeEnabled = false
    experienceDesignerStore.isSetDirectionPointMeshPositionToObjectPointModeEnabled = false
    experienceDesignerStore.lockAspectRatioModeEnabled = false
    experienceDesignerStore.setEnabledTools(['select', 'move', 'rotate', 'scale'])

    if (isNodeAMesh(activeNode)) {
        const activeMesh = activeNode as AbstractMesh
        activeMesh.showBoundingBox = false
    } else if (isNodeALight(activeNode)) {
        lightGizmo!.dispose()
        lightGizmo = null

        if (isNodeADirectionableLight(activeNode)) {
            directionPointMeshGizmoManager!.dispose()
            directionPointMeshGizmoManager = null
        }
    }

    transformationMesh!.onAfterWorldMatrixUpdateObservable.clear()
    directionPointMesh!.onAfterWorldMatrixUpdateObservable.clear()
    resetNodeTransformationGizmo()

    experienceDesignerStore.activeNodeId = null
    activeNode = null
}

function setNodeAsActive(nodeToSetAsActive: Node): void {
    if (nodeToSetAsActive === null) {
        return
    }

    experienceDesignerStore.isSceneSelected = false
    experienceDesignerStore.isSetExperiencePlayerCameraInitialPositionToObjectPointModeEnabled =
        false

    eventBus.emit('activeNodeUpdated', { newActiveNodeId: nodeToSetAsActive.id })

    if (activeNode?.id === nodeToSetAsActive.id) {
        return
    }

    resetActiveNode()

    activeNode = nodeToSetAsActive
    experienceDesignerStore.activeNodeId = activeNode.id

    if (isNodeAMesh(activeNode)) {
        ;(activeNode as AbstractMesh).showBoundingBox = true

        transformationMesh!.position = (activeNode as AbstractMesh).position.clone()
        transformationMesh!.rotation = (activeNode as AbstractMesh).rotation.clone()
        transformationMesh!.scaling = (activeNode as AbstractMesh).scaling.clone()
        transformationMeshPreviousScaling = (activeNode as AbstractMesh).scaling.clone()
    } else if (isNodeALight(activeNode)) {
        lightGizmo = new LightGizmo()
        lightGizmo.light = activeNode as Light
        lightGizmo.scaleRatio = 2

        if (isNodeAMovableLight(activeNode)) {
            transformationMesh!.position = (activeNode as MovableLight).position.clone()
        }

        if (isNodeADirectionableLight(activeNode)) {
            directionPointMeshGizmoManager = new GizmoManager(scene)
            directionPointMeshGizmoManager.usePointerToAttachGizmos = false
            directionPointMeshGizmoManager.positionGizmoEnabled = true
            directionPointMeshGizmoManager.gizmos.positionGizmo!.scaleRatio = 1
            for (const gizmo of [
                directionPointMeshGizmoManager.gizmos.positionGizmo!.xGizmo,
                directionPointMeshGizmoManager.gizmos.positionGizmo!.yGizmo,
                directionPointMeshGizmoManager.gizmos.positionGizmo!.zGizmo,
            ]) {
                gizmo.coloredMaterial.diffuseColor.set(0.5, 0.5, 0.5)
            }

            directionPointMeshGizmoManager.attachToNode(directionPointMesh)

            const directionableLight = activeNode as DirectionableLight

            const directionPointMeshGizmoPosition = (
                directionableLight.metadata as DirectionableLightMetadata
            ).directionPointMeshGizmoPosition

            directionPointMesh!.position.set(
                directionPointMeshGizmoPosition.x,
                directionPointMeshGizmoPosition.y,
                directionPointMeshGizmoPosition.z,
            )
        }
    }

    createNodeTransformationGizmo()

    if (isNodeAMesh(activeNode) || isNodeAMovableLight(activeNode)) {
        transformationMesh!.onAfterWorldMatrixUpdateObservable.add(() => {
            if (isNodeAMesh(activeNode!)) {
                ;(activeNode as AbstractMesh).position = transformationMesh!.position.clone()
                ;(activeNode as AbstractMesh).rotation = transformationMesh!.rotation.clone()

                if (experienceDesignerStore.lockAspectRatioModeEnabled) {
                    let changedScalingComponent: PlaneCoordinate = 'x'
                    if (transformationMesh!.scaling.y !== transformationMeshPreviousScaling.y) {
                        changedScalingComponent = 'y'
                    } else if (
                        transformationMesh!.scaling.z !== transformationMeshPreviousScaling.z
                    ) {
                        changedScalingComponent = 'z'
                    }

                    if (!transformationMesh!.scaling.equals(transformationMeshPreviousScaling)) {
                        const scalingFactor =
                            transformationMesh!.scaling[changedScalingComponent] /
                            transformationMeshPreviousScaling[changedScalingComponent]

                        ;(activeNode as AbstractMesh).scaling.multiplyInPlace(
                            new Vector3(scalingFactor, scalingFactor, scalingFactor),
                        )
                    }
                } else {
                    ;(activeNode as AbstractMesh).scaling = transformationMesh!.scaling.clone()
                }

                transformationMeshPreviousScaling = transformationMesh!.scaling.clone()
            } else if (isNodeAMovableLight(activeNode!)) {
                ;(activeNode as MovableLight).position = transformationMesh!.position.clone()
                ;(activeNode as DirectionableLight).setDirectionToTarget(
                    directionPointMesh!.position.clone(),
                )
            }

            eventBus.emit('activeNodeDataUpdated', {
                newNodeData: getNodeDataById(activeNode!.id),
            })

            experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
        })
    }

    if (isNodeADirectionableLight(activeNode)) {
        directionPointMesh!.onAfterWorldMatrixUpdateObservable.add(() => {
            ;(activeNode as DirectionableLight).setDirectionToTarget(
                directionPointMesh!.position.clone(),
            )
            ;(activeNode!.metadata as DirectionableLightMetadata).directionPointMeshGizmoPosition =
                {
                    x: directionPointMesh!.position.x,
                    y: directionPointMesh!.position.y,
                    z: directionPointMesh!.position.z,
                }

            eventBus.emit('activeNodeDataUpdated', {
                newNodeData: getNodeDataById(activeNode!.id),
            })

            experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
        })
    }

    eventBus.emit('activeNodeDataUpdated', {
        newNodeData: getNodeDataById(activeNode.id),
    })

    experienceDesignerStore.areThereAnyUnsavedChangesSinceLastSave = true
}

function updateSceneNodesData(): void {
    const sceneNodesData: SceneNodeData[] = []
    for (const mesh of scene.meshes) {
        // Take into account only meshes which are root nodes
        if (mesh.parent !== null) {
            continue
        }

        if (isNodeAPointOfInterest(mesh)) {
            continue
        }

        if (mesh.state == 'COPIED_NODE') {
            continue
        }

        if (systemMeshesIds.includes(mesh.id)) {
            continue
        }

        sceneNodesData.push({
            id: mesh.id,
            isVisible: mesh.isEnabled(false),
            name: mesh.name,
            type: mesh.getClassName(),
        })
    }

    for (const light of scene.lights) {
        if (light.state == 'COPIED_NODE') {
            continue
        }

        sceneNodesData.push({
            id: light.id,
            isVisible: light.isEnabled(false),
            type: light.getClassName(),
            name: light.name,
        })
    }

    updateStatistics()
    eventBus.emit('sceneNodesDataUpdated', { sceneNodesData: sceneNodesData })
}

const canvas = useTemplateRef<HTMLCanvasElement>('__3d-viewport-canvas')
const is3DViewportCanvasAboveUI = ref(false)

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
        if (scene.metadata === null) {
            scene.metadata = {
                mersiveVersionWhenExperienceWasLastSaved: experienceDesignerStore.mersiveVersion,
            } as SceneMetadata
        }

        Texture.ForceSerializeBuffers = true

        // To allow the user to use WASD controls without clicking anywhere on the 3D viewport AT STARTUP,
        // the canvas must be focused AFTER the scene object creation.
        // If done before, the focus has no effect.
        eventBus.on((loadingScreenName + 'Hidden') as 'loadingScreenHidden', () => {
            if (canvas.value === null) {
                return
            }

            canvas.value.focus()
        })

        // TODO: in order to use WASD controls, the user has to click anywhere on the viewport first.
        //       when clicking and typing on other UI fields, the canvas loses the foucs.
        //       we should give a visual hint to tell the user to click on the viewport to use WASD controls.

        // canvas.addEventListener('focus', (a) => {
        //     console.log('canvas has now focus', a)
        // })

        // canvas.addEventListener('focusout', (a) => {
        //     console.log('canvas has lost focus', a)
        // })

        experienceDesignerCamera = new MersiveExperienceDesignerCamera(canvas.value, scene)
        setupEventHandlers()

        const experienceToEditFileWithHandle = inject(
            experienceToEditOrPlayFileWithHandleIK,
            undefined,
        )
        if (experienceToEditFileWithHandle?.value === undefined) {
            setupDefaultScene()

            setTimeout(() => {
                engine.hideLoadingUI()
            }, 2000)
        } else {
            openExperience(experienceToEditFileWithHandle.value)
        }

        engine.runRenderLoop(() => {
            scene.render()
        })

        setInterval(() => updateStatistics(), updateStatisticsIntervalMS)

        experienceDesignerStore.status = 'Ready'
    }
})

watch(
    () => experienceDesignerStore.isExperienceDesignerExaminationScreenShown,
    (value) => {
        if (value === false) {
            is3DViewportCanvasAboveUI.value = false
        }
    },
)
</script>

<template>
    <div style="width: 100%; height: 100%">
        <canvas
            ref="__3d-viewport-canvas"
            class="__3d-viewport-canvas"
            :class="{
                '__3d-viewport-canvas--cursor-crosshair':
                    experienceDesignerStore.isSetActiveElementPositionToObjectPointModeEnabled ||
                    experienceDesignerStore.isSetDirectionPointMeshPositionToObjectPointModeEnabled ||
                    experienceDesignerStore.isSetExperiencePlayerCameraInitialPositionToObjectPointModeEnabled,
                '__3d-viewport-canvas--above-ui': is3DViewportCanvasAboveUI,
            }"
        ></canvas>
        <ExperienceDesignerExaminationScreen />
        <MLoadingScreen :loading-screen-name />
    </div>
</template>

<style scoped>
.__3d-viewport-canvas {
    width: 100%;
    height: 100%;

    position: relative;

    outline: none;
}

.__3d-viewport-canvas--cursor-crosshair {
    cursor: crosshair;
}

.__3d-viewport-canvas--above-ui {
    z-index: 2;
}
</style>
