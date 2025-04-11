<script setup lang="ts">
import { useExperienceDesignerStore } from '@/stores/experienceDesigner'
import { computed, ref } from 'vue'
import eventBus from '@/eventBus'
import {
    isADirectionableLightType,
    isALightType,
    isAMeshType,
    isAMovableNodeType,
} from '@/functions'
import type { NodeData, INodeProperties } from '@/types'
import MButton from './MButton.vue'
import ExperienceDesignerEditorInputsBlock from './ExperienceDesignerEditorInputsBlock.vue'
import ExperienceDesignerEditorInputsBlockInputsColumn from './ExperienceDesignerEditorInputsBlockInputsColumn.vue'
import ExperienceDesignerEditorInputsBlockHeadingButton from './ExperienceDesignerEditorInputsBlockHeadingButton.vue'
import ExperienceDesignerEditorInputsBlockRow from './ExperienceDesignerEditorInputsBlockRow.vue'
import MSelect from './MSelect.vue'
import MNumericInputField from './MNumericInputField.vue'
import MToggle from './MToggle.vue'
import MRange from './MRange.vue'
import MColorInput from './MColorInput.vue'
import pointerClickTargetPointIcon from '@/assets/icons/pointer_click_target_point_400.svg'
import resetIcon from '@/assets/icons/reset_400.svg'
import lockClosedIcon from '@/assets/icons/lock_closed_400.svg'

const experienceDesignerStore = useExperienceDesignerStore()

const activeNode = ref<NodeData>()
const activeNodeProperties = computed(() => {
    return activeNode.value?.properties as INodeProperties
})

eventBus.on('activeNodeDataUpdated', (data) => {
    activeNode.value = data.newNodeData

    if (isALightType(activeNode.value.type) && activePropertyCategory.value == 'interactions') {
        activePropertyCategory.value = 'transformations'
    }

    if (isAMeshType(activeNode.value.type)) {
        selectablePropertyCategories.value = [
            {
                name: 'Transformations',
                value: 'transformations',
            },
            {
                name: 'Appearance',
                value: 'appearance',
            },
            {
                name: 'Interactions',
                value: 'interactions',
            },
        ]
    } else {
        selectablePropertyCategories.value = [
            {
                name: 'Transformations',
                value: 'transformations',
            },
            {
                name: 'Appearance',
                value: 'appearance',
            },
        ]
    }
})

function handleInput(name: keyof INodeProperties, value: unknown) {
    eventBus.emit('editorInput', {
        inputData: {
            name: name,
            value: value,
        },
    })
}

function handleSetActiveElementPositionToObjectPointButtonClick() {
    experienceDesignerStore.isSetActiveElementPositionToObjectPointModeEnabled =
        !experienceDesignerStore.isSetActiveElementPositionToObjectPointModeEnabled
}

function handleSetDirectionPointMeshPositionToObjectPointButtonClick() {
    experienceDesignerStore.isSetDirectionPointMeshPositionToObjectPointModeEnabled =
        !experienceDesignerStore.isSetDirectionPointMeshPositionToObjectPointModeEnabled
}

function handleLockAspectRatioButtonClick() {
    experienceDesignerStore.lockAspectRatioModeEnabled =
        !experienceDesignerStore.lockAspectRatioModeEnabled
}

function handleResetActiveElementRotationButtonClick() {
    eventBus.emit('resetActiveElementRotationButtonClicked')
}

function handleResetActiveElementDimensionsButtonClick() {
    eventBus.emit('resetActiveElementDimensionsButtonClicked')
}

function handleConfigureExaminationScreenButtonClickEvents() {
    eventBus.emit('configureExaminationScreenButtonClicked')
}

function handleSetExperiencePlayerCameraInitialPositionToObjectPointButtonClick() {
    experienceDesignerStore.isSetExperiencePlayerCameraInitialPositionToObjectPointModeEnabled =
        !experienceDesignerStore.isSetExperiencePlayerCameraInitialPositionToObjectPointModeEnabled
}

function handleResetExperiencePlayerCameraInitialRotationButtonClick() {
    experienceDesignerStore.experiencePlayerCameraProperties.initialRotation = {
        x: 0,
        z: 0,
    }
}

