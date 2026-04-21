import React, { useState } from 'react';
import { LayoutDashboard, Users, Car, Package, ClipboardList, Zap, ArrowRight, Shield, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const palettes = [
  {
    id: 'stealth',
    name: 'Carbon Stealth',
    bg: '#020617',
    card: '#0F172A',
    accent: '#6366F1',
    text: '#F8FAFC',
    secondary: '#64748B',
    border: '#1E293B',
    vibe: 'Professional, technical, high-performance'
  },
  {
    id: 'racing',
    name: 'Racing Circuit',
    bg: '#09090B',
    card: '#18181B',
    accent: '#10B981',
    text: '#FAFAFA',
    secondary: '#71717A',
    border: '#27272A',
    vibe: 'Sporty, fast, high-contrast'
  },
  {
    id: 'industrial',
    name: 'Industrial Gear',
    bg: '#0C0A09',
    card: '#1C1917',
    accent: '#F59E0B',
    text: '#FAFAF9',
    secondary: '#78716C',
    border: '#292524',
    vibe: 'Rugged, metallic, diagnostic'
  }
];

export function ThemePreview({ onClose }: { onClose: () => void }) {
  const [activePalette, setActivePalette] = useState(palettes[0]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md overflow-y-auto p-4 md:p-10 flex flex-col items-center">
      <header className="max-w-4xl w-full flex justify-between items-center mb-8">
        <div>
          <h2 className="text-white text-3xl font-black tracking-tighter">THEME EXPLORER</h2>
          <p className="text-slate-400 text-sm">Visualizing the new dark mode aesthetics</p>
        </div>
        <button 
          onClick={onClose}
          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-xs font-bold transition-all border border-white/10"
        >
          Close Preview
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 max-w-4xl w-full">
        {palettes.map(p => (
          <button
            key={p.id}
            onClick={() => setActivePalette(p)}
            className={cn(
              "p-6 rounded-2xl border-2 transition-all text-left group relative overflow-hidden",
              activePalette.id === p.id ? "border-white" : "border-white/5 bg-white/5 hover:bg-white/10"
            )}
            style={{ backgroundColor: p.bg }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-black text-white tracking-tighter">{p.name}</span>
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.accent }} />
            </div>
            <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">{p.vibe}</p>
            {activePalette.id === p.id && (
              <div className="absolute top-2 right-2">
                 <Shield className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      <motion.div 
        layout
        className="w-full max-w-6xl rounded-3xl overflow-hidden shadow-2xl border border-white/10"
        style={{ backgroundColor: activePalette.bg }}
      >
        <div className="flex flex-col md:flex-row h-[600px]">
          {/* Sidebar Mockup */}
          <div className="w-64 border-r p-6 hidden md:flex flex-col" style={{ backgroundColor: activePalette.bg, borderColor: activePalette.border }}>
             <h1 className="text-white text-xl font-black tracking-tighter mb-8" style={{ color: activePalette.text }}>
                GEARBOX
             </h1>
             <nav className="space-y-4">
                {[
                  { icon: LayoutDashboard, label: 'Dashboard', active: true },
                  { icon: Users, label: 'Customers' },
                  { icon: Car, label: 'Vehicles' },
                  { icon: Package, label: 'Inventory' },
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-3 p-2 rounded-lg text-sm font-bold"
                    style={{ 
                      backgroundColor: item.active ? activePalette.accent : 'transparent',
                      color: item.active ? '#fff' : activePalette.secondary
                    }}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                ))}
             </nav>
          </div>

          {/* Main Content Mockup */}
          <div className="flex-1 p-8 overflow-hidden relative">
             <div className="flex justify-between items-center mb-10">
                <div>
                   <h3 className="text-2xl font-black tracking-tight" style={{ color: activePalette.text }}>WORKSPACE</h3>
                   <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: activePalette.secondary }}>Operations Overview</p>
                </div>
                <div className="flex gap-2">
                   <div className="p-2 rounded-lg border" style={{ borderColor: activePalette.border, backgroundColor: activePalette.card }}>
                      <Activity className="w-5 h-5" style={{ color: activePalette.accent }} />
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card 1 */}
                <div className="p-6 rounded-2xl border shadow-sm" style={{ backgroundColor: activePalette.card, borderColor: activePalette.border }}>
                   <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${activePalette.accent}20` }}>
                         <Zap className="w-5 h-5" style={{ color: activePalette.accent }} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500">Live</span>
                   </div>
                   <h4 className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: activePalette.secondary }}>Total Revenue</h4>
                   <p className="text-3xl font-black tracking-tight" style={{ color: activePalette.text }}>$45,290.00</p>
                </div>

                {/* Card 2 */}
                <div className="p-6 rounded-2xl border shadow-sm" style={{ backgroundColor: activePalette.card, borderColor: activePalette.border }}>
                   <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5">
                         <ClipboardList className="w-5 h-5" style={{ color: activePalette.secondary }} />
                      </div>
                   </div>
                   <h4 className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: activePalette.secondary }}>Active Services</h4>
                   <p className="text-3xl font-black tracking-tight" style={{ color: activePalette.text }}>12 Jobs</p>
                </div>
             </div>

             <div className="mt-8 p-6 rounded-2xl border flex items-center justify-between" style={{ backgroundColor: activePalette.card, borderColor: activePalette.border }}>
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-full animate-pulse" style={{ backgroundColor: `${activePalette.accent}40` }} />
                   <div>
                      <p className="text-sm font-bold" style={{ color: activePalette.text }}>Technician logged in</p>
                      <p className="text-[10px] uppercase font-black tracking-widest" style={{ color: activePalette.secondary }}>Terminal B-04</p>
                   </div>
                </div>
                <ArrowRight className="w-5 h-5" style={{ color: activePalette.accent }} />
             </div>
          </div>
        </div>
      </motion.div>

      <p className="mt-8 text-slate-500 text-xs font-bold uppercase tracking-widest animate-bounce">
         Tap a palette above to preview
      </p>
    </div>
  );
}
