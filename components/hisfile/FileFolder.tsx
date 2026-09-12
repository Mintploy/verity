'use client';
import type { HisFile } from '@/lib/hisfile';

/**
 * One saved man, as a folder.
 *
 * The tab offset and the tone both come from the row's index rather than from
 * anything about him, so a drawer staggers the way a real one does. Four
 * offsets rather than two, because alternating tabs read as a zigzag; four
 * reads as a drawer someone has been into.
 */
const TAB_OFFSETS = ['0%', '30%', '11%', '48%'];

function scoreDot(s?: string): { dot: string; ring: string; label: string } {
  if (s === 'green') return { dot: 'var(--sage)', ring: 'var(--sage-pale)', label: 'Clear' };
  if (s === 'red') return { dot: 'var(--deeprose)', ring: 'var(--deeprose-pale)', label: 'Flagged' };
  if (s === 'yellow') return { dot: 'var(--honey)', ring: 'var(--honey-pale)', label: 'Worth a look' };
  return { dot: 'var(--mauve)', ring: 'var(--ivory-warm)', label: 'No score' };
}

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
}

export function FileFolder({
  file,
  index,
  onOpen,
  children,
}: {
  file: HisFile;
  index: number;
  onOpen: () => void;
  /** Row actions, delete and its confirm, rendered into the folder body. */
  children?: React.ReactNode;
}) {
  const nick = file.nickname || 'Unnamed';
  const tone = index % 2 === 0 ? 'dark' : 'light';
  const sc = scoreDot(file.safety_score);
  const dim = tone === 'dark' ? 0.78 : 0.65;

  return (
    <div
      className="v-folder"
      data-tone={tone}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); }
      }}
    >
      <div className="v-folder-tab" style={{ marginLeft: TAB_OFFSETS[index % TAB_OFFSETS.length] }}>
        <span className="v-folder-label">{nick}</span>
      </div>

      <div className="v-folder-body">
        <span
          title={sc.label}
          style={{
            width: 10, height: 10, borderRadius: '50%', background: sc.dot,
            boxShadow: `0 0 0 3px ${sc.ring}`, flexShrink: 0,
          }}
        />

        <span className="v-folder-avatar" style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--display)', fontSize: 16, fontWeight: 500,
          background: tone === 'dark' ? 'rgba(240,176,187,0.16)' : 'var(--ivory-warm)',
          color: tone === 'dark' ? 'var(--blush)' : 'var(--dark-soft)',
          border: `1px solid ${tone === 'dark' ? 'rgba(240,176,187,0.3)' : 'var(--gold-pale)'}`,
        }}>
          {initials(nick)}
        </span>

        <span style={{ flex: 1, minWidth: 0 }}>
          {file.full_name && (
            <span style={{
              display: 'block', fontFamily: 'var(--display)', fontSize: 15,
              color: 'inherit', lineHeight: 1.2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {file.full_name}
            </span>
          )}
          <span style={{
            display: 'flex', gap: 14, marginTop: 3,
            fontFamily: 'var(--sans)', fontSize: 12, opacity: dim,
            whiteSpace: 'nowrap', overflow: 'hidden',
          }}>
            {file.phone && <span>{file.phone}</span>}
            {file.researched_at && <span>{formatDate(file.researched_at)}</span>}
            {file.compatibility_score != null && <span className="v-folder-compat">♡ {file.compatibility_score}/10</span>}
          </span>
        </span>

        {file.status && (
          <span style={{
            padding: '5px 12px', borderRadius: 'var(--r-pill)',
            fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500,
            letterSpacing: 0.2, textTransform: 'capitalize',
            whiteSpace: 'nowrap', flexShrink: 0,
            background: tone === 'dark' ? 'rgba(240,176,187,0.18)' : 'var(--primary-mist)',
            color: tone === 'dark' ? 'var(--blush)' : 'var(--primary)',
          }}>
            {file.status}
          </span>
        )}

        {children}
      </div>
    </div>
  );
}