function handleUploadNewSceneSkyTextureButtonClickEvents() {
    eventBus.emit('uploadNewSceneSkyTextureButtonClicked')
}

function handleUploadNewSceneEnvironmentTextureButtonClickEvents() {
    eventBus.emit('uploadNewSceneEnvironmentTextureButtonClicked')
}

type EditorPropertyCategory = 'transformations' | 'appearance' | 'interactions'
const activePropertyCategory = ref<EditorPropertyCategory>('transformations')
const selectablePropertyCategories = ref<{ name: string; value: EditorPropertyCategory }[]>([
    {
        name: 'Transformations',
        value: 'transformations',
    },
    {
        name: 'Appearance',
        value: 'appearance',
    },
    {
        name: 'Interactions',
        value: 'interactions',
    },
])

type EditorScenePropertyCategory = 'experienceSettings' | 'experienceCameraSettings'
const activeScenePropertyCategory = ref<EditorScenePropertyCategory>('experienceCameraSettings')
const selectableScenePropertyCategories = ref<
    { name: string; value: EditorScenePropertyCategory }[]
>([
    {
        name: 'Experience Settings',
        value: 'experienceSettings',
    },
    {
        name: 'Experience Camera Settings',
        value: 'experienceCameraSettings',
    },
])
</script>

