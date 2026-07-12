import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export async function logAdminAction(params: {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeData?: Json;
  afterData?: Json;
}) {
  const admin = createAdminClient();
  await admin.from("audit_logs").insert({
    actor_id: params.actorId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    before_data: params.beforeData ?? null,
    after_data: params.afterData ?? null,
  });
}
