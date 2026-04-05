/**
 * AdminWhiskeyUnlock — backward-compatible shim.
 *
 * The generic AdminModuleUnlock component now handles all internal module
 * unlock behavior. This file is kept for import compatibility only.
 * Prefer importing AdminModuleUnlock directly for new code.
 */
import AdminModuleUnlock from './AdminModuleUnlock';

export default function AdminWhiskeyUnlock() {
  return <AdminModuleUnlock modules={['whiskeykeeper']} />;
}