import type MersiveExperienceDesignerCamera from '@/babylonjs/mersiveExperienceDesignerCamera'
import { BoundingInfo, Mesh, Vector3, type AbstractMesh, type Node } from '@babylonjs/core'
import type { MeshMetadata } from './types'

export function isAMeshType(type: string): boolean {
    return ['Mesh', 'GroundMesh'].includes(type)
}

export function isNodeAMesh(node: Node): boolean {
    return isAMeshType(node.getClassName())
}

export function isALightType(type: string): boolean {
    return ['PointLight', 'DirectionalLight', 'SpotLight', 'HemisphericLight'].includes(type)
}

export function isNodeALight(node: Node): boolean {
    return isALightType(node.getClassName())
}

/**
 * @see MovableLight
 */
export function isAMovableLightType(type: string): boolean {
    return ['PointLight', 'DirectionalLight', 'SpotLight'].includes(type)
}

export function isNodeAMovableLight(node: Node): boolean {
    return isAMovableLightType(node.getClassName())
}

/**
 * @see DirectionableLight
 */
export function isADirectionableLightType(type: string): boolean {
    return ['DirectionalLight', 'SpotLight', 'HemisphericLight'].includes(type)
}

export function isNodeADirectionableLight(node: Node): boolean {
    return isADirectionableLightType(node.getClassName())
}

/**
 * @see MovableNode
 */
export function isAMovableNodeType(type: string): boolean {
    if (isAMeshType(type)) {
        return true
    }

    if (isAMovableLightType(type)) {
        return true
    }

    return false
}

export function isNodeMovable(node: Node): boolean {
    return isAMovableNodeType(node.getClassName())
}

export function isNodeAPointOfInterest(nodeToCheck: Node): boolean {
    if (nodeToCheck?.metadata?.role == 'POINT_OF_INTEREST') {
        return true
    } else {
        return false
    }
}

export function radiansToDegrees(angleInRadians: number): number {
    return ((180 * angleInRadians) / Math.PI) % 360
}

export function degreesToRadians(angleInDegrees: number): number {
    return (Math.PI * (angleInDegrees % 360)) / 180
}

export function getMeshDimensionsVector(mesh: AbstractMesh): Vector3 {
    // The dimensions computed using the procedure below are wrong when there's a rotation
    // and/or a scaling applied to the mesh, because it alters the hierarchyBoundingVectors
    // data in a way that prevents to obtain the real dimensions of the mesh.
    // So, use the hierarchyBoundingVectors data with no rotation/scaling applied, which is stored
    // in the mesh metadata in the hierarchyBoundingVectorsWithNoTransformations property.

    const hierarchyBoundingVectorsWithNoTransformations = (mesh.metadata as MeshMetadata)
        .hierarchyBoundingVectorsWithNoTransformations

    const meshDimensionsVector: Vector3 = hierarchyBoundingVectorsWithNoTransformations.max
        .subtract(hierarchyBoundingVectorsWithNoTransformations.min)
        .multiply(mesh.scaling)

    // The scaling components can be negative, but dimensions have to be positive.
    meshDimensionsVector.set(
        Math.abs(meshDimensionsVector.x),
        Math.abs(meshDimensionsVector.y),
        Math.abs(meshDimensionsVector.z),
    )

    return meshDimensionsVector
}

export function createMeshMetadataWithNoTransformations(mesh: AbstractMesh): void {
    // The dimensions computed using getHierarchyBoundingVectors data and the bounding info
    // data are wrong when there's a rotation and/or a scaling applied to the mesh.
    // (see getMeshDimensionsVector and buildMeshHierarchyBoundingInfo).
    // So, get the needed data by disabling (hiding) the mesh and resetting its rotation
    // and scaling.
    if (mesh.rotationQuaternion) {
        const meshEulerAnglesRotationFromQuaternion = mesh.rotationQuaternion.toEulerAngles()
        mesh.rotationQuaternion = null
        mesh.rotation = meshEulerAnglesRotationFromQuaternion
    }

    const meshInitialRotation = mesh.rotation.clone()
    const meshInitialScaling = mesh.scaling.clone()
    mesh.rotation = new Vector3(0, 0, 0)
    mesh.scaling = new Vector3(1, 1, 1)

    if (mesh.metadata === null) {
        mesh.metadata = {}
    }

    const meshMetadata = mesh.metadata as MeshMetadata
    meshMetadata.hierarchyBoundingVectorsWithNoTransformations = mesh.getHierarchyBoundingVectors()
    meshMetadata.worldMatrixWithNoTransformations = mesh.computeWorldMatrix(true).clone()

    // Restore the initial mesh rotation and scaling after setting the mesh metadata
    mesh.rotation = meshInitialRotation
    mesh.scaling = meshInitialScaling
}

