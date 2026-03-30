import { requireModule } from "@/components/utils/moduleGuard";

export async function executeCuratorAction({
  user,
  action,
  payload,
  applyHandler,
}) {
  requireModule(user, action.module);

  if (!applyHandler) {
    throw new Error("Missing apply handler");
  }

  const result = await applyHandler(payload);

  if (!result) {
    throw new Error("Action failed to return result");
  }

  return result;
}
