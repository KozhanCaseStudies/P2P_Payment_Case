'use client';

import { useState } from 'react';
import { Contact } from '@/types';
import { useContacts } from '@/hooks/useContacts';
import { auth } from '@/lib/firebase/client';
import { Star, Users } from 'lucide-react';

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
        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
      >
        <Users className="w-3.5 h-3.5" />
        {open ? 'Close' : 'Contacts'}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl z-20 max-h-52 overflow-y-auto animate-fade-up">
          {favorites.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-display font-semibold uppercase tracking-[0.12em] text-muted-foreground bg-muted/50 sticky top-0">
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
              <div className="px-3 py-1.5 text-[10px] font-display font-semibold uppercase tracking-[0.12em] text-muted-foreground bg-muted/50 sticky top-0">
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
    <div className="flex items-center px-3 py-2.5 hover:bg-accent/50 transition-colors group">
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 text-left min-w-0"
      >
        <p className="text-sm font-medium text-foreground truncate">{contact.displayName}</p>
        <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className="p-1 shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        title={contact.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star
          className={`w-3.5 h-3.5 transition-colors ${
            contact.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'
          }`}
        />
      </button>
    </div>
  );
}