// TODO: can we use refreshBoundingInfo?
export function buildMeshHierarchyBoundingInfo(mesh: AbstractMesh): void {
    const meshMetadata = mesh.metadata as MeshMetadata

    const {
        min: meshWorldMinVectorWithNoTransformations,
        max: meshWorldMaxVectorWithNoTransformations,
    } = meshMetadata.hierarchyBoundingVectorsWithNoTransformations

    // getHierarchyBoundingVectors returns vectors in world space,
    // but BoundingInfo needs these vectors in local space
    // LOCAL => WORLD: we have to use the node WORLD matrix as the transformation matrix
    // WORLD => LOCAL: we have to use the node LOCAL matrix (which is the inverse of the node WORLD matrix) as the transformation matrix

    const meshWorldInverseMatrixWithNoTransformations =
        meshMetadata.worldMatrixWithNoTransformations.clone().invert()
    const meshLocalMinVectorWithNoTransformations = Vector3.TransformCoordinates(
        meshWorldMinVectorWithNoTransformations,
        meshWorldInverseMatrixWithNoTransformations,
    )
    const meshLocalMaxVectorWithNoTransformations = Vector3.TransformCoordinates(
        meshWorldMaxVectorWithNoTransformations,
        meshWorldInverseMatrixWithNoTransformations,
    )

    mesh.setBoundingInfo(
        new BoundingInfo(
            meshLocalMinVectorWithNoTransformations,
            meshLocalMaxVectorWithNoTransformations,
        ),
    )
}

export function getCameraFramingHorizontalAxis(camera: MersiveExperienceDesignerCamera): Vector3 {
    const cameraFramingHorizontalAxis = new Vector3()
    const cameraYRotationNormalized = normalizeAngleFromRadiansInDegrees(camera.rotation.y)
    if (
        (cameraYRotationNormalized >= 0 && cameraYRotationNormalized <= 45) ||
        (cameraYRotationNormalized >= 315 && cameraYRotationNormalized <= 360)
    ) {
        cameraFramingHorizontalAxis.set(1, 0, 0)
    } else if (cameraYRotationNormalized > 45 && cameraYRotationNormalized <= 135) {
        cameraFramingHorizontalAxis.set(0, 0, -1)
    } else if (cameraYRotationNormalized > 135 && cameraYRotationNormalized <= 225) {
        cameraFramingHorizontalAxis.set(-1, 0, 0)
    } else if (cameraYRotationNormalized > 225 && cameraYRotationNormalized < 315) {
        cameraFramingHorizontalAxis.set(0, 0, 1)
    }

    return cameraFramingHorizontalAxis
}

export function getMeshMaxDimension(mesh: Mesh): number {
    const meshDimensionsVector = getMeshDimensionsVector(mesh)

    const meshMaxDimension = Math.max(
        meshDimensionsVector.x,
        meshDimensionsVector.y,
        meshDimensionsVector.z,
    )

    return meshMaxDimension
}

export function scaleMeshUniformlyToReachDesiredMaxDimension(
    mesh: Mesh,
    desiredMeshMaxDimension: number,
    currentMeshMaxDimension: number,
): void {
    mesh.scaling
        .multiplyInPlace(
            new Vector3(desiredMeshMaxDimension, desiredMeshMaxDimension, desiredMeshMaxDimension),
        )
        .divideInPlace(
            new Vector3(currentMeshMaxDimension, currentMeshMaxDimension, currentMeshMaxDimension),
        )

    mesh.computeWorldMatrix(true)
}

export function roundNumber(number: number, decimalPlaces: number): number {
    if (decimalPlaces < 0) {
        throw new Error("decimalPlaces parameter can't be negative")
    }

    if (decimalPlaces > 100) {
        throw new Error("decimalPlaces parameter can't be greater than 100")
    }

    if (Number.isInteger(decimalPlaces) === false) {
        throw new Error("decimalPlaces parameter can't be a floating point number")
    }

    return Number(number.toFixed(decimalPlaces))
}

interface PerformanceWithMemory extends Performance {
    memory: {
        totalJSHeapSize: number
    }
}
/**
 * Get the memory used by the web page, using the Performance Memory API.
 *
 * This function will be updated when Performance.measureUserAgentSpecificMemory() will become widely available in Browsers.
 *
 * @returns The memory used by the web page, in MegaBytes (MB) if the Performance Memory API is available, -1 otherwise.
 */
export function getMemoryUsedMB(): number {
    const performanceInfo = performance as PerformanceWithMemory
    if (performanceInfo.memory?.totalJSHeapSize !== undefined) {
        return roundNumber(performanceInfo.memory.totalJSHeapSize / 1e6, 2)
    } else {
        return -1
    }
}

/**
 * Returns the angle in degrees, between 0° and 359.99...°.
 * Negative angles will be converted accordingly (i.e. -20° will become 340°).
 *
 * @param angleInRadians
 */
export function normalizeAngleFromRadiansInDegrees(angleInRadians: number): number {
    return radiansToDegrees(angleInRadians) < 0
        ? 360 - Math.abs(radiansToDegrees(angleInRadians))
        : radiansToDegrees(angleInRadians)
}
