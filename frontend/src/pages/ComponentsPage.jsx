import { useState } from 'react';
import { Icon } from '../data/icons';

export default function ComponentsPage() {
  const [toggle1, setToggle1] = useState(true);
  const [toggle2, setToggle2] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-gradient mb-1">Component Library</h1>
        <p className="text-sm text-text-muted">AquaSecure design system components</p>
      </div>

      {/* Severity Badges */}
      <section className="glass-card p-6">
        <h2 className="section-title">Severity Badges</h2>
        <div className="flex gap-3 flex-wrap">
          <span className="severity-critical">CRITICAL</span>
          <span className="severity-high">HIGH</span>
          <span className="severity-medium">MEDIUM</span>
          <span className="severity-low">LOW</span>
          <span className="severity-info">INFO</span>
        </div>
      </section>

      {/* Score Rings */}
      <section className="glass-card p-6">
        <h2 className="section-title">Score Rings</h2>
        <div className="flex gap-8 items-center">
          <div className="flex flex-col items-center gap-2">
            <div className="score-ring">
              <svg width="80" height="80" viewBox="0 0 80 80"><circle className="score-track" cx="40" cy="40" r="34" strokeWidth="4"/><circle className="score-fill" cx="40" cy="40" r="34" stroke="#FF3B5C" strokeWidth="4" strokeDasharray="213.6" strokeDashoffset="27.8"/></svg>
              <div className="score-value text-xl text-red">87</div>
            </div>
            <span className="text-xs text-text-muted">Critical</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="score-ring">
              <svg width="80" height="80" viewBox="0 0 80 80"><circle className="score-track" cx="40" cy="40" r="34" strokeWidth="4"/><circle className="score-fill" cx="40" cy="40" r="34" stroke="#FFB020" strokeWidth="4" strokeDasharray="213.6" strokeDashoffset="99.4"/></svg>
              <div className="score-value text-xl text-amber">54</div>
            </div>
            <span className="text-xs text-text-muted">Medium</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="score-ring">
              <svg width="80" height="80" viewBox="0 0 80 80"><circle className="score-track" cx="40" cy="40" r="34" strokeWidth="4"/><circle className="score-fill" cx="40" cy="40" r="34" stroke="#00C48C" strokeWidth="4" strokeDasharray="213.6" strokeDashoffset="188"/></svg>
              <div className="score-value text-xl text-green">12</div>
            </div>
            <span className="text-xs text-text-muted">Low</span>
          </div>
        </div>
      </section>

      {/* Chips */}
      <section className="glass-card p-6">
        <h2 className="section-title">Chips & Tags</h2>
        <div className="flex gap-3 flex-wrap mb-4">
          <span className="chip-violet">Violet Chip</span>
          <span className="chip-cyan">Cyan Chip</span>
          <span className="chip-red">Red Chip</span>
          <span className="chip-green">Green Chip</span>
          <span className="chip-amber">Amber Chip</span>
        </div>
        <div className="flex gap-3">
          <span className="premium-badge">&#10022; PRO</span>
          <span className="feed-status active"><span className="dot"></span>Active</span>
          <span className="feed-status paused"><span className="dot"></span>Paused</span>
          <span className="feed-status error"><span className="dot"></span>Error</span>
          <span className="feed-status inactive"><span className="dot"></span>Inactive</span>
        </div>
      </section>

      {/* Buttons */}
      <section className="glass-card p-6">
        <h2 className="section-title">Buttons</h2>
        <div className="flex gap-3 flex-wrap items-center">
          <button className="btn-primary">Primary</button>
          <button className="btn-secondary">Secondary</button>
          <button className="btn-ghost">Ghost</button>
          <button className="btn-danger">Danger</button>
          <button className="btn-primary flex items-center gap-2"><Icon name="plus" />With Icon</button>
        </div>
      </section>

      {/* Copyable Fields */}
      <section className="glass-card p-6">
        <h2 className="section-title">Copyable Fields</h2>
        <div className="flex gap-3 flex-wrap">
          <span className="copyable-field">185.220.101.34 <span className="copy-icon"><Icon name="copy" /></span></span>
          <span className="copyable-field">a1b2c3d4e5f6a1b2c3d4... <span className="copy-icon"><Icon name="copy" /></span></span>
          <span className="copyable-field">CVE-2021-44228 <span className="copy-icon"><Icon name="copy" /></span></span>
        </div>
      </section>

      {/* Live Dots */}
      <section className="glass-card p-6">
        <h2 className="section-title">Live Indicators</h2>
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2"><div className="live-dot live-dot-green"></div><span className="text-sm text-text-secondary">Active</span></div>
          <div className="flex items-center gap-2"><div className="live-dot live-dot-red"></div><span className="text-sm text-text-secondary">Critical</span></div>
          <div className="flex items-center gap-2"><div className="live-dot live-dot-amber"></div><span className="text-sm text-text-secondary">Warning</span></div>
        </div>
      </section>

      {/* Confidence Meters */}
      <section className="glass-card p-6">
        <h2 className="section-title">Confidence Meters</h2>
        <div className="flex gap-8 items-end">
          <div className="flex flex-col items-center gap-2">
            <div className="confidence-meter">
              <div className="bar filled" style={{height:'6px'}}></div>
              <div className="bar filled" style={{height:'10px'}}></div>
              <div className="bar filled" style={{height:'14px'}}></div>
              <div className="bar filled" style={{height:'18px'}}></div>
              <div className="bar filled" style={{height:'22px'}}></div>
            </div>
            <span className="text-xs text-text-muted">95% High</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="confidence-meter">
              <div className="bar filled" style={{height:'6px'}}></div>
              <div className="bar filled" style={{height:'10px'}}></div>
              <div className="bar filled" style={{height:'14px'}}></div>
              <div className="bar" style={{height:'18px'}}></div>
              <div className="bar" style={{height:'22px'}}></div>
            </div>
            <span className="text-xs text-text-muted">60% Medium</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="confidence-meter">
              <div className="bar filled" style={{height:'6px'}}></div>
              <div className="bar" style={{height:'10px'}}></div>
              <div className="bar" style={{height:'14px'}}></div>
              <div className="bar" style={{height:'18px'}}></div>
              <div className="bar" style={{height:'22px'}}></div>
            </div>
            <span className="text-xs text-text-muted">20% Low</span>
          </div>
        </div>
      </section>

      {/* Progress Bars */}
      <section className="glass-card p-6">
        <h2 className="section-title">Progress Bars</h2>
        <div className="space-y-4">
          <div><div className="text-xs text-text-muted mb-1">100% Complete</div><div className="progress-bar"><div className="progress-fill" style={{width:'100%'}}></div></div></div>
          <div><div className="text-xs text-text-muted mb-1">65% In Progress</div><div className="progress-bar"><div className="progress-fill" style={{width:'65%'}}></div></div></div>
          <div><div className="text-xs text-text-muted mb-1">25% Starting</div><div className="progress-bar"><div className="progress-fill" style={{width:'25%'}}></div></div></div>
        </div>
      </section>

      {/* Toggle Switches */}
      <section className="glass-card p-6">
        <h2 className="section-title">Toggle Switches</h2>
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2"><div className={`toggle ${toggle1 ? 'active' : ''}`} onClick={() => setToggle1(v => !v)}></div><span className="text-sm text-text-secondary">Enabled</span></div>
          <div className="flex items-center gap-2"><div className={`toggle ${toggle2 ? 'active' : ''}`} onClick={() => setToggle2(v => !v)}></div><span className="text-sm text-text-secondary">Disabled</span></div>
        </div>
      </section>

      {/* Skeleton Loaders */}
      <section className="glass-card p-6">
        <h2 className="section-title">Skeleton Loaders</h2>
        <div className="max-w-md space-y-3">
          <div className="flex items-center gap-3">
            <div className="skeleton skeleton-circle w-10 h-10"></div>
            <div className="flex-1">
              <div className="skeleton skeleton-text w-3/4"></div>
              <div className="skeleton skeleton-text-sm w-1/2"></div>
            </div>
          </div>
          <div className="skeleton skeleton-text w-full"></div>
          <div className="skeleton skeleton-text w-5/6"></div>
          <div className="skeleton skeleton-text w-4/6"></div>
        </div>
      </section>

      {/* Glass Cards */}
      <section className="glass-card p-6">
        <h2 className="section-title">Glass Cards</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card p-4">
            <div className="text-sm font-medium mb-1">Glass Card</div>
            <div className="text-xs text-text-muted">Default glass surface</div>
          </div>
          <div className="glass-surface p-4">
            <div className="text-sm font-medium mb-1">Glass Surface</div>
            <div className="text-xs text-text-muted">Lighter glass variant</div>
          </div>
          <div className="gradient-border p-4">
            <div className="text-sm font-medium mb-1">Gradient Border</div>
            <div className="text-xs text-text-muted">Violet &rarr; Cyan border</div>
          </div>
        </div>
      </section>

      {/* Empty State */}
      <section className="glass-card p-6">
        <h2 className="section-title">Empty State</h2>
        <div className="text-center py-12">
          <div className="text-5xl mb-4">&#128269;</div>
          <div className="text-lg font-heading font-semibold mb-2">No Results Found</div>
          <div className="text-sm text-text-muted mb-4">Try adjusting your search criteria or filters.</div>
          <button className="btn-primary">Clear Filters</button>
        </div>
      </section>

      {/* Typography */}
      <section className="glass-card p-6">
        <h2 className="section-title">Typography</h2>
        <div className="space-y-3">
          <div className="font-display text-3xl font-bold">Syne Display — AquaSecure Threat Intel</div>
          <div className="font-heading text-xl font-semibold">Space Grotesk Heading — Dashboard Overview</div>
          <div className="font-body text-base">Inter Body — Regular paragraph text for descriptions and content.</div>
          <div className="font-mono text-sm">JetBrains Mono — 185.220.101.34 · CVE-2021-44228 · a1b2c3d4e5f6</div>
          <div className="text-gradient font-display text-2xl font-bold">Gradient Text Effect</div>
        </div>
      </section>

      {/* Color Palette */}
      <section className="glass-card p-6">
        <h2 className="section-title">Color Palette</h2>
        <div className="grid grid-cols-6 gap-3">
          <div><div className="h-16 rounded-lg bg-violet mb-2"></div><div className="text-xs text-text-muted">Violet</div><div className="text-[10px] font-mono text-text-muted">#7A44E4</div></div>
          <div><div className="h-16 rounded-lg bg-cyan mb-2"></div><div className="text-xs text-text-muted">Cyan</div><div className="text-[10px] font-mono text-text-muted">#00E5FF</div></div>
          <div><div className="h-16 rounded-lg bg-red mb-2"></div><div className="text-xs text-text-muted">Red</div><div className="text-[10px] font-mono text-text-muted">#FF3B5C</div></div>
          <div><div className="h-16 rounded-lg bg-green mb-2"></div><div className="text-xs text-text-muted">Green</div><div className="text-[10px] font-mono text-text-muted">#00C48C</div></div>
          <div><div className="h-16 rounded-lg bg-amber mb-2"></div><div className="text-xs text-text-muted">Amber</div><div className="text-[10px] font-mono text-text-muted">#FFB020</div></div>
          <div><div className="h-16 rounded-lg bg-surface-2 border border-border mb-2"></div><div className="text-xs text-text-muted">Surface</div><div className="text-[10px] font-mono text-text-muted">#161822</div></div>
        </div>
      </section>
    </div>
  );
}
