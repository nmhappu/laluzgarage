import React from 'react';
import { Settings as SettingsIcon, Shield, Bell, Database, HardDrive, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';

export function Settings() {
  const sections = [
    { title: 'Security', icon: Shield, description: 'Manage authentication and workshop access permissions.' },
    { title: 'Notifications', icon: Bell, description: 'Configure alerts for delivery deadlines and low stock.' },
    { title: 'Database', icon: Database, description: 'Manage Firestore connections and data exports.' },
    { title: 'Inventory Config', icon: HardDrive, description: 'Set categorization rules and unit preferences.' },
    { title: 'Device Info', icon: Smartphone, description: 'App version, build info, and local sync status.' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-workshop-accent/10 rounded-xl flex items-center justify-center border border-workshop-accent/20 shadow-sm">
          <SettingsIcon className="w-6 h-6 text-workshop-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-workshop-text tracking-tight uppercase">Workshop Settings</h1>
          <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest mt-1">Configure system behavior and data rules</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-6 bg-workshop-card rounded-xl border border-workshop-border hover:border-workshop-accent/30 transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-workshop-surface rounded-lg text-workshop-muted group-hover:text-workshop-accent transition-colors">
                <section.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-workshop-text uppercase tracking-tight mb-1 group-hover:text-workshop-accent transition-colors">
                  {section.title}
                </h3>
                <p className="text-[10px] font-bold text-workshop-muted leading-relaxed uppercase tracking-wider opacity-60">
                  {section.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 p-8 border-2 border-dashed border-workshop-border rounded-2xl text-center">
        <p className="text-workshop-muted text-xs font-bold uppercase tracking-[0.2em] mb-2 px-4 py-1 bg-workshop-card inline-block">System Configuration v1.0.4</p>
        <p className="text-[10px] text-workshop-muted opacity-40 uppercase tracking-widest">More settings are being added to accommodate workshop scaling.</p>
      </div>
    </div>
  );
}
