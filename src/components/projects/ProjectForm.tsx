'use client'

import { useFormStatus } from 'react-dom'
import { useState } from 'react'
import { createProject, updateProject } from '@/app/[lang]/projects/actions'

interface ProjectFormProps {
  lang: string
  teamId: string
  mode: 'create' | 'edit'
  defaultValues?: {
    id?: string
    name?: string
    description?: string
  }
}

function SubmitButton({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm px-5 py-3 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      style={{
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-on-primary)',
      }}
      aria-busy={pending}
    >
      {pending ? 'Saving…' : mode === 'create' ? 'Create project' : 'Save changes'}
    </button>
  )
}

export function ProjectForm({ lang: _lang, teamId, mode, defaultValues }: ProjectFormProps) {
  const [nameError, setNameError] = useState('')
  const [formError, setFormError] = useState('')

  async function handleAction(formData: FormData) {
    setNameError('')
    setFormError('')

    const name = (formData.get('name') as string | null)?.trim() ?? ''
    if (!name) {
      setNameError('Project name is required.')
      return
    }

    formData.set('teamId', teamId)

    const result =
      mode === 'create'
        ? await createProject(formData)
        : await updateProject(defaultValues?.id ?? '', formData)

    if ('error' in result && result.error) {
      if (typeof result.error === 'string') {
        setFormError(result.error)
      } else if (
        result.error &&
        typeof result.error === 'object' &&
        'name' in result.error &&
        Array.isArray((result.error as Record<string, string[]>).name)
      ) {
        setNameError((result.error as Record<string, string[]>).name[0])
      }
    }
  }

  return (
    <form action={handleAction} noValidate>
      <div className="mb-4">
        <label
          htmlFor="project-name"
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--color-ink)' }}
        >
          Project name <span aria-hidden="true">*</span>
        </label>
        <input
          id="project-name"
          name="name"
          type="text"
          defaultValue={defaultValues?.name ?? ''}
          required
          aria-describedby={nameError ? 'project-name-error' : undefined}
          className="w-full rounded-sm px-4 py-3 text-sm focus:outline-none"
          style={{
            border: '1px solid var(--color-hairline)',
            color: 'var(--color-ink)',
            backgroundColor: 'var(--color-canvas)',
          }}
        />
        {nameError && (
          <p
            id="project-name-error"
            role="alert"
            aria-live="assertive"
            className="mt-1 text-xs"
            style={{ color: 'var(--color-accent-red)' }}
          >
            {nameError}
          </p>
        )}
      </div>

      <div className="mb-6">
        <label
          htmlFor="project-description"
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--color-ink)' }}
        >
          Description
        </label>
        <textarea
          id="project-description"
          name="description"
          rows={3}
          defaultValue={defaultValues?.description ?? ''}
          className="w-full rounded-sm px-4 py-3 text-sm resize-y focus:outline-none"
          style={{
            border: '1px solid var(--color-hairline)',
            color: 'var(--color-ink)',
            backgroundColor: 'var(--color-canvas)',
          }}
        />
      </div>

      {formError && (
        <p
          role="alert"
          aria-live="assertive"
          className="mb-4 text-xs"
          style={{ color: 'var(--color-accent-red)' }}
        >
          {formError}
        </p>
      )}

      <SubmitButton mode={mode} />
    </form>
  )
}
