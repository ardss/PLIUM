import { describe, it, expect } from 'vitest'
import { filterClearableIds } from '../shared/itemMeta'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const read=(p:string)=>readFileSync(join(__dirname,'..',p),'utf8')
describe('PLIUM secure clear boundary',()=>{
  it('never selects pinned or noted entries, even when the renderer requests their IDs',()=>{
    const m=new Map<string,{pinned:boolean,note?:string}>([
      ['safe',{pinned:false}], ['pinned',{pinned:true}],
      ['noted',{pinned:false,note:'protected'}]
    ])
    expect(filterClearableIds(['safe','pinned','noted','not-found','safe'],id=>m.get(id))).toEqual(['safe'])
    expect(filterClearableIds([],id=>m.get(id))).toEqual([])
    expect(filterClearableIds(['pinned','noted'],id=>m.get(id))).toEqual([])
  })
  it('rechecks protection when item state changes between preview and deletion',()=>{
    const data={pinned:false,note:undefined as string|undefined}
    const fetch=()=>data
    const selected=filterClearableIds(['one'],fetch)
    expect(selected).toEqual(['one'])
    data.pinned=true
    expect(filterClearableIds(selected,fetch)).toEqual([])
    data.pinned=false
    data.note='keep'
    expect(filterClearableIds(selected,fetch)).toEqual([])
  })
  it('bulk clear goes through a distinct main-process operation that rechecks after awaiting',()=>{
    const ipc=read('electron/main/ipc.ts')
    const bridge=read('shared/bridge.ts')
    const preload=read('electron/preload/index.ts')
    const store=read('src/store/appStore.ts')
    expect(ipc).toContain("handle('item:clear-scoped'")
    expect(ipc).toContain('const currentIds = filterClearableIds(safeIds, (id) => getStore().get(id))')
    expect(ipc).toContain('if (currentIds.length > 0) getStore().deleteBatch(currentIds)')
    expect(bridge).toContain('clearScopedItems: (ids: string[])')
    expect(preload).toContain("invoke('item:clear-scoped', ids)")
    expect(store).toContain('edge.clearScopedItems(ids)')
  })
  it('inactive MSIX start-task contract stays consistent with the manifest',()=>{
    expect(read('electron/main/config.ts')).toContain("STORE_STARTUP_TASK_ID = 'PLIUMStartup'")
    expect(read('resources/appx/startup-extensions.xml')).toContain('TaskId="PLIUMStartup"')
  })
  it('deprecated Store scheme cannot escape into the OS',()=>{
    const url=read('electron/main/externalUrl.ts')
    expect(url).not.toContain("'ms-windows-store:'")
  })
})
