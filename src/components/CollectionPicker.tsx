import { useState } from 'react';
import { ChevronDown, Plus, Check } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { STARTER_FIELDS, type Field } from '../types';
import { cn } from '../lib/utils';

export function CollectionPicker() {
  const collections = useAppStore((s) => s.collections);
  const activeId = useAppStore((s) => s.activeCollectionId);
  const setActive = useAppStore((s) => s.setActiveCollection);
  const createCollection = useAppStore((s) => s.createCollection);

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [field, setField] = useState<Field>('custom');

  const active = collections.find((c) => c.id === activeId);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createCollection(name.trim(), field);
    setName('');
    setCreating(false);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn-secondary min-w-[180px] justify-between"
      >
        <span className="truncate">{active?.name ?? 'Select collection'}</span>
        <ChevronDown className="w-4 h-4 shrink-0 opacity-60" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 w-72 card-surface p-2 shadow-lg">
            <div className="max-h-56 overflow-y-auto">
              {collections.length === 0 && (
                <p className="px-3 py-2 text-sm text-ink-muted">No collections yet</p>
              )}
              {collections.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActive(c.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left hover:bg-canvas',
                    c.id === activeId && 'bg-plum/10 text-plum'
                  )}
                >
                  {c.id === activeId && <Check className="w-4 h-4 shrink-0" />}
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-border mt-1 pt-2">
              {creating ? (
                <div className="px-2 space-y-2">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Collection name"
                    className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                  <select
                    value={field}
                    onChange={(e) => setField(e.target.value as Field)}
                    className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm"
                  >
                    {STARTER_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary flex-1" onClick={handleCreate}>
                      Create
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setCreating(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-plum hover:bg-plum/10"
                  onClick={() => setCreating(true)}
                >
                  <Plus className="w-4 h-4" />
                  New collection
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
