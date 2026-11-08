import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { TRANSLATIONS } from '../src/i18n/translations'
import { selectClearIds, sameClearIds } from '../src/lib/clearPlan'

const base = join(__dirname,'..')
const read=(f:string)=>readFileSync(join(base,f),'utf8')

describe('PLIUM UI/UX shared contract',()=>{
  it('the top and side Clear menus expose the same filtered scope',()=>{
    const panel=read('src/components/Panel.tsx')
    const menu=read('src/components/ClearMenu.tsx')
    expect(panel).toContain("filtered: typeFilter !== 'all' || !!query.trim()")
    expect(panel).toContain("filtered={typeFilter !== 'all' || !!query.trim()}")
    expect(panel).not.toContain('onClearAll')
    expect(menu).not.toContain('onClearAll')
    expect(menu).toContain("onClear(currentIds)")
    expect(menu).toContain("t('item.clearFilterHint')")
  })

  it('the confirmed snapshot is the exclusive deletion authority',()=>{
    const now=1_800_000_000_000
    const items=[
      {id:'a',capturedAt:now-1_000},
      {id:'b',capturedAt:now-2_000,pinned:true},
      {id:'c',capturedAt:now-3_000,note:'keep'}
    ]
    const snapshot=selectClearIds(items,'all',now)
    expect(snapshot).toEqual(['a'])
    expect(sameClearIds(snapshot,selectClearIds([...items,{id:'new',capturedAt:now+1000}],'all',now))).toBe(false)
    const afterDeletion=items.filter(x=>!snapshot.includes(x.id))
    expect(afterDeletion.map(x=>x.id)).toEqual(['b','c'])
  })

  it('contextual menus share tokens and keyboard nesting rules',()=>{
    const clear=read('src/components/ClearMenu.tsx')
    const card=read('src/components/CardMenu.tsx')
    const css=read('src/styles/pliumMenus.css')
    const tokens=read('src/styles/tokens.css')
    expect(clear).toContain('className="plium-menu-surface plium-clear-menu"')
    expect(card).toContain('card-menu plium-menu-surface')
    expect(card).toContain('card-menu-row plium-menu-row')
    expect(clear).toContain('e.stopImmediatePropagation()')
    expect(clear).toContain('if (pending) {')
    expect(clear).toContain('cancelButtonRef.current?.focus()')
    expect(clear).toContain("useStore.getState().closeCardMenu()")
    expect(css).toContain('.plium-menu-row:focus-visible')
    for (const key of ['--menu-surface','--menu-radius','--menu-row-radius','--menu-row-height','--menu-row-font','--menu-hover']) {
      expect(tokens).toContain(key)
    }
  })

  it('all 31 supported locales have localized confirm and filter labels',()=>{
    const base=TRANSLATIONS.en.item
    const keys=['clearAllFiltered','clearConfirmTitle','clearConfirmCount','clearConfirmKept',
      'clearConfirmWarning','clearConfirmCancel','clearConfirmAction','clearFilterHint'] as const
    expect(Object.keys(TRANSLATIONS)).toHaveLength(31)
    for (const [lang,translation] of Object.entries(TRANSLATIONS)){
      for(const key of keys){
        const value=translation.item[key]
        expect(value,lang+' '+key).toBeTruthy()
        if(lang!=='en')expect(value,lang+' '+key+' unexpectedly still English').not.toBe(base[key])
        if(['clearConfirmCount','clearConfirmKept'].includes(key))expect(value).toContain('{count}')
      }
    }
  })

  it('quality workflow is owned by PLIUM and gates PRs',()=>{
    const workflow=read('.github/workflows/quality.yml')
    expect(workflow).toContain('pull_request:')
    expect(workflow).toContain('Windows quality')
    expect(workflow).toContain('npm audit --registry=https://registry.npmjs.org --audit-level=moderate')
  })
})
