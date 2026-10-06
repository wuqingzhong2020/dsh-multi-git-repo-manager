import type { Context } from '@deepseek-ai/cordis'
import {
  RepositoryDeleteDialog,
  RepositoryListEditor,
  RepositoryPreview,
} from './repository-settings-components.tsx'
import { useRepositorySettings } from './use-repository-settings.ts'
import { t } from './locales.ts'
import { useReviewLocale } from './use-review-locale.ts'
import { localizeReviewMessage } from './message-locales.ts'
import css from './RepositorySettings.module.css'

/** A session-owned editor for the repositories of this conversation's project. */
export function RepositorySettings({ ctx, sessionId }: { ctx: Context; sessionId: string }) {
  useReviewLocale()
  const {
    page,
    draft,
    preview,
    busy,
    dirty,
    message,
    pendingDelete,
    pickerError,
    load,
    save,
    edit,
    chooseDirectory,
    updateRepository,
    normalizeRepositoryPath,
    addRepository,
    requestRepositoryRemoval,
    cancelRepositoryRemoval,
    confirmRepositoryRemoval,
    entries, discovery, discover, addCandidate,
  } = useRepositorySettings(ctx, sessionId)

  const saveDisabled = busy || draft === null || (!dirty && page?.configured)
  const saveLabel = busy
    ? t('projectWorking')
    : page?.configured
      ? t('projectSave')
      : t('projectGenerate')

  return (
    <div className={css.scroll}>
      <div className={css.root}>
        <header className={css.pageHeader}>
          <div>
            <h2>{t('projectTab')}</h2>
            <p className={css.hint}>{t('projectIntro')}</p>
          </div>
          <div className={css.actions}>
            <button
              type="button"
              disabled={busy || !page?.configured}
              onClick={() => {
                void load()
              }}
            >
              {t('projectReload')}
            </button>
            <button
              type="button"
              className={css.primary}
              disabled={saveDisabled}
              onClick={() => {
                void save()
              }}
            >
              {saveLabel}
            </button>
          </div>
        </header>
        {message && (
          <p className={css.message} role="status">
            {typeof message === 'string' ? localizeReviewMessage(message) : t(message.key)}
          </p>
        )}
        {draft !== null && (
          <fieldset disabled={busy} className={css.form}>
            <label className={css.field}>
              {t('projectCurrentRoot')}
              <input value={draft.root} readOnly />
            </label>
            <label className={css.field}>
              {t('projectName')}
              <input value={draft.name} readOnly />
            </label>
            <label className={css.field}>
              {t('projectConfigFile')}
              <input value="dsh-multi-git-repo.json" readOnly />
            </label>
            {!page?.configured && <p className={css.hint}>{t('projectInactive')}</p>}
            <label className={css.check}>
              <input
                type="checkbox"
                checked={draft.enabled ?? true}
                onChange={event => {
                  edit({ enabled: event.target.checked })
                }}
              />
              {t('projectEnable')}
            </label>
            {draft.enabled === false && <p className={css.hint}>{t('projectDisabledHint')}</p>}
            <label className={css.check}>
              <input
                type="checkbox"
                checked={draft.includeProjectRoot}
                onChange={event => {
                  edit({ includeProjectRoot: event.target.checked })
                }}
              />
              {t('projectIncludeRoot')}
            </label>
            <h3>{t('projectRepos')}</h3>
            <p className={css.hint}>{t('projectReposHint')}</p>
            <RepositoryListEditor
              projectRoot={draft.root}
              entries={entries}
              pickerError={pickerError}
              onUpdate={updateRepository}
              onNormalizePath={normalizeRepositoryPath}
              onChooseDirectory={chooseDirectory}
              onRemove={requestRepositoryRemoval}
            />
            <button type="button" onClick={addRepository}>
              {t('projectAddRepo')}
            </button>
            <h3>{t('discoveryTitle')}</h3>
            <label className={css.field}>
              {t('discoveryContainers')}
              <textarea aria-label={t('discoveryContainers')} value={(draft.discovery?.containers ?? []).join('\n')}
                onChange={event => edit({ discovery: { containers: event.target.value.split('\n').map(path => path.trim()).filter(Boolean) } })} />
            </label>
            <p className={css.hint}>{t('discoveryHint')}</p>
            <button type="button" onClick={() => { void discover() }}>{t('discover')}</button>
            {discovery?.warnings.map(warning => <p className={css.message} key={warning}>{warning}</p>)}
            {discovery?.candidates.map(candidate => <div className={css.actions} key={candidate.id}>
              <span>{candidate.name} · {candidate.kind === 'git' ? 'Git' : t('directoryKind')} · {candidate.relativePath}</span>
              <button type="button" disabled={candidate.state !== 'ready'} onClick={() => addCandidate(candidate.id)}>{t('addCandidate')}</button>
            </div>)}
          </fieldset>
        )}
        {preview !== null && <RepositoryPreview workspace={preview} />}
        {pendingDelete !== null && draft !== null && (
          <RepositoryDeleteDialog
            name={entries[pendingDelete]?.name || String(pendingDelete + 1)}
            onCancel={cancelRepositoryRemoval}
            onConfirm={confirmRepositoryRemoval}
          />
        )}
      </div>
    </div>
  )
}
