'use client';

import { useState } from 'react';
import { Contact } from '@/types';
import { useContacts } from '@/hooks/useContacts';
import { auth } from '@/lib/firebase/client';
import { Star, X, Users } from 'lucide-react';

export function ContactPicker({
  userId,
  onSelect,
}: {
  userId: string;
  onSelect: (email: string) => void;
}) {
  const { contacts, loading } = useContacts(userId);
  const [open, setOpen] = useState(false);

  if (loading || contacts.length === 0) return null;

  const favorites = contacts.filter((c) => c.isFavorite);
  const recent = contacts.filter((c) => !c.isFavorite);

  async function toggleFavorite(contact: Contact) {
    try {
      const token = await auth.currentUser!.getIdToken();
      await fetch('/api/contacts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contactId: contact.id, isFavorite: !contact.isFavorite }),
      });
    } catch {
      // Silently fail
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
      >
        <Users className="w-3.5 h-3.5" />
        {open ? 'Close contacts' : 'Choose from contacts'}
      </button>

      {open && (
        <div className="mt-2 bg-white rounded-lg border border-gray-200 shadow-sm max-h-48 overflow-y-auto">
          {favorites.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50">
                Favorites
              </div>
              {favorites.map((c) => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  onSelect={() => { onSelect(c.email); setOpen(false); }}
                  onToggleFavorite={() => toggleFavorite(c)}
                />
              ))}
            </>
          )}
          {recent.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50">
                Recent
              </div>
              {recent.map((c) => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  onSelect={() => { onSelect(c.email); setOpen(false); }}
                  onToggleFavorite={() => toggleFavorite(c)}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ContactRow({
  contact,
  onSelect,
  onToggleFavorite,
}: {
  contact: Contact;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="flex items-center px-3 py-2 hover:bg-gray-50 group">
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 text-left min-w-0"
      >
        <p className="text-sm font-medium text-gray-900 truncate">{contact.displayName}</p>
        <p className="text-xs text-gray-500 truncate">{contact.email}</p>
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className="p-1 shrink-0 opacity-60 hover:opacity-100"
        title={contact.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star
          className={`w-3.5 h-3.5 ${
            contact.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
          }`}
        />
      </button>
    </div>
  );
}