<template>
    <div class="editor">
        <span class="editor__heading">Properties Editor</span>
        <template
            v-if="
                experienceDesignerStore.activeNodeId === null &&
                experienceDesignerStore.isSceneSelected === false
            "
        >
            <span class="editor__no-element-selected-text"
                >Select the scene or an element to display their properties, using the outliner or
                the 3D Viewport.</span
            >
        </template>
        <template
            v-else-if="
                experienceDesignerStore.activeNodeId !== null &&
                experienceDesignerStore.isSceneSelected === false
            "
        >
            <MSelect
                v-model="activePropertyCategory"
                placeholder-text="Select a property category"
                :options="selectablePropertyCategories"
            />
            <div class="editor__body">
                <template v-if="activePropertyCategory == 'transformations'">
                    <ExperienceDesignerEditorInputsBlock
                        v-if="isAMovableNodeType(activeNode!.type)"
                    >
                        <template #heading-text>Position</template>
                        <template #heading-buttons>
                            <ExperienceDesignerEditorInputsBlockHeadingButton
                                :is-enabled="
                                    experienceDesignerStore.isSetActiveElementPositionToObjectPointModeEnabled
                                "
                                tooltip-text="Set the position by clicking on a point of an object"
                                :icon-path="pointerClickTargetPointIcon"
                                @click="handleSetActiveElementPositionToObjectPointButtonClick"
                            />
                        </template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockInputsColumn>
                                <MNumericInputField
                                    v-model.number="activeNodeProperties.positionX"
                                    step="any"
                                    text-before-input="X"
                                    text-after-input="m"
                                    theme="ed-editor-input"
                                    @input="
                                        handleInput('positionX', activeNodeProperties.positionX)
                                    "
                                />
                                <MNumericInputField
                                    v-model.number="activeNodeProperties.positionY"
                                    step="any"
                                    text-before-input="Y"
                                    text-after-input="m"
                                    theme="ed-editor-input"
                                    @input="
                                        handleInput('positionY', activeNodeProperties.positionY)
                                    "
                                />
                                <MNumericInputField
                                    v-model.number="activeNodeProperties.positionZ"
                                    step="any"
                                    text-before-input="Z"
                                    text-after-input="m"
                                    theme="ed-editor-input"
                                    @input="
                                        handleInput('positionZ', activeNodeProperties.positionZ)
                                    "
                                />
                            </ExperienceDesignerEditorInputsBlockInputsColumn>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                    <ExperienceDesignerEditorInputsBlock v-if="isAMeshType(activeNode!.type)">
                        <template #heading-text>Rotation</template>
                        <template #heading-buttons>
                            <ExperienceDesignerEditorInputsBlockHeadingButton
                                tooltip-text="Reset the rotation"
                                :icon-path="resetIcon"
                                @click="handleResetActiveElementRotationButtonClick"
                            />
                        </template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockInputsColumn>
                                <MNumericInputField
                                    v-model.number="activeNodeProperties.rotationX"
                                    step="any"
                                    text-before-input="X"
                                    text-after-input="°"
                                    theme="ed-editor-input"
                                    @input="
                                        handleInput('rotationX', activeNodeProperties.rotationX)
                                    "
                                />
                                <MNumericInputField
                                    v-model.number="activeNodeProperties.rotationY"
                                    step="any"
                                    text-before-input="Y"
                                    text-after-input="°"
                                    theme="ed-editor-input"
                                    @input="
                                        handleInput('rotationY', activeNodeProperties.rotationY)
                                    "
                                />
                                <MNumericInputField
                                    v-model.number="activeNodeProperties.rotationZ"
                                    step="any"
                                    text-before-input="Z"
                                    text-after-input="°"
                                    theme="ed-editor-input"
                                    @input="
                                        handleInput('rotationZ', activeNodeProperties.rotationZ)
                                    "
                                />
                            </ExperienceDesignerEditorInputsBlockInputsColumn>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                    <ExperienceDesignerEditorInputsBlock v-if="isAMeshType(activeNode!.type)">
                        <template #heading-text>Dimensions</template>
                        <template #heading-buttons>
                            <ExperienceDesignerEditorInputsBlockHeadingButton
                                :is-enabled="experienceDesignerStore.lockAspectRatioModeEnabled"
                                tooltip-text="Lock aspect ratio"
                                :icon-path="lockClosedIcon"
                                @click="handleLockAspectRatioButtonClick"
                            />
                            <ExperienceDesignerEditorInputsBlockHeadingButton
                                tooltip-text="Reset the dimensions"
                                :icon-path="resetIcon"
                                @click="handleResetActiveElementDimensionsButtonClick"
                            />
                        </template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockInputsColumn>
                                <MNumericInputField
                                    v-model.number="activeNodeProperties.dimensionX"
                                    step="any"
                                    text-before-input="X"
                                    text-after-input="m"
                                    :min-value="0.0001"
                                    theme="ed-editor-input"
                                    @input="
                                        handleInput('dimensionX', activeNodeProperties.dimensionX)
                                    "
                                />
                                <MNumericInputField
                                    v-if="activeNodeProperties.dimensionY !== undefined"
                                    v-model.number="activeNodeProperties.dimensionY as number"
                                    step="any"
                                    text-before-input="Y"
                                    text-after-input="m"
                                    :min-value="0.0001"
                                    theme="ed-editor-input"
                                    @input="
                                        handleInput('dimensionY', activeNodeProperties.dimensionY)
                                    "
                                />
                                <MNumericInputField
                                    v-if="activeNodeProperties.dimensionZ !== undefined"
                                    v-model.number="activeNodeProperties.dimensionZ as number"
                                    step="any"
                                    text-before-input="Z"
                                    text-after-input="m"
                                    :min-value="0.0001"
                                    theme="ed-editor-input"
                                    @input="
                                        handleInput('dimensionZ', activeNodeProperties.dimensionZ)
                                    "
                                />
                            </ExperienceDesignerEditorInputsBlockInputsColumn>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                    <ExperienceDesignerEditorInputsBlock
                        v-if="isADirectionableLightType(activeNode!.type)"
                    >
                        <template #heading-text>Direction point</template>
                        <template #heading-buttons>
                            <ExperienceDesignerEditorInputsBlockHeadingButton
                                :is-enabled="
                                    experienceDesignerStore.isSetDirectionPointMeshPositionToObjectPointModeEnabled
                                "
                                tooltip-text="Set the direction point position by clicking on a point of an object"
                                :icon-path="pointerClickTargetPointIcon"
                                @click="handleSetDirectionPointMeshPositionToObjectPointButtonClick"
                            />
                        </template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockInputsColumn>
                                <MNumericInputField
                                    v-model.number="activeNodeProperties.directionPointX"
                                    step="any"
                                    text-before-input="X"
                                    text-after-input="m"
                                    theme="ed-editor-input"
                                    @input="
                                        handleInput(
                                            'directionPointX',
                                            activeNodeProperties.directionPointX,
                                        )
                                    "
                                />
                                <MNumericInputField
                                    v-model.number="activeNodeProperties.directionPointY"
                                    step="any"
                                    text-before-input="Y"
                                    text-after-input="m"
                                    theme="ed-editor-input"
                                    @input="
                                        handleInput(
                                            'directionPointY',
                                            activeNodeProperties.directionPointY,
                                        )
                                    "
                                />
                                <MNumericInputField
                                    v-model.number="activeNodeProperties.directionPointZ"
                                    step="any"
                                    text-before-input="Z"
                                    text-after-input="m"
                                    theme="ed-editor-input"
                                    @input="
                                        handleInput(
                                            'directionPointZ',
                                            activeNodeProperties.directionPointZ,
                                        )
                                    "
                                />
                            </ExperienceDesignerEditorInputsBlockInputsColumn>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                </template>
                <template v-if="activePropertyCategory == 'appearance'">
                    <ExperienceDesignerEditorInputsBlock
                        v-if="
                            isAMeshType(activeNode!.type) &&
                            activeNodeProperties.materialDiffuseColorHEX !== undefined
                        "
                    >
                        <template #heading-text>Material diffuse color</template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <template #description>
                                    Specify the color of the material that will combine with that of
                                    the lights projected on it. Set it to white to make sure that
                                    only the lights will have an effect on the material color
                                </template>
                                <MColorInput
                                    v-model="activeNodeProperties.materialDiffuseColorHEX"
                                    @input="
                                        handleInput(
                                            'materialDiffuseColorHEX',
                                            activeNodeProperties.materialDiffuseColorHEX,
                                        )
                                    "
                                />
                            </ExperienceDesignerEditorInputsBlockRow>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                    <ExperienceDesignerEditorInputsBlock
                        v-if="
                            isAMeshType(activeNode!.type) &&
                            activeNodeProperties.materialEmissiveColorHEX !== undefined
                        "
                    >
                        <template #heading-text>Material emissive color</template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <template #description>
                                    Specify the color of the material as if self lit
                                </template>
                                <MColorInput
                                    v-model="activeNodeProperties.materialEmissiveColorHEX"
                                    @input="
                                        handleInput(
                                            'materialEmissiveColorHEX',
                                            activeNodeProperties.materialEmissiveColorHEX,
                                        )
                                    "
                                />
                            </ExperienceDesignerEditorInputsBlockRow>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                    <ExperienceDesignerEditorInputsBlock
                        v-if="
                            isAMeshType(activeNode!.type) &&
                            activeNodeProperties.materialAlphaPercentage !== undefined
                        "
                    >
                        <template #heading-text>Material opacity</template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <template #description>
                                    Specify the opacity (or transparency) of the material
                                </template>
                            </ExperienceDesignerEditorInputsBlockRow>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <MNumericInputField
                                    v-model.number="activeNodeProperties.materialAlphaPercentage"
                                    :step="0.1"
                                    :min="0"
                                    :max="100"
                                    text-after-input="%"
                                    theme="ed-editor-input"
                                    @input="
                                        handleInput(
                                            'materialAlphaPercentage',
                                            activeNodeProperties.materialAlphaPercentage,
                                        )
                                    "
                                />
                                <MRange
                                    v-model.number="activeNodeProperties.materialAlphaPercentage"
                                    :min="0"
                                    :max="100"
                                    :step="0.1"
                                    @input="
                                        handleInput(
                                            'materialAlphaPercentage',
                                            activeNodeProperties.materialAlphaPercentage,
                                        )
                                    "
                                />
                            </ExperienceDesignerEditorInputsBlockRow>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                    <ExperienceDesignerEditorInputsBlock v-if="isAMeshType(activeNode!.type)">
                        <template #heading-text>Shadows</template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <template #description>
                                    Specify if this element can receive shadows
                                </template>
                                <MToggle
                                    v-model="activeNodeProperties.canReceiveShadows"
                                    @click="
                                        handleInput(
                                            'canReceiveShadows',
                                            activeNodeProperties.canReceiveShadows,
                                        )
                                    "
                                />
                            </ExperienceDesignerEditorInputsBlockRow>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                    <ExperienceDesignerEditorInputsBlock v-if="isALightType(activeNode!.type)">
                        <template #heading-text>Light intensity</template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <MNumericInputField
                                    v-model.number="activeNodeProperties.intensity"
                                    :min="0"
                                    :step="0.1"
                                    :text-after-input="
                                        ['PointLight', 'SpotLight'].includes(activeNode!.type)
                                            ? 'cd'
                                            : 'lux'
                                    "
                                    theme="ed-editor-input"
                                    style="width: 70%"
                                    @input="
                                        handleInput('intensity', activeNodeProperties.intensity)
                                    "
                                />
                                <MRange
                                    v-model="activeNodeProperties.intensity"
                                    :min="0"
                                    :max="2"
                                    :step="0.1"
                                    @input="
                                        handleInput('intensity', activeNodeProperties.intensity)
                                    "
                                />
                            </ExperienceDesignerEditorInputsBlockRow>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                    <ExperienceDesignerEditorInputsBlock v-if="activeNode!.type === 'SpotLight'">
                        <template #heading-text>Light cone angle</template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <MNumericInputField
                                    v-model.number="activeNodeProperties.angleDegrees"
                                    :min="0"
                                    :max="359.9"
                                    :step="0.1"
                                    text-after-input="°"
                                    theme="ed-editor-input"
                                    style="width: 70%"
                                    @input="
                                        handleInput(
                                            'angleDegrees',
                                            activeNodeProperties.angleDegrees,
                                        )
                                    "
                                />
                                <MRange
                                    v-model="activeNodeProperties.angleDegrees"
                                    :min="0"
                                    :max="359.9"
                                    :step="0.1"
                                    @input="
                                        handleInput(
                                            'angleDegrees',
                                            activeNodeProperties.angleDegrees,
                                        )
                                    "
                                />
                            </ExperienceDesignerEditorInputsBlockRow>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                    <ExperienceDesignerEditorInputsBlock
                        v-if="activeNode!.type === 'HemisphericLight'"
                    >
                        <template #heading-text>Light color</template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <template #description>
                                    Specify the color of the light emitted in the direction of this
                                    hemispheric light
                                </template>
                                <MColorInput
                                    v-model="activeNodeProperties.groundColorHEX"
                                    @input="
                                        handleInput(
                                            'groundColorHEX',
                                            activeNodeProperties.groundColorHEX,
                                        )
                                    "
                                />
                            </ExperienceDesignerEditorInputsBlockRow>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                    <ExperienceDesignerEditorInputsBlock v-if="isALightType(activeNode!.type)">
                        <template v-if="activeNode!.type === 'HemisphericLight'" #heading-text
                            >Opposite direction light color</template
                        >
                        <template v-else #heading-text>Light color</template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <template
                                    v-if="activeNode!.type === 'HemisphericLight'"
                                    #description
                                >
                                    Specify the color of the light emitted in the opposite direction
                                    of this hemispheric light
                                </template>
                                <template v-else #description>
                                    Specify the color of the light emitted
                                </template>
                                <MColorInput
                                    v-model="activeNodeProperties.diffuseColorHEX"
                                    @input="
                                        handleInput(
                                            'diffuseColorHEX',
                                            activeNodeProperties.diffuseColorHEX,
                                        )
                                    "
                                />
                            </ExperienceDesignerEditorInputsBlockRow>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                    <ExperienceDesignerEditorInputsBlock
                        v-if="
                            isALightType(activeNode!.type) && activeNode!.type != 'HemisphericLight'
                        "
                    >
                        <template #heading-text>Shadows</template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <template #description>
                                    Specify if shadows are enabled for this light. They will then be
                                    casted on the elements which are enabled to receive them
                                </template>
                                <MToggle
                                    v-model="activeNodeProperties.areShadowsEnabled"
                                    @click="
                                        handleInput(
                                            'areShadowsEnabled',
                                            activeNodeProperties.areShadowsEnabled,
                                        )
                                    "
                                />
                            </ExperienceDesignerEditorInputsBlockRow>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                </template>
                <template v-else-if="activePropertyCategory == 'interactions'">
                    <ExperienceDesignerEditorInputsBlock>
                        <template #heading-text>Examination</template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <template #description>
                                    Allow this element to be examined in a dedicated screen by
                                    clicking or tapping on it
                                </template>
                                <MToggle
                                    v-model="activeNodeProperties.isExaminationScreenEnabled"
                                    @click="
                                        handleInput(
                                            'isExaminationScreenEnabled',
                                            activeNodeProperties.isExaminationScreenEnabled,
                                        )
                                    "
                                />
                            </ExperienceDesignerEditorInputsBlockRow>
                            <ExperienceDesignerEditorInputsBlockRow
                                v-show="activeNodeProperties.isExaminationScreenEnabled"
                            >
                                <MButton @click="handleConfigureExaminationScreenButtonClickEvents">
                                    Configure examination screen
                                </MButton>
                            </ExperienceDesignerEditorInputsBlockRow>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                    <ExperienceDesignerEditorInputsBlock v-if="isAMeshType(activeNode!.type)">
                        <template #heading-text>Collisions</template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <template #description>
                                    Enable collisions for this element
                                </template>
                                <MToggle
                                    v-model="activeNodeProperties.areCollisionsEnabled"
                                    @click="
                                        handleInput(
                                            'areCollisionsEnabled',
                                            activeNodeProperties.areCollisionsEnabled,
                                        )
                                    "
                                />
                            </ExperienceDesignerEditorInputsBlockRow>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                </template>
            </div>
        </template>
        <template
            v-else-if="
                experienceDesignerStore.activeNodeId === null &&
                experienceDesignerStore.isSceneSelected === true
            "
        >
            <MSelect
                v-model="activeScenePropertyCategory"
                placeholder-text="Select a property category"
                :options="selectableScenePropertyCategories"
            />
            <div class="editor__body">
                <template v-if="activeScenePropertyCategory == 'experienceSettings'">
                    <ExperienceDesignerEditorInputsBlock>
                        <template #heading-text>Scene sky texture</template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <template #description
                                    >Specify the background image to use for simulating a sky or an
                                    environment. For best results, use an image with an aspect ratio
                                    of 2:1 (example: 4096×2048 px)</template
                                >
                            </ExperienceDesignerEditorInputsBlockRow>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <img
                                    :src="experienceDesignerStore.skyTextureSrc"
                                    alt=""
                                    style="width: 100%"
                                />
                            </ExperienceDesignerEditorInputsBlockRow>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <MButton @click="handleUploadNewSceneSkyTextureButtonClickEvents"
                                    >Upload a new sky texture</MButton
                                >
                            </ExperienceDesignerEditorInputsBlockRow>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                    <ExperienceDesignerEditorInputsBlock>
                        <template #heading-text>PBR materials reflection texture (.env)</template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <template #description
                                    >Specify the texture to use as a reflection texture for 3D
                                    models which use Physically Based Rendering (PBR) materials.<br />Use
                                    <a
                                        href="https://www.babylonjs.com/tools/ibl/"
                                        target="_blank"
                                        style="color: var(--mersive-c-white)"
                                        >this tool</a
                                    >
                                    to convert an .hdr image in an .env texture</template
                                >
                            </ExperienceDesignerEditorInputsBlockRow>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <MButton
                                    @click="handleUploadNewSceneEnvironmentTextureButtonClickEvents"
                                    >Upload a new reflection texture</MButton
                                >
                            </ExperienceDesignerEditorInputsBlockRow>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                </template>
                <template v-if="activeScenePropertyCategory == 'experienceCameraSettings'">
                    <ExperienceDesignerEditorInputsBlock>
                        <template #heading-text>Initial position</template>
                        <template #heading-buttons>
                            <ExperienceDesignerEditorInputsBlockHeadingButton
                                :is-enabled="
                                    experienceDesignerStore.isSetExperiencePlayerCameraInitialPositionToObjectPointModeEnabled
                                "
                                tooltip-text="Set the position by clicking on a point of an object"
                                :icon-path="pointerClickTargetPointIcon"
                                @click="
                                    handleSetExperiencePlayerCameraInitialPositionToObjectPointButtonClick
                                "
                            />
                        </template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockInputsColumn>
                                <MNumericInputField
                                    v-model.number="
                                        experienceDesignerStore.experiencePlayerCameraProperties
                                            .initialPosition.x
                                    "
                                    step="any"
                                    text-before-input="X"
                                    text-after-input="m"
                                    theme="ed-editor-input"
                                />
                                <MNumericInputField
                                    v-model.number="
                                        experienceDesignerStore.experiencePlayerCameraProperties
                                            .initialPosition.y
                                    "
                                    step="any"
                                    text-before-input="Y"
                                    text-after-input="m"
                                    theme="ed-editor-input"
                                />
                                <MNumericInputField
                                    v-model.number="
                                        experienceDesignerStore.experiencePlayerCameraProperties
                                            .initialPosition.z
                                    "
                                    step="any"
                                    text-before-input="Z"
                                    text-after-input="m"
                                    theme="ed-editor-input"
                                />
                            </ExperienceDesignerEditorInputsBlockInputsColumn>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                    <ExperienceDesignerEditorInputsBlock>
                        <template #heading-text>Initial rotation</template>
                        <template #heading-buttons>
                            <ExperienceDesignerEditorInputsBlockHeadingButton
                                tooltip-text="Reset the rotation"
                                :icon-path="resetIcon"
                                @click="handleResetExperiencePlayerCameraInitialRotationButtonClick"
                            />
                        </template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockInputsColumn>
                                <MNumericInputField
                                    v-model.number="
                                        experienceDesignerStore.experiencePlayerCameraProperties
                                            .initialRotation.x
                                    "
                                    step="any"
                                    text-before-input="X"
                                    text-after-input="°"
                                    theme="ed-editor-input"
                                />
                                <MNumericInputField
                                    v-model.number="
                                        experienceDesignerStore.experiencePlayerCameraProperties
                                            .initialRotation.z
                                    "
                                    step="any"
                                    text-before-input="Z"
                                    text-after-input="°"
                                    theme="ed-editor-input"
                                />
                            </ExperienceDesignerEditorInputsBlockInputsColumn>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                    <ExperienceDesignerEditorInputsBlock>
                        <template #heading-text>Field of View</template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <MNumericInputField
                                    v-model.number="
                                        experienceDesignerStore.experiencePlayerCameraProperties
                                            .FOVDegrees
                                    "
                                    :min="6"
                                    :max="150"
                                    :step="0.01"
                                    text-after-input="°"
                                    theme="ed-editor-input"
                                    style="width: 70%"
                                />
                                <MRange
                                    v-model.number="
                                        experienceDesignerStore.experiencePlayerCameraProperties
                                            .FOVDegrees
                                    "
                                    :min="6"
                                    :max="150"
                                    :step="0.01"
                                />
                            </ExperienceDesignerEditorInputsBlockRow>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                    <ExperienceDesignerEditorInputsBlock>
                        <template #heading-text>Walking speed</template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <template #description>
                                    Specify the movement speed of the camera when walking. When
                                    sprinting, the speed will be double this value.
                                </template>
                            </ExperienceDesignerEditorInputsBlockRow>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <MNumericInputField
                                    v-model.number="
                                        experienceDesignerStore.experiencePlayerCameraProperties
                                            .speed
                                    "
                                    :min="0.1"
                                    :step="0.1"
                                    text-after-input="m/s"
                                    theme="ed-editor-input"
                                    style="width: 70%"
                                />
                                <MRange
                                    v-model.number="
                                        experienceDesignerStore.experiencePlayerCameraProperties
                                            .speed
                                    "
                                    :min="0.1"
                                    :max="10"
                                    :step="0.1"
                                />
                            </ExperienceDesignerEditorInputsBlockRow>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                    <ExperienceDesignerEditorInputsBlock>
                        <template #heading-text>Inertia</template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <template #description>
                                    Specify the camera movement smoothness
                                </template>
                            </ExperienceDesignerEditorInputsBlockRow>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <MNumericInputField
                                    v-model.number="
                                        experienceDesignerStore.experiencePlayerCameraProperties
                                            .inertiaPercentage
                                    "
                                    :min="0"
                                    :max="98"
                                    :step="0.1"
                                    text-after-input="%"
                                    theme="ed-editor-input"
                                    style="width: 70%"
                                />
                                <MRange
                                    v-model.number="
                                        experienceDesignerStore.experiencePlayerCameraProperties
                                            .inertiaPercentage
                                    "
                                    :min="0"
                                    :max="98"
                                    :step="0.1"
                                />
                            </ExperienceDesignerEditorInputsBlockRow>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                    <ExperienceDesignerEditorInputsBlock>
                        <template #heading-text>Sensitivity</template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <template #description
                                    >Specify the camera rotation sensitivity: the higher the value,
                                    the more dragging motion is needed to rotate the
                                    camera</template
                                >
                            </ExperienceDesignerEditorInputsBlockRow>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <MNumericInputField
                                    v-model.number="
                                        experienceDesignerStore.experiencePlayerCameraProperties
                                            .sensitivity
                                    "
                                    :min="100"
                                    :max="1_000_0"
                                    :step="10"
                                    theme="ed-editor-input"
                                    style="width: 70%"
                                />
                                <MRange
                                    v-model.number="
                                        experienceDesignerStore.experiencePlayerCameraProperties
                                            .sensitivity
                                    "
                                    :min="100"
                                    :max="1_000_0"
                                    :step="10"
                                />
                            </ExperienceDesignerEditorInputsBlockRow>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                    <ExperienceDesignerEditorInputsBlock>
                        <template #heading-text>Preview camera settings</template>
                        <template #body>
                            <ExperienceDesignerEditorInputsBlockRow>
                                <template #description
                                    >Enable this option to apply all the settings to the current 3D
                                    Viewport camera and see the changes in real time</template
                                >
                                <MToggle
                                    v-model="
                                        experienceDesignerStore.isPreviewExperiencePlayerCameraSettingsModeEnabled
                                    "
                                />
                            </ExperienceDesignerEditorInputsBlockRow>
                        </template>
                    </ExperienceDesignerEditorInputsBlock>
                </template>
            </div>
        </template>
    </div>
