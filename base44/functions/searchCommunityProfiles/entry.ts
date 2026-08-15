// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { fetchAllEntitiesServer } from '../../shared/fetchAllEntitiesServer.ts';

const normEmail = (email: string) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (!authUser?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const searchQuery = String(body.query || '').trim().toLowerCase();
    const locationFilters = body.locationFilters || {};
    const cursor = Number(body.cursor || 0);
    const pageSize = Math.min(Number(body.pageSize || 50), 100);

    // Fetch the user's profile to get blocked users list
    const myProfiles = await base44.asServiceRole.entities.UserProfile.filter({
      user_email: normEmail(authUser.email),
    }).catch(() => []);

    const myProfile = myProfiles?.[0];
    const blocked = Array.isArray(myProfile?.blocked_users) ? myProfile.blocked_users : [];

    // Fetch ALL public profiles server-side using paginated fetch
    // This runs on the server, so the client only receives matching results
    // — not the entire public profile population.
    const allPublic = await fetchAllEntitiesServer(
      base44.asServiceRole.entities.UserProfile,
      { is_public: true },
      '-updated_date',
      5000,
      200,
      'searchCommunityProfiles'
    );

    // Filter out blocked users and the current user
    const myEmail = normEmail(authUser.email);
    let filtered = allPublic.filter((p: any) => {
      const email = normEmail(p.user_email || p.created_by);
      if (blocked.includes(email)) return false;
      if (email === myEmail) return false;
      return true;
    });

    // Apply text search filter (server-side, client only receives matches)
    if (searchQuery) {
      filtered = filtered.filter((p: any) => {
        const displayName = String(p.display_name || '').toLowerCase();
        const email = String(p.user_email || p.created_by || '').toLowerCase();
        const handle = String(p.handle || p.username || '').toLowerCase();
        return displayName.includes(searchQuery) ||
               email.includes(searchQuery) ||
               handle.includes(searchQuery);
      });
    }

    // Apply location filters
    if (locationFilters.country || locationFilters.city || locationFilters.state || locationFilters.zipCode) {
      filtered = filtered.filter((p: any) => {
        if (!p.show_location) return false;
        let matches = true;
        if (locationFilters.country) {
          matches = matches && String(p.country || '').toLowerCase().includes(String(locationFilters.country).toLowerCase());
        }
        if (locationFilters.city) {
          matches = matches && String(p.city || '').toLowerCase().includes(String(locationFilters.city).toLowerCase());
        }
        if (locationFilters.state) {
          matches = matches && String(p.state_province || '').toLowerCase().includes(String(locationFilters.state).toLowerCase());
        }
        if (locationFilters.zipCode) {
          matches = matches && String(p.postal_code || '').toLowerCase().includes(String(locationFilters.zipCode).toLowerCase());
        }
        return matches;
      });
    }

    // Paginate results
    const total = filtered.length;
    const pageResults = filtered.slice(cursor, cursor + pageSize);
    const nextCursor = cursor + pageSize < total ? cursor + pageSize : null;

    return Response.json({
      ok: true,
      results: pageResults,
      total,
      cursor: nextCursor,
      hasMore: nextCursor !== null,
    });
  } catch (error) {
    console.error('[searchCommunityProfiles] ERROR:', error);
    return Response.json({
      ok: false,
      error: error?.message || 'Failed to search community profiles',
    }, { status: 500 });
  }
});