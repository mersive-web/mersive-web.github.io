import { Color3, GroundMesh, Scene, Texture } from '@babylonjs/core'
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder'
import { GridMaterial } from '@babylonjs/materials'
import opacityTexture from '@/assets/textures/white_faded_circle.png?url'

class FloorGrid {
    private gridMesh: GroundMesh

    constructor(scene: Scene, id: string) {
        /**
         * This method only works if there are already objects in the scene,
         * because it calculates width and depth using the world existing
         * dimensions: so, if there are no objects, the world dimension will be 0
         * (actually, is infinity, but it seems to treat that dimension like 0)
         */
        // const worldExtends = scene.getWorldExtends();
        // const width = (worldExtends.max.x - worldExtends.min.x) * 100.0;
        // const depth = (worldExtends.max.z - worldExtends.min.z) * 100.0;

        const width = 10000.0
        const depth = 10000.0

        this.gridMesh = CreateGround(id, { width: 1, height: 1, subdivisions: 1 }, scene)
        this.gridMesh.scaling.x = Math.max(width, depth)
        this.gridMesh.scaling.z = this.gridMesh.scaling.x
        this.gridMesh.isPickable = false
        this.gridMesh.id = id

        const gridMeshMaterial = new GridMaterial('Grid Material', scene)
        gridMeshMaterial.majorUnitFrequency = 10
        gridMeshMaterial.minorUnitVisibility = 0.3
        gridMeshMaterial.gridRatio = 1 / Math.max(width, depth)
        gridMeshMaterial.backFaceCulling = false // Makes the grid visible both from above and below
        gridMeshMaterial.mainColor = Color3.White()
        gridMeshMaterial.lineColor = Color3.White()
        gridMeshMaterial.opacity = 0.8
        gridMeshMaterial.zOffset = 1.0
        gridMeshMaterial.opacityTexture = new Texture(opacityTexture, scene)

        this.gridMesh.material = gridMeshMaterial

        this.gridMesh.material.doNotSerialize = true
        this.gridMesh.doNotSerialize = true
    }

    public setVisibility(isVisible: boolean): void {
        this.gridMesh.isVisible = isVisible
    }

    public disposeMaterialAndOpacityTexture(): void {
        ;(this.gridMesh.material as GridMaterial).opacityTexture.dispose()
        this.gridMesh.material!.dispose(true, true)
    }
}

export default FloorGrid
