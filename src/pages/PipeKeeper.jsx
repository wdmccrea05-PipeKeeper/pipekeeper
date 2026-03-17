import PipeKeeperModule from '@/components/modules/PipeKeeperModule';
import LockedModuleGuard from '@/components/modules/LockedModuleGuard';

export default function PipeKeeper() {
  return (
    <LockedModuleGuard moduleType="pipes">
      <PipeKeeperModule />
    </LockedModuleGuard>
  );
}