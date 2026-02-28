// SceneEditor — composes the left LayerStack and right PropertiesPanel.
// App.tsx mounts this single component; the sub-panels manage their own
// open/close state via useGlobalStore.editorOpen and selectedLayerId.
import { LayerStack } from './LayerStack'
import { PropertiesPanel } from './PropertiesPanel'

export function SceneEditor() {
    return (
        <>
            <LayerStack />
            <PropertiesPanel />
        </>
    )
}
