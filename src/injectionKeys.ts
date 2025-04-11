import type { FileWithHandle } from 'browser-fs-access'
import type { InjectionKey, Ref } from 'vue'

export const experienceToEditOrPlayFileWithHandleIK = Symbol() as InjectionKey<
    Ref<FileWithHandle | undefined>
>

export const experienceToPlayStringifiedSceneIK = Symbol() as InjectionKey<Ref<string | undefined>>

export const experienceDesignerElementsLibrarySearchQueryIK = Symbol() as InjectionKey<Ref<string>>
