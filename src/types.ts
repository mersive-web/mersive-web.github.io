import type { Matrix, Vector3 } from '@babylonjs/core'

export type Tool = 'select' | 'move' | 'rotate' | 'scale'

export interface SceneNodeData {
    id: string
    isVisible: boolean
    type: string
    name: string
}

export interface MovableNodeProperties {
    positionX: number
    positionY: number
    positionZ: number
}

export interface MeshProperties extends MovableNodeProperties {
    isExaminationScreenEnabled: boolean
    rotationX: number
    rotationY: number
    rotationZ: number
    dimensionX: number
    dimensionY: number | undefined
    dimensionZ: number | undefined
    canReceiveShadows: boolean
    areCollisionsEnabled: boolean
    materialDiffuseColorHEX: string | undefined
    materialEmissiveColorHEX: string | undefined
    materialAlphaPercentage: number | undefined
}

interface LightProperties {
    intensity: number
    diffuseColorHEX: string
}

export type MovableLightProperties = MovableNodeProperties &
    LightProperties & {
        areShadowsEnabled: boolean
    }

export interface DirectionableLightProperties extends LightProperties {
    directionPointX: number
    directionPointY: number
    directionPointZ: number
}

type MovableAndDirectionableLightProperties = MovableLightProperties & DirectionableLightProperties

export type PointLightProperties = MovableLightProperties

export type DirectionalLightProperties = MovableAndDirectionableLightProperties

export interface SpotLightProperties extends MovableAndDirectionableLightProperties {
    angleDegrees: number
}

export interface HemisphericLightProperties extends DirectionableLightProperties {
    groundColorHEX: string
}

type NodeProperties =
    | MeshProperties
    | PointLightProperties
    | DirectionalLightProperties
    | SpotLightProperties
    | HemisphericLightProperties

export interface INodeProperties
    extends MeshProperties,
        PointLightProperties,
        DirectionalLightProperties,
        SpotLightProperties,
        HemisphericLightProperties {}

export interface NodeData {
    type: string
    properties: NodeProperties | undefined
}

export interface MeshMetadata {
    examinationScreenData: {
        screenTitle: string
        overviewTitle: string
        overviewDescription: string
        sceneClearColorHEX: string
        cameraFOVRadians: number
        lightIntensity: number
        topLightColorHEX: string
        bottomLightColorHEX: string
        cameraInitialPosition: {
            alpha: number
            beta: number
            radius: number
        }
    }
    hierarchyBoundingVectorsWithNoTransformations: {
        min: Vector3
        max: Vector3
    }
    isExaminationScreenEnabled: boolean
    worldMatrixWithNoTransformations: Matrix
}

export interface POIMetadata {
    detailName: string
    detailDescription: string
    role: string
    settings: {
        colorHEXWhenActive: string
        colorHEXWhenNotActive: string
        opacityPercentageWhenActive: number
        opacityPercentageWhenNotActive: number
    }
}

export interface DirectionableLightMetadata {
    directionPointMeshGizmoPosition: {
        x: number
        y: number
        z: number
    }
}

export interface ExperiencePlayerCameraProperties {
    initialPosition: {
        x: number
        y: number
        z: number
    }
    initialRotation: {
        x: number
        z: number
    }
    FOVDegrees: number
    speed: number
    inertiaPercentage: number
    sensitivity: number
}

export interface SceneMetadata {
    mersiveVersionWhenExperienceWasLastSaved: string
    experienceDesignerCameraPositionWhenExperienceWasLastSaved: {
        x: number
        y: number
        z: number
    }
    experienceDesignerCameraRotationWhenExperienceWasLastSaved: {
        x: number
        y: number
        z: number
    }
}

export type ElementType =
    | 'plane'
    | 'cube'
    | 'disc'
    | 'sphere'
    | 'cylinder'
    | 'torus'
    | 'pointLight'
    | 'directionalLight'
    | 'spotLight'
    | 'hemisphericLight'

export type ElementsLibraryCategory =
    | 'All categories'
    | 'Basic meshes'
    | 'Lights'
    | 'Architecture'
    | 'Furnitures'
    | 'Decorations'
    | 'Nature'
