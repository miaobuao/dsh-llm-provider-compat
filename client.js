/**
 * Browser half of the provider developer-role compatibility bundle.
 *
 * Contributes one section to this bundle's own page in the Web Plugin Center.
 * The section lists every model provider the Harness currently serves and lets
 * the user check the providers that must not receive the OpenAI `developer`
 * role. Checking one writes `compat.supportsDeveloperRole = false` into that
 * provider's `llm-pi-ai` profile through the settings Remote, which makes the
 * adapter serialize instruction messages as `system` instead of `developer`.
 *
 * The role a gateway sees is chosen by the provider adapter, not by the
 * Harness message roles: a reasoning model on `openai-completions` /
 * `openai-responses` gets `role: "developer"` for its instructions whenever
 * `compat.supportsDeveloperRole` is not `false`. The adapter's own
 * compatibility switch is therefore the effective seam; rewriting request
 * messages cannot change the wire role.
 */
window.__ModuleLoader__.load({
  id: 'dsh-llm-provider-compat',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const PACKAGE_NAME = 'dsh-llm-provider-compat'
    /** Locale namespace owned by this plugin. */
    const NS = 'llmProviderCompat'
    /** Compatibility switch that decides the wire role of instruction messages. */
    const FIELD = 'supportsDeveloperRole'
    /** Wire protocols whose serializers can emit the `developer` role. */
    const OPENAI_APIS = ['openai-completions', 'openai-responses', 'azure-openai-responses', 'openai-codex-responses']

    /** Simplified Chinese copy. */
    const zh = {
      sectionTitle: '模型提供商 developer 角色兼容',
      sectionDescription: '列出已添加到本 profile 的模型提供商。勾选的提供商在模型调用时不再发送 role=developer，改用 system 角色，适用于会拒绝该角色的 OpenAI 兼容网关；修改写入 llm-pi-ai 的 provider compat，立即生效并保存在 profile 配置里。',
      footer: '勾选状态读取自 llm-pi-ai 的 compat.supportsDeveloperRole。取消勾选会删除该覆盖，恢复适配器自动检测。',
      loading: '正在读取模型提供商…',
      empty: '当前 profile 没有已添加的模型提供商。',
      retry: '重试',
      loadFailed: '读取模型提供商失败',
      saving: '保存中…',
      onHint: '兼容模式：系统指令以 system 角色发送',
      offHint: '默认：由适配器按协议自动选择角色',
      dormant: '未激活',
      adapterManaged: '该适配器不会发送 developer 角色，无需设置',
      protocolNoDeveloper: '该提供商的协议不接受 developer 角色开关',
      writeFailed: '写入失败',
      roleNote: 'developer → system'
    }

    /** English copy. */
    const en = {
      sectionTitle: 'Provider developer-role compatibility',
      sectionDescription: 'Lists the model providers added to this profile. Checked providers no longer send role=developer on model calls; instruction messages use the system role instead. Use this for OpenAI-compatible gateways that reject the developer role. The change is written to the llm-pi-ai provider compat and applies immediately.',
      footer: 'Checkbox state comes from compat.supportsDeveloperRole in llm-pi-ai. Unchecking removes the override and restores the adapter auto-detection.',
      loading: 'Reading model providers…',
      empty: 'This profile has no model provider yet.',
      retry: 'Retry',
      loadFailed: 'Could not read the model providers',
      saving: 'Saving…',
      onHint: 'Compatibility mode: instruction messages are sent with the system role',
      offHint: 'Default: the adapter picks the role from the wire protocol',
      dormant: 'inactive',
      adapterManaged: 'This adapter never sends the developer role; no setting is needed',
      protocolNoDeveloper: 'This provider protocol does not accept the developer-role switch',
      writeFailed: 'Write failed',
      roleNote: 'developer → system'
    }

    /** One section card, matching the surrounding Plugin Center page. */
    const sectionStyle = {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      padding: '16px',
      border: '1px solid var(--dsw-alias-border-l1)',
      borderRadius: '12px',
      background: 'var(--dsw-alias-bg-layer-1)'
    }
    const titleStyle = {
      margin: 0,
      fontSize: '14px',
      fontWeight: 600,
      lineHeight: '20px',
      color: 'var(--dsw-alias-label-primary)'
    }
    const textStyle = {
      margin: 0,
      fontSize: '12px',
      lineHeight: '18px',
      color: 'var(--dsw-alias-label-secondary)'
    }
    const rowStyle = {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      padding: '10px 0',
      borderTop: '1px solid var(--dsw-alias-border-l1)'
    }
    const rowMainStyle = { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: '1 1 auto' }
    const nameLineStyle = {
      display: 'flex',
      alignItems: 'baseline',
      gap: '6px',
      flexWrap: 'wrap',
      fontSize: '13px',
      lineHeight: '18px',
      color: 'var(--dsw-alias-label-primary)'
    }
    const codeStyle = {
      fontSize: '11px',
      lineHeight: '16px',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      color: 'var(--dsw-alias-label-secondary)'
    }
    const buttonStyle = {
      alignSelf: 'flex-start',
      padding: '4px 10px',
      border: '1px solid var(--dsw-alias-border-l2)',
      borderRadius: '6px',
      background: 'transparent',
      color: 'var(--dsw-alias-label-primary)',
      fontSize: '12px',
      lineHeight: '16px',
      font: 'inherit',
      cursor: 'pointer'
    }

    /** Human-readable message for an error value. */
    function messageOf(error) {
      if (error instanceof Error) return error.message
      return String(error)
    }

    /** Read one plain path from a JSON value. */
    function getPath(value, path) {
      let current = value
      for (const key of path) {
        if (current === null || typeof current !== 'object') return undefined
        if (!Object.prototype.hasOwnProperty.call(current, key)) return undefined
        current = current[key]
      }
      return current
    }

    /** A minimal snapshot store the renderer can bind as a selector hook. */
    function createStore(initial) {
      let snapshot = initial
      const listeners = new Set()
      return {
        getSnapshot() {
          return snapshot
        },
        subscribe(listener) {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        },
        set(next) {
          const resolved = typeof next === 'function' ? next(snapshot) : next
          if (resolved === snapshot) return
          snapshot = resolved
          for (const listener of [...listeners]) listener()
        }
      }
    }

    /** Whether a live settings schema declares the developer-role switch at all. */
    function offersDeveloperRole(schema) {
      try {
        return JSON.stringify(schema === undefined ? null : schema).includes(FIELD)
      } catch {
        return false
      }
    }

    /** The wire protocol of one configured route, when the profile names it. */
    function routeApiOf(settingsValue, providerId) {
      const route = getPath(settingsValue, ['providers', providerId])
      if (route === undefined || route === null || typeof route !== 'object') return undefined
      if (typeof route.api === 'string') return route.api
      if (!Array.isArray(route.models)) return undefined
      for (const model of route.models) {
        if (model !== null && typeof model === 'object' && typeof model.api === 'string') return model.api
      }
      return undefined
    }

    /**
     * Project the provider directory and the live settings view into render rows.
     *
     * The configurable-provider directory lists every route the installed pi-ai
     * catalog declares, whether or not this profile added it, so a row is kept
     * only when the provider actually exists here: it is registered with an
     * adapter, or its own route is present in the settings value. Catalog-only
     * providers the user never added stay out of the list.
     */
    function buildRows(providers, declared, namespaces) {
      const namespaceByNs = new Map()
      for (const namespace of namespaces) {
        if (namespace !== null && typeof namespace === 'object' && typeof namespace.ns === 'string') {
          namespaceByNs.set(namespace.ns, namespace)
        }
      }
      const declaredById = new Map()
      for (const entry of declared) {
        if (entry !== null && typeof entry === 'object' && typeof entry.provider === 'string') {
          declaredById.set(entry.provider, entry)
        }
      }
      const rows = []
      const seen = new Set()
      const add = (providerId, displayName, active) => {
        if (seen.has(providerId)) return
        seen.add(providerId)
        const base = {
          id: providerId,
          name: typeof displayName === 'string' && displayName.length > 0 ? displayName : providerId,
          active
        }
        const entry = declaredById.get(providerId)
        if (entry === undefined || typeof entry.settingsNs !== 'string' || entry.settingsNs.length === 0) {
          rows.push({ ...base, actionable: false, checked: false, reasonKey: 'adapterManaged' })
          return
        }
        const namespace = namespaceByNs.get(entry.settingsNs)
        if (namespace === undefined || !offersDeveloperRole(namespace.schema)) {
          rows.push({ ...base, actionable: false, checked: false, reasonKey: 'adapterManaged' })
          return
        }
        const api = routeApiOf(namespace.value, providerId)
        if (api !== undefined && !OPENAI_APIS.includes(api)) {
          rows.push({ ...base, actionable: false, checked: false, reasonKey: 'protocolNoDeveloper' })
          return
        }
        const compat = getPath(namespace.value, ['providers', providerId, 'compat'])
        rows.push({
          ...base,
          actionable: true,
          checked: compat !== null && typeof compat === 'object' && compat[FIELD] === false,
          reasonKey: null,
          settingsNs: entry.settingsNs,
          revision: typeof namespace.revision === 'number' ? namespace.revision : undefined
        })
      }
      for (const provider of providers) {
        if (provider !== null && typeof provider === 'object' && typeof provider.id === 'string') {
          add(provider.id, provider.name, true)
        }
      }
      for (const [providerId, entry] of declaredById) {
        if (seen.has(providerId)) continue
        const settingsNs = entry.settingsNs
        if (typeof settingsNs !== 'string' || settingsNs.length === 0) continue
        const namespace = namespaceByNs.get(settingsNs)
        if (namespace === undefined) continue
        const settingsPath = Array.isArray(entry.settingsPath) ? entry.settingsPath : ['providers', providerId]
        // A declared route that the profile never configured has no value of its own.
        if (getPath(namespace.value, settingsPath) === undefined) continue
        add(providerId, entry.displayName, false)
      }
      return rows
    }

    /** Owns provider reads and the developer-role compatibility writes. */
    class ProviderCompatController {
      constructor(ctx) {
        this.ctx = ctx
        this.store = createStore({ status: 'idle', rows: [], error: null, saving: null, writeError: null })
        this.providers = []
        this.declared = []
        this.namespaces = []
        this.generation = 0
        this.disposed = false
      }

      /** @returns the snapshot the section renders from. */
      getSnapshot() {
        return this.store.getSnapshot()
      }

      /** @returns the disposer removing one snapshot listener. */
      subscribe(listener) {
        return this.store.subscribe(listener)
      }

      /** Load the provider directory on first mount only. */
      ensure() {
        if (this.store.getSnapshot().status === 'idle') void this.load()
      }

      /** Refresh after a settings or connection change. */
      invalidate() {
        if (this.store.getSnapshot().status === 'idle') return
        void this.load()
      }

      /** @returns nothing; late settlements and disposal are ignored. */
      dispose() {
        this.disposed = true
        this.generation += 1
      }

      /** Read providers and the live settings view, then publish render rows. */
      async load() {
        const generation = ++this.generation
        const before = this.store.getSnapshot()
        this.store.set({
          ...before,
          status: before.rows.length === 0 ? 'loading' : before.status,
          error: null,
          writeError: null
        })
        try {
          const [registered, declared, settings] = await Promise.all([
            this.ctx.remote.llm.listProviders(),
            this.ctx.remote.llm.listConfigurableProviders(),
            this.ctx.remote.settings.describe()
          ])
          if (this.disposed || generation !== this.generation) return
          if (!registered.ok) throw new Error(registered.error.message)
          if (!declared.ok) throw new Error(declared.error.message)
          if (!settings.ok) throw new Error(settings.error.message)
          const namespaces = settings.value !== null && typeof settings.value === 'object' && Array.isArray(settings.value.namespaces) ? settings.value.namespaces : []
          this.providers = Array.isArray(registered.value) ? registered.value : []
          this.declared = Array.isArray(declared.value) ? declared.value : []
          this.namespaces = namespaces
          this.store.set({
            status: 'ready',
            rows: buildRows(this.providers, this.declared, this.namespaces),
            error: null,
            saving: null,
            writeError: null
          })
        } catch (error) {
          if (this.disposed || generation !== this.generation) return
          const current = this.store.getSnapshot()
          this.store.set({
            ...current,
            status: current.rows.length === 0 ? 'error' : 'ready',
            error: messageOf(error),
            saving: null
          })
        }
      }

      /** Write one provider's developer-role switch through the settings Remote. */
      async setChecked(providerId, checked) {
        const snapshot = this.store.getSnapshot()
        if (snapshot.saving !== null) return
        const row = snapshot.rows.find((candidate) => candidate.id === providerId)
        if (row === undefined || row.actionable !== true) return
        this.store.set({ ...snapshot, saving: providerId, writeError: null })
        const ops = checked
          ? [{ op: 'set', path: ['providers', providerId, 'compat', FIELD], value: false }]
          : [{ op: 'unset', path: ['providers', providerId, 'compat', FIELD] }]
        try {
          const response = await this.ctx.remote.settings.mutate(row.settingsNs, ops, row.revision)
          if (this.disposed) return
          if (!response.ok) throw new Error(response.error.message)
          const view = response.value
          if (view !== null && typeof view === 'object' && typeof view.ns === 'string') {
            const replaced = this.namespaces.map((namespace) => (namespace !== null && typeof namespace === 'object' && namespace.ns === view.ns ? view : namespace))
            this.namespaces = replaced
          }
          this.store.set({
            status: 'ready',
            rows: buildRows(this.providers, this.declared, this.namespaces),
            error: null,
            saving: null,
            writeError: null
          })
        } catch (error) {
          if (this.disposed) return
          this.store.set({ ...this.store.getSnapshot(), saving: null, writeError: messageOf(error) })
        }
      }

      /** Build the injected face the section component receives. */
      face() {
        return {
          getSnapshot: () => this.store.getSnapshot(),
          subscribe: (listener) => this.store.subscribe(listener),
          ensure: () => {
            this.ensure()
          },
          reload: () => {
            void this.load()
          },
          setChecked: (providerId, checked) => {
            void this.setChecked(providerId, checked)
          }
        }
      }
    }

    /** One row: checkbox, provider identity, and the current switch state. */
    function ProviderRow(props) {
      const { row, t, saving, onToggle } = props
      const disabled = row.actionable !== true || saving
      const hint = row.actionable === true ? (row.checked ? t('onHint') : t('offHint')) : t(row.reasonKey)
      return h('label', { key: row.id, style: { ...rowStyle, opacity: row.actionable === true ? 1 : 0.72 } }, [
        h('input', {
          key: 'switch',
          type: 'checkbox',
          checked: row.checked === true,
          disabled,
          onChange: (event) => {
            onToggle(row.id, event.target.checked)
          },
          style: { width: '16px', height: '16px', marginTop: '1px', accentColor: 'var(--dsw-alias-brand-primary)', flex: '0 0 auto' }
        }),
        h('span', { key: 'main', style: rowMainStyle }, [
          h('span', { key: 'name', style: nameLineStyle }, [
            h('span', { key: 'title' }, row.name),
            h('code', { key: 'id', style: codeStyle }, row.id),
            row.active === true ? null : h('span', { key: 'inactive', style: { ...codeStyle, fontFamily: 'inherit' } }, t('dormant'))
          ]),
          h('span', { key: 'hint', style: textStyle }, hint)
        ]),
        saving ? h('span', { key: 'saving', style: textStyle, role: 'status' }, t('saving')) : null
      ])
    }

    /** The section this bundle contributes to its own Plugin Center page. */
    function ProviderCompatSection(props) {
      const state = React.useSyncExternalStore(props.subscribe, props.getSnapshot)
      const t = typeof props.t === 'function' ? props.t : (key) => key
      React.useEffect(() => {
        props.ensure()
      }, [props.ensure])
      const subject = props.subject
      const ownBundle = subject !== undefined && subject !== null && subject.kind === 'bundle' && subject.pkg !== undefined && subject.pkg !== null && subject.pkg.name === PACKAGE_NAME
      if (!ownBundle) return null
      let body
      if (state.status === 'idle' || state.status === 'loading') {
        body = h('p', { style: textStyle, role: 'status' }, t('loading'))
      } else if (state.status === 'error') {
        body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } }, [
          h('p', { key: 'failure', style: { ...textStyle, color: 'var(--dsw-alias-state-error-primary)' }, role: 'alert' }, `${t('loadFailed')}: ${String(state.error)}`),
          h('button', { key: 'retry', type: 'button', style: buttonStyle, onClick: props.reload }, t('retry'))
        ])
      } else if (state.rows.length === 0) {
        body = h('p', { style: textStyle }, t('empty'))
      } else {
        body = h('div', { style: { display: 'flex', flexDirection: 'column' } }, state.rows.map((row) => h(ProviderRow, {
          key: row.id,
          row,
          t,
          saving: state.saving === row.id,
          onToggle: props.setChecked
        })))
      }
      return h('section', { style: sectionStyle, 'data-plugin-section': 'llm-provider-compat' }, [
        h('header', { key: 'header', style: { display: 'flex', flexDirection: 'column', gap: '4px' } }, [
          h('h4', { key: 'title', style: titleStyle }, t('sectionTitle')),
          h('p', { key: 'description', style: textStyle }, t('sectionDescription'))
        ]),
        h('div', { key: 'body' },
          body,
          state.writeError !== null && state.writeError !== undefined
            ? h('p', { key: 'write-failure', style: { ...textStyle, color: 'var(--dsw-alias-state-error-primary)' }, role: 'alert' }, `${t('writeFailed')}: ${String(state.writeError)}`)
            : null
        ),
        h('p', { key: 'footer', style: { ...textStyle, fontSize: '11px' } }, t('footer'))
      ])
    }

    return {
      inject: ['slots', 'locale', 'remote', 'remote.llm', 'remote.settings'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'llm-provider-compat: dictionaries')
        const controller = new ProviderCompatController(ctx)
        ctx.effect(() => {
          const disposers = [
            ctx.remote.$on('settings/document-updated', () => {
              controller.invalidate()
            }),
            ctx.on('connection/reset', () => {
              controller.invalidate()
            })
          ]
          return () => {
            for (const dispose of disposers) dispose()
          }
        }, 'llm-provider-compat: settings invalidations')
        ctx.effect(() => () => controller.dispose(), 'llm-provider-compat: controller')
        const t = ctx.locale.bind(NS)
        const face = controller.face()
        ctx.slots.inject('plugins.detail.section', () => ctx.slots.register({
          name: 'plugins.detail.section',
          id: 'llm-provider-compat',
          order: 10,
          label: () => t('sectionTitle'),
          locale: NS,
          inject: () => face
        }, ProviderCompatSection))
      }
    }
  }
})
