import { NOTIFICATIONS } from '../../data/mock-data';
import { Icon, ICONS } from '../../data/icons';

const TYPE_COLORS = { critical: 'border-l-red', alert: 'border-l-amber', info: 'border-l-cyan', success: 'border-l-green' };
const ICON_NAMES = { critical: 'alertTriangle', alert: 'alertTriangle', info: 'bell', success: 'check' };
const ICON_COLORS = { critical: 'text-red', alert: 'text-amber', info: 'text-cyan', success: 'text-green' };

export default function NotificationDrawer({ open, onClose }) {
  return (
    <>
      <div
        className="drawer glass-panel border-l border-border"
        style={{ right: open ? 0 : '-480px' }}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <div className="font-heading font-semibold text-text-primary">Notifications</div>
              <div className="text-xs text-text-muted mt-0.5">{NOTIFICATIONS.filter(n => !n.read).length} unread</div>
            </div>
            <button className="text-text-muted hover:text-text-primary transition-colors" onClick={onClose}>
              <Icon name="close" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <button className="flex-1 px-4 py-2.5 text-xs font-medium text-violet-light border-b-2 border-violet">All</button>
            <button className="flex-1 px-4 py-2.5 text-xs font-medium text-text-muted border-b-2 border-transparent hover:text-text-secondary">Critical</button>
            <button className="flex-1 px-4 py-2.5 text-xs font-medium text-text-muted border-b-2 border-transparent hover:text-text-secondary">Alerts</button>
            <button className="flex-1 px-4 py-2.5 text-xs font-medium text-text-muted border-b-2 border-transparent hover:text-text-secondary">Info</button>
          </div>

          {/* Notifications list */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/30">
            {NOTIFICATIONS.map(n => (
              <div key={n.id} className={`px-4 py-3 border-l-2 ${TYPE_COLORS[n.type]} ${n.read ? 'opacity-60' : ''} hover:bg-surface-2/50 transition-colors cursor-pointer`}>
                <div className="flex items-start gap-3">
                  <span className={`${ICON_COLORS[n.type]} mt-0.5`}><Icon name={ICON_NAMES[n.type]} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary">{n.title}</div>
                    <div className="text-xs text-text-secondary mt-0.5">{n.message}</div>
                    <div className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
                      <Icon name="clock" /> {n.time}
                    </div>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-violet mt-1.5"></div>}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border">
            <button className="w-full btn-ghost text-xs">Mark all as read</button>
          </div>
        </div>
      </div>
      {open && <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose}></div>}
    </>
  );
}