</template>

<style scoped>
.editor {
    position: absolute;
    top: 375px;
    right: 24px;

    width: 300px;
    max-height: 500px;

    display: flex;
    flex-direction: column;
    align-items: flex-start;

    background-color: var(--mersive-c-black-op-80);
    color: var(--mersive-c-white);
    border-radius: 12px;

    padding: 24px;

    backdrop-filter: blur(4px);
    user-select: none;
}

.editor__heading {
    font-size: 0.9em;
    font-weight: 700;

    margin: 0 0 1em 0;
}

.editor__no-element-selected-text {
    color: var(--mersive-c-white-softer);
    font-size: 0.8em;
    line-height: 1.4;
}

.editor__property-category-dropdown {
    font-weight: 600;
    font-size: 0.8em;

    outline: none;
    border: none;
    border-radius: 6px;
    padding: 0.4em 0.8em;
    margin: 0 0 1em 0;

    background-color: var(--mersive-c-grey);
    color: var(--mersive-c-white);

    cursor: pointer;
}

.editor__property-category-dropdown:hover {
    background-color: var(--mersive-c-grey-dark);
}

.editor__property-category-dropdown option {
    font-weight: 400;
    font-size: 1em;

    padding: 1em 0;

    background-color: var(--mersive-c-grey-dark);
    color: var(--mersive-c-white);
}

.editor__body {
    width: 100%;
    max-height: 380px;

    display: flex;
    flex-direction: column;
    align-items: flex-start;

    overflow-y: auto;
    padding-right: 6px;

    gap: 1em 0;
}

.editor__body::-webkit-scrollbar {
    width: 4px;
}

.editor__body::-webkit-scrollbar-track {
    background: var(--mersive-c-black);
    border-radius: 6px;
}

.editor__body::-webkit-scrollbar-thumb {
    background: white;
    border-radius: 6px;
}
</style>
