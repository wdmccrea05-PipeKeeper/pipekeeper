import WhiskeyKeeperModule from '@/components/modules/WhiskeyKeeperModule';
import LockedModuleGuard from '@/components/modules/LockedModuleGuard';

export default function WhiskeyKeeper() {
  return (
    <LockedModuleGuard moduleKey="whiskeykeeper">
      <WhiskeyKeeperModule />
    </LockedModuleGuard>
  );
}