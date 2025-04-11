import mitt from 'mitt'
import type {
    ElementsLibraryCategory,
    ElementType,
    INodeProperties,
    MeshMetadata,
    NodeData,
    SceneNodeData,
} from './types'

// Mitt requires a type for typing events, so we can't use an interface.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Events = {
    activeNodeDataUpdated: {
        newNodeData: NodeData
    }
    activeNodeUpdated: {
        newActiveNodeId: string
    }
    configureExaminationScreenButtonClicked: void
    copyActiveElementCommandExecuted: void
    createNewExperienceCommandExecuted: void
    duplicateActiveElementCommandExecuted: void
    editorInput: {
        inputData: {
            name: keyof INodeProperties
            value: unknown
        }
    }
    elementsLibraryBuiltInElementButtonClicked: {
        elementType: ElementType
    }
    elementsLibraryCategoryChanged: {
        newCategory: ElementsLibraryCategory
    }
    elementExaminationScreenClosed: {
        currentElementMetadata?: MeshMetadata
        currentElementPOIsSerializedStringified?: string[]
    }
    elementExaminationScreenOpened: void
    elementExaminationScreenSerializeMeshFinished: { serializedMeshStringified: string }
    import3DModelCommandExecuted: void
    loadingScreenShown: {
        loadingScreenData: {
            loadingBackgroundColor: string
            loadingText: string
        }
    }
    loadingScreenHidden: void
    nodeVisibilityChanged: {
        nodeVisibilityData: {
            id: string
            isVisible: boolean
        }
    }
    openExperienceCommandExecuted: void
    outlinerNodeRenamed: {
        renamedNodeData: {
            nodeToRenameId: string
            newName: string
        }
    }
    outlinerNodeSelected: {
        selectedNodeId: string
    }
    outlinerSceneSelected: void
    pasteElementCommandExecuted: void
    playExperienceCommandExecuted: void
    resetActiveElementDimensionsButtonClicked: void
    resetActiveElementRotationButtonClicked: void
    saveExperienceAsCommandExecuted: void
    saveExperienceCommandExecuted: void
    sceneNodesDataUpdated: {
        sceneNodesData: SceneNodeData[]
    }
    showAboutMersiveCommandExecuted: void
    showCreditsCommandExecuted: void
    showKeyboardShortcutsCommandExecuted: void
    toggleBottomBarCommandExecuted: void
    toggleEditorCommandExecuted: void
    toggleElementsLibraryCommandExecuted: void
    toggleGridCommandExecuted: void
    toggleOutlinerCommandExecuted: void
    toggleToolsPanelCommandExecuted: void
    uploadNewSceneEnvironmentTextureButtonClicked: void
    uploadNewSceneSkyTextureButtonClicked: void
}

export default mitt<Events>()
