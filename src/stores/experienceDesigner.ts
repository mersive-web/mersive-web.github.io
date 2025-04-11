import type { ExperiencePlayerCameraProperties, Tool } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useExperienceDesignerStore = defineStore('experienceDesignerStore', () => {
    const options = ref({
        showToolsPanel: true,
        showElementsLibrary: true,
        showOutliner: true,
        showEditor: true,
        showBottomBar: true,
        showGrid: true,
    })

    const statusInitialValue = 'Busy'
    const status = ref(statusInitialValue)

    const statistics = ref({
        fps: 0,
        memoryUsedMB: 0,
        numberOfVertices: 0,
        numberOfFaces: 0,
        numberOfMeshes: 0,
        numberOfElements: 0,
    })

    const topBarMenuBarData = ref({
        showMenuItems: false,
        activeMenu: '',
    })

    function setTopBarMenuBarActiveMenu(menuName: string) {
        if (topBarMenuBarData.value.showMenuItems) {
            topBarMenuBarData.value.activeMenu = menuName
        }
    }

    function toggleTopBarMenuBarShowMenuItems(menuName: string) {
        topBarMenuBarData.value.showMenuItems = !topBarMenuBarData.value.showMenuItems
        setTopBarMenuBarActiveMenu(menuName)
    }

    const activeToolInitialValue: Tool = 'select'
    const activeTool = ref<Tool>(activeToolInitialValue)
    function setActiveTool(tool: Tool) {
        activeTool.value = tool
    }

    const enabledToolsInitialValue: Tool[] = ['select', 'move', 'rotate', 'scale']
    const enabledTools = ref<Tool[]>(enabledToolsInitialValue)

    function setEnabledTools(toolsToEnable: Tool[]) {
        enabledTools.value = toolsToEnable
    }

    function toggleOption(option: keyof typeof options.value) {
        options.value[option] = !options.value[option]
    }

    const activeNodeId = ref<null | string>(null)

    const copyEnabled = computed(() => {
        return activeNodeId.value === null ? false : true
    })

    const isPasteEnabled = ref(false)

    const duplicateEnabled = computed(() => {
        return activeNodeId.value === null ? false : true
    })

    const isSetActiveElementPositionToObjectPointModeEnabled = ref(false)

    const isSetDirectionPointMeshPositionToObjectPointModeEnabled = ref(false)

    const lockAspectRatioModeEnabled = ref(false)

    const isExperienceDesignerExaminationScreenShown = ref(false)

    const isSceneSelectedInitialValue = true
    const isSceneSelected = ref(isSceneSelectedInitialValue)

    const experiencePlayerCameraPropertiesInitialValue: ExperiencePlayerCameraProperties = {
        initialPosition: {
            x: 0,
            y: 0,
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
    const experiencePlayerCameraProperties = ref<ExperiencePlayerCameraProperties>(
        experiencePlayerCameraPropertiesInitialValue,
    )

    const isSetExperiencePlayerCameraInitialPositionToObjectPointModeEnabled = ref(false)

    const isPreviewExperiencePlayerCameraSettingsModeEnabled = ref(false)

    const skyTextureSrc = ref('')

    function reset() {
        status.value = statusInitialValue

        activeTool.value = activeToolInitialValue
        setEnabledTools(enabledToolsInitialValue)

        activeNodeId.value = null

        isPasteEnabled.value = false
        isSetActiveElementPositionToObjectPointModeEnabled.value = false
        isSetDirectionPointMeshPositionToObjectPointModeEnabled.value = false
        lockAspectRatioModeEnabled.value = false
        isExperienceDesignerExaminationScreenShown.value = false
        isSceneSelected.value = isSceneSelectedInitialValue
        isSetExperiencePlayerCameraInitialPositionToObjectPointModeEnabled.value = false
        isPreviewExperiencePlayerCameraSettingsModeEnabled.value = false

        experiencePlayerCameraProperties.value = experiencePlayerCameraPropertiesInitialValue

        skyTextureSrc.value = ''

        experienceName.value = experienceNameInitialValue

        options.value.showGrid = true
    }

    // Keep the version in sync with the one in package.json
    const mersiveVersion = '1.0.0'

    const experienceNameInitialValue = 'Untitled Experience'
    const experienceName = ref(experienceNameInitialValue)

    const areThereAnyUnsavedChangesSinceLastSave = ref(false)
    const wasTheExperienceFileSavedAtLeastOnce = ref(false)
    const areThereSavingOrOpeningOperationsInProgress = ref(false)

    const isCreateNewExperienceOperationInProgress = ref(false)

    const isPlayExperienceModeEnabled = ref(false)

    return {
        options,
        toggleOption,
        status,
        statistics,
        topBarMenuBarData,
        setTopBarMenuBarActiveMenu,
        toggleTopBarMenuBarShowMenuItems,
        activeTool,
        setActiveTool,
        enabledTools,
        setEnabledTools,
        activeNodeId,
        duplicateEnabled,
        copyEnabled,
        isPasteEnabled,
        isSetActiveElementPositionToObjectPointModeEnabled,
        isSetDirectionPointMeshPositionToObjectPointModeEnabled,
        lockAspectRatioModeEnabled,
        isExperienceDesignerExaminationScreenShown,
        isSceneSelected,
        experiencePlayerCameraProperties,
        isSetExperiencePlayerCameraInitialPositionToObjectPointModeEnabled,
        isPreviewExperiencePlayerCameraSettingsModeEnabled,
        skyTextureSrc,
        reset,
        mersiveVersion,
        experienceName,
        areThereAnyUnsavedChangesSinceLastSave,
        wasTheExperienceFileSavedAtLeastOnce,
        areThereSavingOrOpeningOperationsInProgress,
        isCreateNewExperienceOperationInProgress,
        isPlayExperienceModeEnabled,
    }
})
