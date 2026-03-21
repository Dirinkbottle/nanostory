import React from 'react';
import { Select, SelectItem } from '@heroui/react';
import { Film } from 'lucide-react';

interface Script {
  id: number;
  episode_number: number;
  title: string;
  status: string;
}

interface EpisodeSelectorProps {
  scripts: Script[];
  currentEpisode: number;
  onSelect: (script: Script) => void;
}

const EpisodeSelector: React.FC<EpisodeSelectorProps> = ({
  scripts,
  currentEpisode,
  onSelect
}) => {
  if (scripts.length === 0) return null;

  const currentScript = scripts.find(s => s.episode_number === currentEpisode);
  const selectedKey = currentScript ? String(currentScript.id) : undefined;

  const handleSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = parseInt(e.target.value, 10);
    const script = scripts.find(s => s.id === selectedId);
    if (script) {
      onSelect(script);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Film className="w-4 h-4 text-[var(--text-muted)]" />
      <Select
        size="sm"
        aria-label="选择集数"
        selectedKeys={selectedKey ? [selectedKey] : []}
        onChange={handleSelectionChange}
        className="w-32"
        classNames={{
          trigger: "h-8 min-h-8 bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--accent)]/50",
          value: "text-sm text-[var(--text-primary)]"
        }}
      >
        {scripts.map((s) => (
          <SelectItem key={String(s.id)}>
            第{s.episode_number}集
          </SelectItem>
        ))}
      </Select>
    </div>
  );
};

export default EpisodeSelector;
